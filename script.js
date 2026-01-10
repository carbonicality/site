const width = window.innerWidth;
const height = window.innerHeight;
const svg = d3.select('.topo-bg').attr('viewBox', `0 0 ${width} ${height}`);

//simplex noise, had some help from AI to make this
class SimplexNoise {
    constructor(seed = Math.random()) {
        this.p = new Uint8Array(256);
        for (let i = 0; i < 256; i++) this.p[i] = i;
        for (let i = 255; i > 0; i--) {
            seed = (seed * 16807) % 2147483647; // idk what these numbers are i asked ai for help here
            const j = Math.floor((seed / 2147483647) * (i + 1));
            [this.p[i], this.p[j]] = [this.p[j], this.p[i]];
        }
        this.perm = new Uint8Array(512);
        this.permMod12 = new Uint8Array(512);
        for (let i = 0; i < 512; i++) {
            this.perm[i] = this.p[i & 255];
            this.permMod12[i] = this.perm[i] % 12;
        }
    }
    noise2D(xin, yin) {
        const F2 = 0.5 * (Math.sqrt(3.0) - 1.0)
        const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
        const s = (xin + yin) * F2;
        const i = Math.floor(xin + s);
        const j = Math.floor(yin + s);
        const t = (i + j) * G2;
        const X0 = i - t;
        const Y0 = j - t;
        const x0 = xin - X0;
        const y0 = yin - Y0;
        const i1 = x0 > y0 ? 1 : 0;
        const j1 = x0 > y0 ? 0 : 1;
        const x1 = x0 - i1 + G2;
        const y1 = y0 - j1 + G2;
        const x2 = x0 - 1.0 + 2.0 * G2;
        const y2 = y0 - 1.0 + 2.0 * G2;
        const ii = i & 255;
        const jj = j & 255;
        const gi0 = this.permMod12[ii + this.perm[jj]];
        const gi1 = this.permMod12[ii + i1 + this.perm[jj + j1]];
        const gi2 = this.permMod12[ii + 1 + this.perm[jj + 1]];
        const grad3 = [ //got ai to generate this
            [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
            [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
            [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
        ];
        const dot = (g, x, y) => g[0] * x + g[1] * y;
        let n0 = 0, n1 = 0, n2 = 0;
        let t0 = 0.5 - x0 * x0 - y0 * y0;
        if (t0 >= 0) {
            t0 *= t0;
            n0 = t0 * t0 * dot(grad3[gi0], x0, y0);
        }
        let t1 = 0.5 - x1 * x1 - y1 * y1;
        if (t1 >= 0) {
            t1 *= t1;
            n1 = t1 * t1 * dot(grad3[gi1], x1, y1);
        }
        let t2 = 0.5 - x2 * x2 - y2 * y2;
        if (t2 >= 0) {
            t2 *= t2;
            n2 = t2 * t2 * dot(grad3[gi2], x2, y2);
        }
        return 70.0 * (n0 + n1 + n2);
    }
}

const simplex = new SimplexNoise(Date.now()); //shrimplex when
const n = 120;
const m = Math.floor(n * height / width);
const vals = new Array(n * m);
for (let j = 0, k = 0; j < m; ++j) {
    for (let i = 0; i < n; ++i, ++k) {
        const x = i / n;
        const y = j / m;

        let val = 0;
        val += simplex.noise2D(x * 3, y * 3) * 1.0;
        val += simplex.noise2D(x * 6, y * 6) * 0.5;
        val += simplex.noise2D(x * 12, y * 12) * 0.25;
        val += simplex.noise2D(x * 24, y * 24) * 0.125;
        val += Math.sin(x * 2 + y * 1.5) * 0.3;
        vals[k] = val * 80;
    }
}

const contours = d3.contours().size([n, m]).thresholds(12);
const path = d3.geoPath().projection(d3.geoIdentity().scale(width / n));
svg.selectAll('path')
    .data(contours(vals))
    .join('path')
    .attr('d', path)
    .attr('opacity', (d, i) => 0.3 + (i / 12) * 0.5)
    .attr('stroke-width', (d, i) => 1 + (i / 12) * 0.8)

window.addEventListener('resize', () => {
    const newWidth = window.innerWidth;
    const newHeight = window.innerHeight;
    d3.select('.topo-bg').attr('viewBox', `0 0 ${newWidth} ${newHeight}`);
});

async function fetchCommit() {
    try {
        const res = await fetch('https://api.github.com/repos/carbonicality/site/commits/main');
        const data = await res.json();
        const hash = data.sha.substring(0, 7);
        document.querySelector('.cinfo').innerHTML = `<i data-lucide="github"></i>commit&nbsp;<span class="hash">${hash}</span>`;
        lucide.createIcons();
    } catch (err) {
        console.error('failed to fetch commit :(', err);
        document.querySelector('.cinfo').textContent = 'commit unavailable';
    }
}

//nav stuff
const pathtainer = document.querySelector('.pathtainer');
const navLinks = document.querySelectorAll('.nav-link');

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.textContent.trim().replace(/\[|\]/g, '').trim();
        switchContent(page);
        const hasExtra = pathtainer.children.length > 4;
        if (page === 'home' && hasExtra) {
            const exSlash = pathtainer.children[4];
            const exPage = pathtainer.children[5];
            exSlash.classList.remove('nav-in');
            exPage.classList.remove('nav-in');
            exSlash.classList.add('nav-out');
            exPage.classList.add('nav-out');
            setTimeout(() => {
                pathtainer.innerHTML = '<span class="slash">/</span><span class="home">home</span><span class="slash">/</span><span class="carbon">carbon</span>';
            }, 300);
        } else if (page !== 'home') {
            if (hasExtra) {
                const exSlash = pathtainer.children[4];
                const exPage = pathtainer.children[5];
                exSlash.classList.remove('nav-in');
                exPage.classList.remove('nav-in');
                exSlash.classList.add('nav-out');
                exPage.classList.add('nav-out');
                setTimeout(() => {
                    pathtainer.innerHTML = '<span class="slash">/</span><span class="home">home</span><span class="slash">/</span><span class="carbon">carbon</span>';
                    const nSlash = document.createElement('span');
                    nSlash.className = 'slash nav-in';
                    nSlash.textContent = '/';
                    const nPage = document.createElement('span');
                    nPage.className = 'carbon nav-in';
                    nPage.textContent = page;
                    pathtainer.appendChild(nSlash);
                    pathtainer.appendChild(nPage);
                }, 300);
            } else {
                const nSlash = document.createElement('span');
                nSlash.className = 'slash nav-in';
                nSlash.textContent = '/';
                const nPage = document.createElement('span');
                nPage.className = 'carbon nav-in';
                nPage.textContent = page;
                pathtainer.appendChild(nSlash);
                pathtainer.appendChild(nPage);
            }
        } else {
            pathtainer.innerHTML = '<span class="slash">/</span><span class="home">home</span><span class="slash">/</span><span class="carbon">carbon</span>';
        }
    });
});

//page changing logic
const contentCont = document.querySelector('.content');
let musicInt = null;
// this may be inefficient but i dont know any better ways, so here we go
const pageCont = {
    home: `
        <h1 class="title">hi, i'm carbon</h1>
        <p class="desc">hi! i'm <strong>carbon</strong>. i am a student from the UK who's interested in technology and web design.<br><br>thanks for visiting my site!</p>
        <div class="langs">
            <span class="lang-tag">HTML</span>
            <span class="lang-tag">CSS</span>
            <span class="lang-tag">JS</span>
            <span class="lang-tag">Shell</span>
            <span class="lang-tag">Python</span>
            <span class="lang-tag">VB.NET</span>
        </div>
        <div class="music-plr">
            <div class="album">
                <i class="np-icon" data-lucide="music"></i>
            </div>
            <div class="track-details">
                <div class="track-info">
                    <div class="track-nm">N/A</div>
                    <div class="artist-nm">not playing</div>
                </div>
                <div class="plr-controls">
                    <button class="play-btn">
                        <i data-lucide="play" width="16" height="16"></i>
                    </button>
                    <div class="progcont">
                        <div class="progbar">
                            <div class="progfill"></div>
                        </div>
                        <div class="time-info">
                            <span class="currtime">0:00</span>
                            <span class="total-time">0:00</span>
                        </div>
                    </div>
                </div>
                <div class="vis">
                    <div class="bar"></div>
                    <div class="bar"></div>
                    <div class="bar"></div>
                    <div class="bar"></div>
                    <div class="bar"></div>
                    <div class="bar"></div>
                    <div class="bar"></div>
                    <div class="bar"></div>
                    <div class="bar"></div>
                    <div class="bar"></div>
                    <div class="bar"></div>
                    <div class="bar"></div>
                    <div class="bar"></div>
                    <div class="bar"></div>
                    <div class="bar"></div>
                    <div class="bar"></div>
                </div>
            </div>
        </div>`,
    about: `
        <h1 class="title">about</h1>
        <h6 class="subtitle">about me</h6>
        <p class="desc">
            hi! i'm <strong>carbon</strong>.<br><br>
            i'm from the UK, and i'm a student, particularly interested in computer science and mathematics.<br>
            i'm also a part of <strong>crosbreaker</strong>, a development group centered around chromeOS.<br><br>
            i'm also interested in webdev!
            learning new things and applying them is my passion.
            <br><br>
            other things i like outside of programming:<br>
            <ul class="list">
                <li>music, particularly Radiohead, Tame Impala, Weezer and Linkin Park</li>
                <li>maths and the sciences</li>
                <li>hardware projects</li>
            </ul>
            <div class="btns-sec">
                <div class="btns-tl">my button:</div>
                <div class="carbtn">
                    <img src="https://raw.githubusercontent.com/carbonicality/site/refs/heads/main/images/carbonbtn.png" onclick="copyBtnCode()" style="cursor:pointer;" alt="carbon" title="carbon"/>
                    <span class="btn-txt">click the button to copy code!</span>
                </div>
            </div>
            <div class="btns-sec">
                <div class="btns-tl">cool sites:</div>
                    <div class="btns-gd">
                        <!-- a lot of the images here are from bomberfish, thanks! (check out his website at https://bomberfish.ca)-->
                        <a href="https://bomberfish.ca"><img src="https://bomberfish.ca/button.gif" alt="BomberFish" title="BomberFish" /></a>
                        <a href="https://anybrowser.org/campaign"><img src="https://anybrowser.org/campaign/bvgraphics/4noone.gif"></a>
                        <a href="https://validator.w3.org"><img src="https://anybrowser.org/campaign/images/valid-xhtml10.png"></a>
                        <a href="https://opencontent.org"><img src="https://anybrowser.org/campaign/images/button_takeone.gif"></a>
                        <a href="https://anybrowser.org/campaign/"><img src="https://anybrowser.org/campaign/images/button_enhanced.gif"></a>
                        <a href="https://github.com"><img src="https://bomberfish.ca/buttons/github.gif"></a>
                        <a href="https://www.java.com/en"><img src="https://bomberfish.ca/buttons/javanow.gif"></a>
                        <a href="https://thinliquid.dev"><img src="https://thinliquid.dev/buttons/btn.gif"></a>
                        <a href="https://login.corp.google.com"><img src="https://bomberfish.ca/buttons/balls.gif"></a>
                        <a href="https://newgrounds.com"><img src="https://bomberfish.ca/buttons/newgrounds.gif"></a>
                        <a href="https://melankorin.net/"><img src="https://melankorin.net/assets/img/buttons/button-1.gif" alt=""></a>
                        <a href="https://omada.cafe/"><img src="https://omada.cafe/omada.gif" alt="website button for omada.cafe, a private and secure alternative provider."></a> 
                        <a href="https://hackclub.com"><img src="https://bomberfish.ca/buttons/hackclub.gif">
                        <iframe src="https://incr.easrng.net/badge?key=carbon" style="background: url(https://incr.easrng.net/bg.gif)" title="increment badge" width="88" height="31" frameborder="0"></iframe>
                        <img src="https://bomberfish.ca/buttons/nodrugs.gif">
                        <img src="https://bomberfish.ca/buttons/affection.gif">
                    </div>
                </div>
            </div>
        </p>
        `,
    projects: `
        <h1 class="title">projects</h1>
        <h6 class="subtitle">things i've worked on</h6>
        <div class="pgrid">
            <div class="pcard">
                <div class="pimg">
                    <img src="./images/site-bnr.png" alt="site banner">
                </div>
                <div class="pcontent">
                    <div class="pheader">
                        <div class="pname">site</div>
                        <div class="plangs">
                            <span class="plang-tag">HTML</span>
                            <span class="plang-tag">CSS</span>
                            <span class="plang-tag">JS</span>
                        </div>
                    </div>
                    <div class="pdesc">a cool portfolio site! (you're on it right now)</div>
                    <a href="https://github.com/carbonicality/site" class="vs-btn" target="_blank">view source <i data-lucide="arrow-right"></i></a>
                </div>
            </div>
        </div>`,
    writeups: `
        <h1 class="title">writeups</h1>
        <h6 class="subtitle">writeups for things i've found</h6>
        <p class="desc">nothing here yet...</p>`,
    contact: `
        <h1 class="title">contact</h1>
        <h6 class="subtitle">get in touch</h6>
        <p class="desc">feel free to reach out through any of these platforms!</p>
        <div class="cgrid">
            <div class="citem">
                <span class="ctooltip">enphosoman</span>
                <i data-lucide="message-circle"></i>
                <span class="clabel">Discord</span>
            </div>
            <div class="citem">
                <span class="ctooltip">carbonicality</span>
                <i data-lucide="github"></i>
                <span class="clabel">GitHub</span>
            </div>
            <div class="citem">
                <span class="ctooltip">carbonicality@proton.me</span>
                <i data-lucide="mail"></i>
                <span class="clabel">Email</span>
            </div>
            <a href="https://keys.openpgp.org/vks/v1/by-fingerprint/585982C405B03F6F070EFB9EEA3A559F23ECBB09" target="_blank" class="citem" style="text-decoration: none;">
                <i data-lucide="key"></i>
                <span class="clabel">PGP key</span>
                <span class="ctooltip">585982C405B03F6F070EFB9EEA3A559F23ECBB09</span>
            </a>
        </div>`
};

function copyBtnCode() {
    const code = '<a href="#"><img src="https://raw.githubusercontent.com/carbonicality/site/refs/heads/main/images/carbonbtn.png" alt="carbon"></a>';
    navigator.clipboard.writeText(code).then(()=>{
        const btnTxt = document.querySelector('.btn-txt');
        if (btnTxt) {
            const ogTxt = btnTxt.textContent;
            btnTxt.textContent = 'copied!';
            setTimeout(() => {
                btnTxt.textContent = ogTxt;
            },2000);
        }
    }).catch(err => {
        console.error('failed to copy :(',err);
    });
}

function switchContent(page) {
    contentCont.classList.add('fade-out');
    setTimeout(() => {
        contentCont.innerHTML = pageCont[page];
        contentCont.classList.remove('fade-out');
        setTimeout(() => {
            lucide.createIcons();
        },10);
        if (page === 'home') {
            if (musicInt) {
                clearInterval(musicInt);
            }
            const bars = document.querySelectorAll('.vis .bar');
            musicInt = setInterval(() => {
                bars.forEach(bar => {
                    const randHeight = Math.random() * 20 + 4;
                    bar.style.height = randHeight + 'px';
                });
            }, 150);
        } else {
            if (musicInt) {
                clearInterval(musicInt);
            }
        }
    }, 300);
}

const bars = document.querySelectorAll('.vis .bar');
musicInt = setInterval(() => {
    bars.forEach(bar => {
        const randHeight = Math.random() * 20 + 4;
        bar.style.height = randHeight + 'px';
    });
}, 150);

lucide.createIcons();
fetchCommit();
const width=window.innerWidth;
const height=window.innerHeight;
const svg = d3.select('.topo-bg').attr('viewBox',`0 0 ${width} ${height}`);

//simplex noise, had some help from AI to make this
class SimplexNoise {
    constructor(seed = Math.random()) {
        this.p = new Uint8Array(256);
        for (let i = 0; i <256;i++) this.p[i]=i;
        for (let i=255;i>0;i--) {
            seed=(seed*16807) % 2147483647; // idk what these numbers are i asked ai for help here
            const j = Math.floor((seed/2147483647)*(i+1));
            [this.p[i], this.p[j]] = [this.p[j], this.p[i]];
        }
        this.perm=new Uint8Array(512);
        this.permMod12 = new Uint8Array(512);
        for (let i =0; i< 512;i++) {
            this.perm[i] = this.p[i & 255];
            this.permMod12[i]=this.perm[i]%12;
        }
    }
    noise2D(xin,yin) {
        const F2 = 0.5 * (Math.sqrt(3.0) - 1.0)
        const G2 = (3.0-Math.sqrt(3.0)) / 6.0;
        const s = (xin + yin) * F2;
        const i = Math.floor(xin+s);
        const j = Math.floor(yin+s);
        const t = (i+j)*G2;
        const X0 = i-t;
        const Y0 = j-t;
        const x0 = xin-X0;
        const y0 = yin-Y0;
        const i1 = x0 > y0 ? 1:0;
        const j1 = x0 > y0 ? 0:1;
        const x1 = x0-i1+G2;
        const y1 = y0-j1+G2;
        const x2=x0-1.0+2.0*G2;
        const y2 = y0-1.0+2.0*G2;
        const ii=i&255;
        const jj=j&255;
        const gi0 = this.permMod12[ii+this.perm[jj]];
        const gi1 = this.permMod12[ii+i1+this.perm[jj+j1]];
        const gi2 = this.permMod12[ii+1+this.perm[jj + 1]];
        const grad3 = [ //got ai to generate this
            [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
            [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
            [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
        ];
        const dot = (g,x,y) => g[0] * x+g[1] * y;
        let n0 = 0,n1=0,n2=0;
        let t0 = 0.5-x0*x0-y0*y0;
        if (t0 >= 0) {
            t0 *= t0;
            n0 = t0 * t0 * dot(grad3[gi0],x0,y0);
        }
        let t1=0.5 - x1*x1-y1*y1;
        if (t1 >= 0) {
            t1 *= t1;
            n1 = t1 * t1 * dot(grad3[gi1],x1,y1);
        }
        let t2=0.5-x2*x2-y2*y2;
        if (t2 >= 0) {
            t2 *= t2;
            n2 = t2*t2*dot(grad3[gi2],x2,y2);
        }
        return 70.0 * (n0+n1 + n2);
    }
}

const simplex= new SimplexNoise(Date.now()); //shrimplex when
const n = 120;
const m = Math.floor(n*height/width);
const vals = new Array(n*m);
for (let j=0,k=0;j<m;++j) {
    for (let i = 0; i <n; ++i, ++k) {
        const x = i/n;
        const y = j/m;

        let val = 0;
        val += simplex.noise2D(x*3,y*3)*1.0;
        val += simplex.noise2D(x*6,y*6)* 0.5;
        val += simplex.noise2D(x*12,y*12) * 0.25;
        val += simplex.noise2D(x*24,y*24) * 0.125;
        val += Math.sin(x*2 + y*1.5) * 0.3;
        vals[k]=val*80;
    }
}

const contours = d3.contours().size([n, m]).thresholds(12);
const path = d3.geoPath().projection(d3.geoIdentity().scale(width/n));
svg.selectAll('path')
    .data(contours(vals))
    .join('path')
    .attr('d', path)
    .attr('opacity',(d,i) => 0.3 + (i/12)*0.5)
    .attr('stroke-width',(d,i) => 1 + (i/12) * 0.8)

window.addEventListener('resize',()=>{
    const newWidth = window.innerWidth;
    const newHeight = window.innerHeight;
    d3.select('.topo-bg').attr('viewBox',`0 0 ${newWidth} ${newHeight}`);
});

async function fetchCommit() {
    try {
        const res = await fetch('https://api.github.com/repos/carbonicality/site/commits/main');
        const data = await res.json();
        const hash = data.sha.substring(0,7);
        document.querySelector('.cinfo').innerHTML = `<i data-lucide="github"></i>commit&nbsp;<span class="hash">${hash}</span>`;
        lucide.createIcons();
    } catch (err) {
        console.error('failed to fetch commit :(', err);
        document.querySelector('.cinfo').textContent = 'commit unavailable';
    }
}

const bars = document.querySelectorAll('.vis .bar');
setInterval(() => {
    bars.forEach(bar => {
        const randHeight = Math.random()*20 + 4;
        bar.style.height = randHeight+'px';
    });
},150);

//nav stuff
const pathtainer = document.querySelector('.pathtainer');
const navLinks = document.querySelectorAll('.nav-link');

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.textContent.trim().replace(/\[|\]/g,'').trim();
        const hasExtra = pathtainer.children.length > 4;
        if (page === 'home' && hasExtra) {
            const exSlash = pathtainer.children[4];
            const exPage = pathtainer.children[5];
            exSlash.classList.remove('nav-in');
            exPage.classList.remove('nav-in');
            exSlash.classList.add('nav-out');
            exPage.classList.add('nav-out');
            setTimeout(() =>{
                pathtainer.innerHTML = '<span class="slash">/</span><span class="home">home</span><span class="slash">/</span><span class="carbon">carbon</span>';
            },300);
        } else if (page !=='home') {
            if (hasExtra) {
                const exSlash = pathtainer.children[4];
                const exPage = pathtainer.children[5];
                exSlash.classList.remove('nav-in');
                exPage.classList.add('nav-in');
                exSlash.classList.add('nav-out');
                exPage.classList.add('nav-out');
                setTimeout(() => {
                    pathtainer.innerHTML = '<span class="slash">/</span><span class="home">home</span><span class="slash">/</span><span class="carbon">carbon</span>';
                    const nSlash = document.createElement('span');
                    nSlash.className = 'slash nav-in';
                    nSlash.textContent = '/';
                    const nPage = document.createElement('span');
                    nPage.className='carbon nav-in';
                    nPage.textContent = page;
                    pathtainer.appendChild(nSlash);
                    pathtainer.appendChild(nPage);
                },300);
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

lucide.createIcons();
fetchCommit();
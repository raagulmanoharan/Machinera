// Perceptual dye-lot clustering and integer yarn allocation. No image coordinates.
const linear=v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;};
export function oklab(rgb){const[r,g,b]=rgb.map(linear),l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);return[.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s];}
const distance=(a,b)=>.35*(a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2;
function similar(a,b){const ca=Math.hypot(a[1],a[2]),cb=Math.hypot(b[1],b[2]),dl=Math.abs(a[0]-b[0]);if(ca<.045&&cb<.045)return dl<.20;if(distance(a,b)<.003)return true;const angle=Math.acos(Math.max(-1,Math.min(1,(a[1]*b[1]+a[2]*b[2])/(ca*cb||1))));return ca>.035&&cb>.035&&angle<Math.PI/10&&dl<.40&&Math.abs(ca-cb)<.15;}
export function mergeDyeColours(samples,{maxColours=12,minShare=.015}={}){
 const total=samples.reduce((n,s)=>n+s.weight,0);if(!total)return[{rgb:[180,170,150],weight:1,share:1}];
 const sorted=samples.filter(s=>s.weight>0).map(s=>({...s,lab:oklab(s.rgb)})).sort((a,b)=>b.weight-a.weight||a.rgb[0]-b.rgb[0]||a.rgb[1]-b.rgb[1]||a.rgb[2]-b.rgb[2]);let groups=[];
 const combine=(a,b)=>{const w=a.weight+b.weight;a.rgb=a.rgb.map((v,i)=>(v*a.weight+b.rgb[i]*b.weight)/w);a.weight=w;a.lab=oklab(a.rgb);};
 for(const s of sorted){let match=null,best=Infinity;for(const g of groups){const d=distance(g.lab,s.lab);if(d<best&&similar(g.lab,s.lab)){match=g;best=d;}}if(match)combine(match,s);else groups.push({...s,rgb:s.rgb.slice()});}
 // Merge residual near-duplicates after centroids move. No pixel weight is lost.
 for(let i=groups.length-1;i>=0;i--)for(let j=0;j<i;j++)if(similar(groups[i].lab,groups[j].lab)){combine(groups[j],groups[i]);groups.splice(i,1);break;}
 groups.sort((a,b)=>b.weight-a.weight);const keep=groups.filter((g,i)=>i===0||g.weight/total>=minShare).slice(0,maxColours),rest=groups.filter(g=>!keep.includes(g));
 for(const g of rest){let nearest=keep[0];for(const k of keep)if(distance(k.lab,g.lab)<distance(nearest.lab,g.lab))nearest=k;combine(nearest,g);}
 return keep.sort((a,b)=>b.weight-a.weight).map(g=>({rgb:g.rgb.map(Math.round),weight:g.weight,share:g.weight/total}));
}
export function allocateYarns(palette,count){const exact=palette.map(c=>c.share*count),counts=exact.map(Math.floor),order=exact.map((v,i)=>({i,remainder:v-counts[i]})).sort((a,b)=>b.remainder-a.remainder||a.i-b.i);const left=count-counts.reduce((a,b)=>a+b,0);for(let n=0;n<left;n++)counts[order[n%order.length].i]++;return counts;}
export function yarnSequence(palette,count,{cycles=1,reverse=false}={}){const counts=allocateYarns(palette,count),sequence=[],remaining=counts.slice();for(let cycle=0;cycle<cycles;cycle++){const order=palette.map((_,i)=>i);if(reverse)order.reverse();if(cycle%2)order.reverse();for(const i of order){const n=cycle===cycles-1?remaining[i]:Math.round(remaining[i]/(cycles-cycle));for(let k=0;k<n;k++)sequence.push(i);remaining[i]-=n;}}return{counts,sequence};}
export function paletteFromStrands(strands){const map=new Map();for(const rgb of strands){const key=rgb.join(',');const s=map.get(key);if(s)s.weight++;else map.set(key,{rgb:rgb.slice(),weight:1});}return mergeDyeColours([...map.values()]);}

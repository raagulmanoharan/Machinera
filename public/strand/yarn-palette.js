// Perceptual dye-lot clustering and integer yarn allocation. No image coordinates.
const linear=v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;};
export function oklab(rgb){const[r,g,b]=rgb.map(linear),l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);return[.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s];}
// A continuous chroma scale keeps muted colours distinguishable without hue buckets.
const coordinates=lab=>{const scale=1+.4/(.025+Math.hypot(lab[1],lab[2]));return[lab[0],lab[1]*scale,lab[2]*scale];};
const distance=(a,b)=>{a=coordinates(a);b=coordinates(b);return .15*(a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2;};
const similar=(a,b)=>distance(a,b)<.003;

export const areDyeColoursDistinct=(a,b)=>!similar(oklab(a),oklab(b));
export function mergeDyeColours(samples,{maxColours=5}={}){
 const total=samples.reduce((n,s)=>n+s.weight,0);if(!total)throw new Error('No opaque pixel colours in this image');
 const sorted=samples.filter(s=>s.weight>0).map(s=>({...s,lab:oklab(s.rgb)})).sort((a,b)=>b.weight-a.weight||a.rgb[0]-b.rgb[0]||a.rgb[1]-b.rgb[1]||a.rgb[2]-b.rgb[2]);let groups=[];
 const combine=(a,b)=>{const w=a.weight+b.weight;a.rgb=a.rgb.map((v,i)=>(v*a.weight+b.rgb[i]*b.weight)/w);a.weight=w;a.lab=oklab(a.rgb);};
 for(const s of sorted){let match=null,best=Infinity;for(const g of groups){const d=distance(g.lab,s.lab);if(d<best&&similar(g.lab,s.lab)){match=g;best=d;}}if(match)combine(match,s);else groups.push({...s,rgb:s.rgb.slice()});}
 // Merge residual near-duplicates after centroids move. No pixel weight is lost.
 for(let i=groups.length-1;i>=0;i--)for(let j=0;j<i;j++)if(similar(groups[i].lab,groups[j].lab)){combine(groups[j],groups[i]);groups.splice(i,1);break;}
 groups.sort((a,b)=>b.weight-a.weight);
 // Choose perceptually separated representatives, then assign every remaining lot.
 // Keep each selected dye fixed so reassignment cannot muddy its colour.
 const keep=[groups[0]];
 while(keep.length<maxColours){let best=null,score=-1;for(const g of groups){if(keep.includes(g)||g.weight/total<.0025)continue;const separation=Math.min(...keep.map(k=>distance(g.lab,k.lab))),candidate=g.weight**.25*separation;if(candidate>score){score=candidate;best=g;}}if(!best)break;keep.push(best);}
 for(const g of groups.filter(g=>!keep.includes(g))){let nearest=keep[0];for(const k of keep)if(distance(k.lab,g.lab)<distance(nearest.lab,g.lab))nearest=k;nearest.weight+=g.weight;}
 // Folding minor lots can move centroids back together. Validate the actual
 // rounded yarn dyes, restarting after every merge until every pair is distinct.
 let merged=true;while(merged){merged=false;outer:for(let i=0;i<keep.length;i++)for(let j=i+1;j<keep.length;j++){
  if(!areDyeColoursDistinct(keep[i].rgb.map(Math.round),keep[j].rgb.map(Math.round))){combine(keep[i],keep[j]);keep.splice(j,1);merged=true;break outer;}
 }}
 return keep.sort((a,b)=>b.weight-a.weight).map(g=>({rgb:g.rgb.map(Math.round),weight:g.weight,share:g.weight/total}));
}
export function allocateYarns(palette,count){const exact=palette.map(c=>c.share*count),counts=exact.map(Math.floor),order=exact.map((v,i)=>({i,remainder:v-counts[i]})).sort((a,b)=>b.remainder-a.remainder||a.i-b.i);const left=count-counts.reduce((a,b)=>a+b,0);for(let n=0;n<left;n++)counts[order[n%order.length].i]++;return counts;}
export function paletteFromColours(colours){const map=new Map();for(const rgb of colours){const key=rgb.join(',');const s=map.get(key);if(s)s.weight++;else map.set(key,{rgb:rgb.slice(),weight:1});}return mergeDyeColours([...map.values()]);}

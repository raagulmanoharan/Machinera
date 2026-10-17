// Perceptual dye-lot clustering and integer yarn allocation. No image coordinates.
const linear=v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;};
export function oklab(rgb){const[r,g,b]=rgb.map(linear),l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);return[.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s];}
const distance=(a,b)=>.35*(a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2;
function similar(a,b){
 const ca=Math.hypot(a[1],a[2]),cb=Math.hypot(b[1],b[2]),dl=Math.abs(a[0]-b[0]);
 // Muted navy is still blue. A broad "neutral" bucket must not merge it
 // into warm upholstery, skin or grey just because both have low chroma.
 if(ca<.008&&cb<.008)return dl<.16;
 if(Math.max(ca,cb)>=.008&&Math.min(ca,cb)<.008)return false;
 const angle=Math.acos(Math.max(-1,Math.min(1,(a[1]*b[1]+a[2]*b[2])/(ca*cb||1))));
 if(ca>=.008&&cb>=.008&&angle>Math.PI/6)return false;
 if(distance(a,b)<.003)return true;
 return ca>.008&&cb>.008&&angle<Math.PI/18&&dl<.16&&Math.abs(ca-cb)<.06;
}

export const areDyeColoursDistinct=(a,b)=>!similar(oklab(a),oklab(b));
export function mergeDyeColours(samples,{maxColours=5}={}){
 const total=samples.reduce((n,s)=>n+s.weight,0);if(!total)throw new Error('No opaque pixel colours in this image');
 const sorted=samples.filter(s=>s.weight>0).map(s=>({...s,lab:oklab(s.rgb)})).sort((a,b)=>b.weight-a.weight||a.rgb[0]-b.rgb[0]||a.rgb[1]-b.rgb[1]||a.rgb[2]-b.rgb[2]);let groups=[];
 const combine=(a,b)=>{const w=a.weight+b.weight;a.rgb=a.rgb.map((v,i)=>(v*a.weight+b.rgb[i]*b.weight)/w);a.weight=w;a.lab=oklab(a.rgb);};
 for(const s of sorted){let match=null,best=Infinity;for(const g of groups){const d=distance(g.lab,s.lab);if(d<best&&similar(g.lab,s.lab)){match=g;best=d;}}if(match)combine(match,s);else groups.push({...s,rgb:s.rgb.slice()});}
 // Merge residual near-duplicates after centroids move. No pixel weight is lost.
 for(let i=groups.length-1;i>=0;i--)for(let j=0;j<i;j++)if(similar(groups[i].lab,groups[j].lab)){combine(groups[j],groups[i]);groups.splice(i,1);break;}
 groups.sort((a,b)=>b.weight-a.weight);
 // Reserve representatives of distinct hues before filling spare slots with
 // light/dark variations. Otherwise several upholstery browns can crowd out
 // a substantial muted-blue subject, even after hue-safe clustering.
 const bucket=g=>{const chroma=Math.hypot(g.lab[1],g.lab[2]);if(chroma<.02)return-1;const angle=(Math.atan2(g.lab[2],g.lab[1])*180/Math.PI+360)%360;if(angle<135&&g.lab[2]>0&&chroma<.08)return 1;return angle<45||angle>=345?0:angle<135?1:angle<225?2:angle<315?3:4;};
 const families=new Map();for(const g of groups){if(g.weight/total<.0025)continue;const hue=bucket(g),current=families.get(hue);const importance=sample=>sample.weight*(hue===-1?1:Math.max(.008,Math.hypot(sample.lab[1],sample.lab[2]))**2);if(!current||importance(g)>importance(current))families.set(hue,g);}
 const keep=[groups[0]];for(const g of [...families.values()].sort((a,b)=>b.weight-a.weight))if(keep.length<maxColours&&!keep.includes(g))keep.push(g);
 while(keep.length<maxColours){let best=null,score=-1;for(const g of groups){if(keep.includes(g)||g.weight/total<.0025)continue;const separation=Math.min(...keep.map(k=>distance(g.lab,k.lab))),candidate=g.weight*separation;if(candidate>score){score=candidate;best=g;}}if(!best)break;keep.push(best);}
 const rest=groups.filter(g=>!keep.includes(g));
 const keepHues=new Map(keep.map(g=>[g,bucket(g)]));
 for(const g of rest){const matching=keep.filter(k=>keepHues.get(k)===bucket(g)),candidates=matching.length?matching:keep;let nearest=candidates[0];for(const k of candidates)if(distance(k.lab,g.lab)<distance(nearest.lab,g.lab))nearest=k;combine(nearest,g);}
 // Folding minor lots can move centroids back together. Validate the actual
 // rounded yarn dyes, restarting after every merge until every pair is distinct.
 let merged=true;while(merged){merged=false;outer:for(let i=0;i<keep.length;i++)for(let j=i+1;j<keep.length;j++){
  if(!areDyeColoursDistinct(keep[i].rgb.map(Math.round),keep[j].rgb.map(Math.round))){combine(keep[i],keep[j]);keep.splice(j,1);merged=true;break outer;}
 }}
 return keep.sort((a,b)=>b.weight-a.weight).map(g=>({rgb:g.rgb.map(Math.round),weight:g.weight,share:g.weight/total}));
}
export function allocateYarns(palette,count){const exact=palette.map(c=>c.share*count),counts=exact.map(Math.floor),order=exact.map((v,i)=>({i,remainder:v-counts[i]})).sort((a,b)=>b.remainder-a.remainder||a.i-b.i);const left=count-counts.reduce((a,b)=>a+b,0);for(let n=0;n<left;n++)counts[order[n%order.length].i]++;return counts;}
export function paletteFromColours(colours){const map=new Map();for(const rgb of colours){const key=rgb.join(',');const s=map.get(key);if(s)s.weight++;else map.set(key,{rgb:rgb.slice(),weight:1});}return mergeDyeColours([...map.values()]);}

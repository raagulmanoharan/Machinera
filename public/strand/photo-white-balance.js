// Estimate the illuminant from bright, low-chroma regions, not the average
// scene colour. Saturated subjects never serve as a white reference.
const linear=v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;};
const encode=v=>255*(v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055);
export function estimateWhiteBalance(samples){
 let weight=0,light=0,squared=0;const sum=[0,0,0];
 for(const {rgb,weight:area} of samples){const max=Math.max(...rgb),min=Math.min(...rgb),chroma=max?(max-min)/max:1;
  if(max<128||max>248||chroma>=.3)continue;
  const w=area*(1-chroma/.3)**2*(max/255)**4,l=max/255;
  weight+=w;light+=w*l;squared+=w*l*l;for(let k=0;k<3;k++)sum[k]+=linear(rgb[k])*w;
 }
 const total=samples.reduce((n,s)=>n+s.weight,0);
 // A small flat patch or a uniformly warm subject is insufficient evidence.
 if(!weight||weight<total*.005||Math.sqrt(Math.max(0,squared/weight-(light/weight)**2))<.035)return[1,1,1];
 const mean=sum.map(v=>v/weight),target=.2126*mean[0]+.7152*mean[1]+.0722*mean[2];
 return mean.map(v=>1+.85*(Math.max(.75,Math.min(1.35,target/v))-1));
}
export function balanceColour(rgb,gains){
 if(gains.every(v=>v===1))return Array.from(rgb);
 const values=Array.from(rgb,(v,k)=>linear(v)*gains[k]),scale=Math.max(1,...values);
 return values.map(v=>encode(v/scale));
}

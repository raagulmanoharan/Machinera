import {compileLoomDraft} from './loom-draft.js?v=117';
import {photoDesignMetrics} from './photo-weave-design.js?v=117';
// A photo describes a symmetric lift field, not a catalogue index. Binding
// crossings constrain every fourth diagonal before the loom compiler checks it.
export function generatePhotoDraft(palette,analysis=null){
 const m=photoDesignMetrics(palette,analysis);let hash=2166136261;
 const signature=JSON.stringify([palette.map(c=>[...c.rgb,Math.round(c.share*1e6)]),[m.brightness,m.contrast,m.complexity].map(v=>Math.round(v*1e6))]);
 for(const char of signature)hash=Math.imul(hash^char.charCodeAt(0),16777619)>>>0;
 const n=m.complexity>.48?16:m.complexity>.22?12:8,seq=Array.from({length:n},(_,i)=>i),half=n/2;
 for(let attempt=0;attempt<16;attempt++){
  const fx=1+(hash+attempt)%3,fy=1+((hash>>>5)+attempt)%3,diagonal=1+((hash>>>11)+attempt)%3;
  const tieUp=seq.map(y=>seq.map(x=>{const sx=Math.min(x,n-1-x),sy=Math.min(y,n-1-y),binding=(sx+sy)%4;
   if(binding===0)return false;if(binding===2)return true;
   const u=(sx+.5)/half,v=(sy+.5)/half;
   const field=Math.cos(Math.PI*fx*u)*(0.35+m.contrast)+Math.cos(Math.PI*fy*v)*(0.35+m.brightness*.5)+Math.cos(Math.PI*diagonal*(u+v))*(.2+m.complexity)+Math.cos(Math.PI*(u-v)*(1+m.colours%3))*(.15+m.saturation*.35);
   return field>(m.dominant-.5)*.7+(attempt%3-1)*.12;
  }));
  try{return compileLoomDraft({id:`photo-${hash.toString(16)}-${attempt}`,name:'Photo-generated symmetric draft',family:'geometric',shafts:n,threading:seq,treadling:seq,tieUp});}catch(error){if(!(error instanceof RangeError))throw error;}
 }
 // A fully bound symmetric seed, calculated at the chosen scale, is the safe
 // construction if the richer field cannot meet the supported float limit.
 const tieUp=seq.map(y=>seq.map(x=>(Math.min(x,n-1-x)+Math.min(y,n-1-y))%2===0));
 return compileLoomDraft({id:`photo-${hash.toString(16)}-bound`,name:'Photo-generated bound draft',family:'geometric',shafts:n,threading:seq,treadling:seq,tieUp});
}
export function draftCrossing(draft,end,pick){const mod=(x,n)=>(x%n+n)%n;return Math.floor(draft.rows[mod(Math.round(pick),draft.height)]/2**mod(Math.round(end),draft.width))%2===1;}

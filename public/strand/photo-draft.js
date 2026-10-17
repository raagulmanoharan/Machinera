import {compileLoomDraft} from './loom-draft.js?v=134';
import {photoDesignMetrics} from './photo-weave-design.js?v=134';
// A photo describes a symmetric lift field, not a catalogue index. Binding
// crossings constrain every fourth diagonal before the loom compiler checks it.
export function generatePhotoDraft(palette,analysis=null){
 const m=photoDesignMetrics(palette,analysis);let hash=2166136261;
 const signature=JSON.stringify([palette.map(c=>[...c.rgb,Math.round(c.share*1e6)]),[m.brightness,m.contrast,m.complexity].map(v=>Math.round(v*1e6))]);
 for(const char of signature)hash=Math.imul(hash^char.charCodeAt(0),16777619)>>>0;
 const n=m.complexity>.48?16:m.complexity>.22?12:8,seq=Array.from({length:n},(_,i)=>i),half=n/2;let best=null,bestScore=Infinity;const bindingPeriod=m.complexity>.45?4:3;
 for(let attempt=0;attempt<16;attempt++){
  const fx=1+(hash+attempt)%3,fy=1+((hash>>>5)+attempt)%3,diagonal=1+((hash>>>11)+attempt)%3;
  const tieUp=seq.map(y=>seq.map(x=>{const sx=Math.min(x,n-1-x),sy=Math.min(y,n-1-y),binding=(sx+(m.contrast>.25?1:3)*sy)%bindingPeriod;
   if(binding===0)return false;if(binding===Math.floor(bindingPeriod/2))return true;
   const u=(sx+.5)/half,v=(sy+.5)/half;
   const field=Math.cos(Math.PI*fx*u)*(0.35+m.contrast)+Math.cos(Math.PI*fy*v)*(0.35+m.brightness*.5)+Math.cos(Math.PI*diagonal*(u+v))*(.2+m.complexity)+Math.cos(Math.PI*(u-v)*(1+m.colours%3))*(.15+m.saturation*.35);
   return field>(m.dominant-.5)*.7+(attempt%5-1)*.28;
  }));
  try{const draft=compileLoomDraft({id:`photo-${hash.toString(16)}-${attempt}`,name:'Photo-generated symmetric draft',family:'geometric',shafts:n,threading:seq,treadling:seq,tieUp});let lifted=0,horizontal=0,vertical=0;for(let y=0;y<n;y++)for(let x=0;x<n;x++){const v=tieUp[y][x];lifted+=v;if(v!==tieUp[y][(x+1)%n])horizontal++;if(v!==tieUp[(y+1)%n][x])vertical++;}const coverage=lifted/(n*n),density=(horizontal+vertical)/(2*n*n),score=Math.abs(coverage-(.35+m.brightness*.15))*4+Math.abs(density-(.38+m.complexity*.24))*2+Math.max(0,draft.maxFloat-(3+Math.round(m.complexity*2)))*.3+Math.abs(horizontal-vertical)/(n*n)*.2;if(score<bestScore){best=draft;bestScore=score;}}catch(error){if(!(error instanceof RangeError))throw error;}
 }
 if(best)return best;
 // A fully bound symmetric seed, calculated at the chosen scale, is the safe
 // construction if the richer field cannot meet the supported float limit.
 const tieUp=seq.map(y=>seq.map(x=>(Math.min(x,n-1-x)+Math.min(y,n-1-y))%2===0));
 return compileLoomDraft({id:`photo-${hash.toString(16)}-bound`,name:'Photo-generated bound draft',family:'geometric',shafts:n,threading:seq,treadling:seq,tieUp});
}
export function draftCrossing(draft,end,pick){const mod=(x,n)=>(x%n+n)%n;return Math.floor(draft.rows[mod(Math.round(pick),draft.height)]/2**mod(Math.round(end),draft.width))%2===1;}

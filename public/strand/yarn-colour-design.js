import {allocateYarns} from './yarn-palette.js?v=82';
// A design orders whole yarns, never recolours pixels or interpolates dye lots.
export function designRandom(seed){let state=seed>>>0;return()=>{state+=0x6D2B79F5;let t=Math.imul(state^state>>>15,1|state);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};}
export function createColourDesign(recipe,seed){
 let identity=2166136261;for(const c of recipe?.id??'plain')identity=Math.imul(identity^c.charCodeAt(0),16777619);
 seed=(seed^identity)>>>0;const random=designRandom(seed),family=recipe?.family??'plain';
 const choices=family==='basket'?['checks','block-repeat']:family==='rib'?['stripes','pinstripes']:family.includes('point')?['point-repeat','checks']:family.includes('twill')?['alternating','point-repeat','pinstripes']:family==='satin'?['stripes','alternating']:['alternating','checks','block-repeat'];
 return {seed:seed>>>0,style:choices[Math.floor(random()*choices.length)],repeat:2+Math.floor(random()*5),phase:random(),reverse:random()<.5,warpUnit:Math.max(1,Math.floor((recipe?.width??2)/2)),weftUnit:Math.max(1,Math.floor((recipe?.height??2)/2))};
}
export function designYarns(palette,count,design,axis){
 const counts=allocateYarns(palette,count),random=designRandom(design.seed^(axis==='warp'?0xA37F:0x7B19)),order=palette.map((_,i)=>i);
 for(let i=order.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
 const unit=axis==='warp'?design.warpUnit:design.weftUnit,phase=design.phase+(axis==='weft'?.27:0),fract=v=>v-Math.floor(v),salt=random();
 const slots=Array.from({length:count},(_,i)=>{let score;const block=Math.floor(i/unit),t=(i+.5)/count;
  switch(design.style){
   case 'stripes':score=axis==='weft'?fract(t*design.repeat+phase):fract(t+phase);break;
   case 'pinstripes':score=fract(block/(3+design.repeat)+phase);break;
   case 'alternating':score=fract(block*.61803398875+phase);break;
   case 'point-repeat':score=Math.abs(2*fract(t*design.repeat+phase)-1);break;
   case 'checks':score=fract(block/(2*design.repeat)+phase);break;
   default:score=fract(Math.floor(block/design.repeat)*.381966+phase);break;
  }
  // Tiny stable tie-breaks preserve coherent bundles without locking both axes.
  return {i,score:(design.reverse?1-score:score)+fract(block*.754877+salt)*.00001};
 }).sort((a,b)=>a.score-b.score||a.i-b.i);
 const sequence=new Array(count);let cursor=0;for(const colour of order)for(let n=0;n<counts[colour];n++)sequence[slots[cursor++].i]=colour;
 return{counts,sequence};
}
export function freshDesignSeed(){const bits=new Uint32Array(1);globalThis.crypto.getRandomValues(bits);return bits[0];}

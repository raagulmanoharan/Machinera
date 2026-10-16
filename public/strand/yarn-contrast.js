import {oklab} from './yarn-palette.js?v=127';
// Palette-only decisions. Never invent a dye or change its source weight.
export function colourContrast(a,b){const x=oklab(a),y=oklab(b);return Math.hypot((x[0]-y[0])*1.6,x[1]-y[1],x[2]-y[2]);}
function permutations(indices){if(indices.length<2)return[indices];return indices.flatMap((value,i)=>permutations(indices.filter((_,j)=>j!==i)).map(rest=>[value,...rest]));}
export function orderColours(palette,indices){
 if(indices.length<2)return indices.slice();
 const ground=indices.reduce((a,b)=>palette[a].share>=palette[b].share?a:b),rest=indices.filter(i=>i!==ground);let best=null,bestScore=-Infinity;
 for(const tail of permutations(rest)){const order=[ground,...tail],edges=order.slice(1).map((c,i)=>colourContrast(palette[order[i]].rgb,palette[c].rgb)),score=Math.min(...edges)*2+edges.reduce((a,b)=>a+b,0)/edges.length;
  if(score>bestScore+1e-12){best=order;bestScore=score;}
 }return best;
}
export function splitYarnDyes(palette){
 let best=null,bestScore=-Infinity;const indices=palette.map((_,i)=>i),contrast=palette.map(a=>palette.map(b=>colourContrast(a.rgb,b.rgb)));
 for(const order of permutations(indices)){let remaining=1;const warp=palette.map(()=>0);for(const i of order){warp[i]=Math.min(remaining,palette[i].share*2);remaining-=warp[i];}const weft=palette.map((c,i)=>Math.max(0,2*c.share-warp[i]));let score=0;
  for(let i=0;i<palette.length;i++)for(let j=0;j<palette.length;j++)score+=warp[i]*weft[j]*contrast[i][j];
  if(score>bestScore+1e-12){best={warp,weft};bestScore=score;}
 }return best;
}

import {photoDesignMetrics} from './photo-weave-design.js?v=156';
import {orderColours} from './yarn-contrast.js?v=196';
const phase=(t,n)=>{const f=((t*n)%1+1)%1;return Math.abs(f-.5)*2;};
// A small yarn-cell map, not a photo texture. Each row becomes contiguous local
// weft runs. Symmetry groups are assigned whole source dyes by weighted rank.
function buildRug(palette,width,height,analysis=null,{avoidFamilies=[],seed=0,family:requestedFamily}={}){
 const m=photoDesignMetrics(palette,analysis);let hash=(2166136261^seed)>>>0;for(const char of JSON.stringify([palette.map(c=>[c.rgb,Math.round(c.share*1e6)]),m.brightness,m.contrast,m.complexity]))hash=Math.imul(hash^char.charCodeAt(0),16777619)>>>0;
 const preferred=m.dominant>.62?'medallion':m.complexity>.55?'diamond-lattice':m.contrast>.23?'stepped-diamonds':'nested-lozenges',families=['medallion','diamond-lattice','stepped-diamonds','nested-lozenges','chevron-bands','window-checks','cross-lattice','jamakkalam-bands','tonal-bands','persian-medallion','persian-garden'];
 const candidates=families.filter(f=>!avoidFamilies.includes(f));const family=requestedFamily??(candidates.length?candidates:families).sort((a,b)=>{const score=f=>{const i=families.indexOf(f);let v=Math.imul(hash^Math.imul(i+1,0x9e3779b9),0x85ebca6b)>>>0;v=Math.imul(v^(v>>>16),0xc2b2ae35)>>>0;const phase=v/4294967296;return phase+(f===preferred?-.2:0);};return score(a)-score(b);})[0];
 const persian=family.startsWith('persian-'),central=family==='medallion'||family==='persian-medallion';
 const banded=(family==='jamakkalam-bands'||family==='tonal-bands'),columns=banded||central?1:1+((hash>>>8)%3),rows=banded?1+((hash>>>12)%4):central?1:Math.max(2,Math.round(height/width*columns*(.65+((hash>>>16)%3)*.15))),border=banded?0:persian?5:2+(m.contrast>.3?1:0),groups=[];
 const innerW=Math.max(2,width-2*border),innerH=Math.max(2,height-2*border),halfX=Math.ceil(width/2),halfY=Math.ceil(height/2);
 for(let y=0;y<halfY;y++)for(let x=0;x<(banded?1:halfX);x++){
  const edge=Math.min(x,width-1-x,y,height-1-y),u=(x-border+.5)/innerW,v=(y-border+.5)/innerH;
  const a=phase(u,columns),b=phase(v,rows);
  let field;
  if(banded)field=family==='tonal-bands'?b:b+.24*Math.cos(Math.PI*phase(v,rows*4));
  else if(persian){const radius=Math.hypot(a,b),angle=Math.atan2(b,a);field=2-radius*(1+(.12+.04*((hash>>>18)%4))*Math.cos((6+2*((hash>>>22)%2))*angle))+.16*Math.cos(radius*Math.PI*(3+((hash>>>24)%3)));}
  else if(family==='medallion'){const cx=Math.abs((x+.5-width/2)/(innerW/2)),cy=Math.abs((y+.5-height/2)/(innerH/2));field=2-((cx+cy)*(1-m.brightness*.35)+Math.max(cx,cy)*m.brightness*.7);}
  else if(family==='diamond-lattice')field=a+b+.20*Math.min(a,b);
  else if(family==='stepped-diamonds')field=Math.floor((a+b)*6)/6+.08*(a+b);
  else if(family==='chevron-bands')field=Math.abs(b-a*.7);
  else if(family==='window-checks')field=Math.max(a,b)+.12*Math.min(a,b);
  else if(family==='cross-lattice')field=Math.min(a,b)+.12*Math.max(a,b);
  else field=Math.max(a,b)*.65+(a+b)*.35;
  // Intricacy follows this same shape's contours; it is never a separate stamp.
  // Small repeats receive fewer nested bands so yarn-scale detail stays readable.
  if(!banded){const scale=Math.min(innerW/columns,innerH/rows),levels=Math.max(2,Math.min(6,Math.floor(scale/(8-3*m.complexity))+((hash>>>20)%2)));
   field=Math.cos(Math.PI*(field*(levels+((hash>>>24)%5)/8)+((hash>>>27)%8)/8));
  }
  // The enclosing bands share a rank across their entire length. No noise,
  // independently coloured pixels or broken islands enter the composition.
  const score=edge<border?(persian ? .35+.45*(edge%2)+1.1*phase(edge===x?v:u,edge===x?rows*3:columns*3):-2+edge/border):field;
  groups.push({x,y,score,weight:(banded?width:x===width-1-x?1:2)*(y===height-1-y?1:2)});
 }
 groups.sort((a,b)=>a.score-b.score||a.y-b.y||a.x-b.x);const order=orderColours(palette,palette.map((_,i)=>i));if(family==='tonal-bands')order.sort((a,b)=>palette[a].rgb.reduce((s,c,i)=>s+c*[.2126,.7152,.0722][i],0)-palette[b].rgb.reduce((s,c,i)=>s+c*[.2126,.7152,.0722][i],0));const cells=width*height,map=new Uint8Array(cells),counts=palette.map(()=>0);let index=0,used=0,limit=palette[order[0]].share*cells;
 for(const g of groups){while(index<order.length-1&&used+g.weight/2>limit){index++;limit+=palette[order[index]].share*cells;}const dye=order[index];for(const y of new Set([g.y,height-1-g.y]))for(const x of banded?Array.from({length:width},(_,i)=>i):new Set([g.x,width-1-g.x]))map[y*width+x]=dye;counts[dye]+=g.weight;used+=g.weight;}
 const runs=[];for(let y=0;y<height;y++){let start=0;for(let x=1;x<=width;x++)if(x===width||map[y*width+x]!==map[y*width+start]){runs.push(Object.freeze({pick:y,start,end:x,dye:map[y*width+start]}));start=x;}}
 return Object.freeze({family,width,height,border,columns,rows,map,counts:Object.freeze(counts),runs:Object.freeze(runs),construction:banded?'continuous-weft':'discontinuous-weft'});
}


// Rank small candidate maps once at capture time, never during rendering.
// Prefer connected accents and readable contour density; keep the chosen family.
export function compositionQuality(rug,palette,analysis=null){
 const {map,width,height,counts}=rug,n=map.length,seen=new Uint8Array(n),queue=new Int32Array(n),small=palette.map(()=>0);let edges=0;
 for(let i=0;i<n;i++){
  if(i%width&&map[i]!==map[i-1])edges++;if(i>=width&&map[i]!==map[i-width])edges++;
  if(seen[i])continue;let head=0,tail=1;queue[0]=i;seen[i]=1;
  while(head<tail){const at=queue[head++];for(const next of [at%width?at-1:-1,at%width<width-1?at+1:-1,at-width,at+width])if(next>=0&&next<n&&!seen[next]&&map[next]===map[i]){seen[next]=1;queue[tail++]=next;}}
  if(tail<4)small[map[i]]+=tail;
 }
 const fragmentation=small.reduce((sum,c,i)=>sum+c/Math.max(1,counts[i]),0)/palette.length,target=.09+.1*(analysis?.complexity??.3)+.012*Math.max(0,palette.length-2);
 return fragmentation+4*Math.abs(edges/(2*n-width-height)-target);
}
export function composeRug(palette,width,height,analysis=null,options={}){
 let best=buildRug(palette,width,height,analysis,options);if(best.construction==='continuous-weft')return best;
 let score=compositionQuality(best,palette,analysis);const family=best.family;
 for(let i=1;i<6;i++){const candidate=buildRug(palette,width,height,analysis,{...options,family,seed:Math.imul((options.seed??0)^i,0x9e3779b9)>>>0}),next=compositionQuality(candidate,palette,analysis);if(next<score){best=candidate;score=next;}}
 return best;
}

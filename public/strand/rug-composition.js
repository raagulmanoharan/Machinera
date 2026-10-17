import {photoDesignMetrics} from './photo-weave-design.js?v=156';
import {orderColours} from './yarn-contrast.js?v=182';
// A small yarn-cell map, not a photo texture. Each row becomes contiguous local
// weft runs. Symmetry groups are assigned whole source dyes by weighted rank.
export function composeRug(palette,width,height,analysis=null,{avoidFamilies=[]}={}){
 const m=photoDesignMetrics(palette,analysis);let hash=2166136261;for(const char of JSON.stringify([palette.map(c=>[c.rgb,Math.round(c.share*1e6)]),m.brightness,m.contrast,m.complexity]))hash=Math.imul(hash^char.charCodeAt(0),16777619)>>>0;
 const preferred=m.dominant>.62?'medallion':m.complexity>.55?'diamond-lattice':m.contrast>.23?'stepped-diamonds':'nested-lozenges',families=['medallion','diamond-lattice','stepped-diamonds','nested-lozenges','chevron-bands','window-checks','cross-lattice'];
 const candidates=families.filter(f=>!avoidFamilies.includes(f));const family=(candidates.length?candidates:families).sort((a,b)=>{const score=f=>{const i=families.indexOf(f);let v=Math.imul(hash^Math.imul(i+1,0x9e3779b9),0x85ebca6b)>>>0;v=Math.imul(v^(v>>>16),0xc2b2ae35)>>>0;const phase=v/4294967296;return phase+(f===preferred?-.2:0);};return score(a)-score(b);})[0];
 const columns=family==='medallion'?1:1+((hash>>>8)%3),rows=family==='medallion'?1:Math.max(2,Math.round(height/width*columns*(.65+((hash>>>16)%3)*.15))),border=2+(m.contrast>.3?1:0),groups=[];
 const innerW=Math.max(2,width-2*border),innerH=Math.max(2,height-2*border),halfX=Math.ceil(width/2),halfY=Math.ceil(height/2);
 for(let y=0;y<halfY;y++)for(let x=0;x<halfX;x++){
  const edge=Math.min(x,width-1-x,y,height-1-y),u=(x-border+.5)/innerW,v=(y-border+.5)/innerH;
  const phase=(t,n)=>{const f=((t*n)%1+1)%1;return Math.abs(f-.5)*2;},a=phase(u,columns),b=phase(v,rows);
  let field;
  if(family==='medallion'){const cx=Math.abs((x+.5-width/2)/(innerW/2)),cy=Math.abs((y+.5-height/2)/(innerH/2));field=2-((cx+cy)*(1-m.brightness*.35)+Math.max(cx,cy)*m.brightness*.7);}
  else if(family==='diamond-lattice')field=a+b+.20*Math.min(a,b);
  else if(family==='stepped-diamonds')field=Math.floor((a+b)*6)/6+.08*(a+b);
  else if(family==='chevron-bands')field=Math.abs(b-a*.7);
  else if(family==='window-checks')field=Math.max(a,b)+.12*Math.min(a,b);
  else if(family==='cross-lattice')field=Math.min(a,b)+.12*Math.max(a,b);
  else field=Math.max(a,b)*.65+(a+b)*.35;
  // The enclosing bands share a rank across their entire length. No noise,
  // independently coloured pixels or broken islands enter the composition.
  const score=edge<border?-2+edge/border:field;
  groups.push({x,y,score,weight:(x===width-1-x?1:2)*(y===height-1-y?1:2)});
 }
 groups.sort((a,b)=>a.score-b.score||a.y-b.y||a.x-b.x);const order=orderColours(palette,palette.map((_,i)=>i)),cells=width*height,map=new Uint8Array(cells),counts=palette.map(()=>0);let index=0,used=0,limit=palette[order[0]].share*cells;
 for(const g of groups){while(index<order.length-1&&used+g.weight/2>limit){index++;limit+=palette[order[index]].share*cells;}const dye=order[index];for(const y of new Set([g.y,height-1-g.y]))for(const x of new Set([g.x,width-1-g.x]))map[y*width+x]=dye;counts[dye]+=g.weight;used+=g.weight;}
 const runs=[];for(let y=0;y<height;y++){let start=0;for(let x=1;x<=width;x++)if(x===width||map[y*width+x]!==map[y*width+start]){runs.push(Object.freeze({pick:y,start,end:x,dye:map[y*width+start]}));start=x;}}
 return Object.freeze({family,width,height,border,columns,rows,map,counts:Object.freeze(counts),runs:Object.freeze(runs),construction:'discontinuous-weft'});
}

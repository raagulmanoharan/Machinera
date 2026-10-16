// Pure shaft-loom draft compiler. Rows are real warp-over/weft-over decisions.
const mod=(x,n)=>(x%n+n)%n,seq=n=>Array.from({length:n},(_,i)=>i);
export function compileLoomDraft({id,name,family,shafts,threading,treadling,tieUp}){
 if(!Number.isInteger(shafts)||shafts<2||shafts>8)throw new RangeError('Use 2–8 shafts');
 if(!threading.length||threading.length>16||!treadling.length||treadling.length>16)throw new RangeError('Repeat must fit 16×16');
 if(tieUp.length!==shafts||tieUp.some(row=>row.length!==shafts))throw new RangeError('Tie-up dimensions');
 if([...threading,...treadling].some(n=>!Number.isInteger(n)||n<0||n>=shafts))throw new RangeError('Invalid shaft/treadle');
 const grid=treadling.map(t=>threading.map(s=>!!tieUp[t][s]));let maxFloat=0;
 for(let axis=0;axis<2;axis++){const length=axis?grid.length:grid[0].length,lines=axis?grid[0].length:grid.length;
  for(let line=0;line<lines;line++){const values=seq(length).map(k=>axis?grid[k][line]:grid[line][k]);if(values.every(v=>v===values[0]))throw new RangeError('Unbound yarn');
   let run=0,last=null;for(let k=0;k<length*2;k++){const v=values[k%length];run=v===last?run+1:1;last=v;maxFloat=Math.max(maxFloat,run);}
  }
 }
 if(maxFloat>7)throw new RangeError('Float exceeds supported seven-yarn span');
 const freeze=a=>Object.freeze(a.slice()),mirror=threading.every((v,i)=>v===threading.at(-1-i));
 return Object.freeze({id,name,family,shafts,width:threading.length,height:treadling.length,threading:freeze(threading),treadling:freeze(treadling),tieUp:Object.freeze(tieUp.map(r=>freeze(r.map(Boolean)))),rows:freeze(grid.map(row=>row.reduce((bits,v,x)=>bits+(v?2**x:0),0))),maxFloat,structuralSymmetry:mirror?'warp':'none',generated:true});
}
export function generateLoomDraft({family='twill',shafts=4,over=2,block=2,symmetry=true}={}){
 let threading,treadling,tieUp;
 if(family==='basket'||family==='rib'){
  shafts=2;if(!Number.isInteger(block)||block<1||block>3)throw new RangeError('Bundle size 1–3');
  threading=[...Array(block).fill(0),...Array(block).fill(1)];treadling=family==='rib'?[0,1]:threading.slice();tieUp=[[true,false],[false,true]];
 }else{
  if(!['twill','point twill'].includes(family))throw new RangeError('Unsupported single-layer generator');
  if(!Number.isInteger(over)||over<1||over>=shafts)throw new RangeError('Twill requires both lifted and lowered shafts');
  threading=family==='point twill'?[...seq(shafts),...seq(shafts-2).map(i=>shafts-2-i)]:seq(shafts);
  treadling=threading.slice();tieUp=seq(shafts).map(t=>seq(shafts).map(s=>mod(s+t,shafts)<over));
 }
 if(symmetry)threading=[...threading,...threading.slice().reverse()];
 const id=`loom-${family.replaceAll(' ','-')}-${shafts}-${over}-${block}-${symmetry?'mirror':'straight'}`;
 return compileLoomDraft({id,name:`${symmetry?'Mirrored ':''}${family} ${family==='basket'||family==='rib'?block:over+'/'+(shafts-over)}`,family,shafts,threading,treadling,tieUp});
}
export function generatedDraftCatalogue(existing,limit=40){
 const signature=d=>seq(48).map(y=>seq(48).map(x=>Math.floor(d.rows[y%d.height]/2**(x%d.width))%2).join('')).join(''),seen=new Set(existing.map(signature)),result=[];
 const candidates=[];for(const family of ['twill','point twill'])for(const shafts of [3,4,5,6,8])for(let over=1;over<shafts;over++)candidates.push({family,shafts,over});
 for(const family of ['basket','rib'])for(const block of [1,2,3])candidates.push({family,block});
 for(const args of candidates){if(existing.length+result.length>=limit)break;try{const d=generateLoomDraft(args);if(48%d.width||d.maxFloat>4)continue;const key=signature(d);if(!seen.has(key)){seen.add(key);result.push(d);}}catch(error){if(!(error instanceof RangeError))throw error;}}
 return result;
}

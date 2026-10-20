import test from 'node:test';import assert from 'node:assert/strict';
import {createWeavePattern} from './weaving-patterns.js';
import {encodeDraftRow} from './weave-library.js';
const palettes=[[{rgb:[60,40,25],share:.6},{rgb:[235,220,180],share:.3},{rgb:[30,70,100],share:.1}],Array.from({length:5},(_,i)=>({rgb:[30+i*40,180-i*20,80+i*15],share:.2}))];
test('finished tapestry colours and GPU bindings mirror both axes at arbitrary archive offsets',()=>{
 for(const palette of palettes)for(const picks of [75,118,119,120])for(const firstPick of [0,1,47,119])for(const complexity of [.15,.75]){
  const p=createWeavePattern({palette,weftPicks:picks,firstPick,seed:17,analysis:{complexity},composition:true,symmetry:'auto'});
  assert.equal(p.allocation,'weft-faced');assert.equal(new Set(p.warp.sequence).size,1);assert.ok(p.draft.maxFloat<=6);
  for(let y=0;y<picks;y++)for(let x=0;x<48;x++){
   assert.deepEqual(p.yarnAt(x,y),p.yarnAt(47-x,y));assert.deepEqual(p.yarnAt(x,y),p.yarnAt(x,picks-1-y));
   const [,lo,hi,width]=encodeDraftRow(p.draft,y+firstPick);assert.equal(!!(Math.floor((lo+hi*256)/2**(x%width))%2),p.crossing(x,y));
  }
 }
});
test('pattern details use complete local weft runs over a bound ground, with no second colour design',()=>{
 const p=createWeavePattern({palette:palettes[0],weftPicks:119,seed:42,composition:true,symmetry:'auto'});
 let nonGround=0,totalWarp=0;
 for(let y=0;y<119;y++)for(let x=0;x<48;x++){const warp=p.crossing(x,y);totalWarp+=+warp;assert.deepEqual(p.yarnAt(x,y),p.palette[warp?p.warp.sequence[x]:p.motif.map[y*48+x]].rgb);if(!warp&&p.motif.map[y*48+x]!==p.warp.sequence[0])nonGround++;}
 assert.ok(totalWarp/(48*119)<.36);assert.ok(nonGround>0);
});

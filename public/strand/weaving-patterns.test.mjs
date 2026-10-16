import test from 'node:test';import assert from 'node:assert/strict';
import {compileLoomDraft,generateLoomDraft,createWeavePattern,listWeavePatterns,patternIndices} from './weaving-patterns.js';
import {WEAVE_LIBRARY,warpOver} from './weave-library.js';import {RugArchive} from './rug-archive.js';
const palette=[{rgb:[30,80,75],share:.5},{rgb:[195,160,100],share:.3},{rgb:[160,65,40],share:.2}];
test('default patterns mirror the actual drawdown and keep floats within supported float lengths',()=>{
 const indices=patternIndices();assert.ok(indices.length>=6);assert.ok(listWeavePatterns().length>24);
 for(const draftIndex of indices){const draft=WEAVE_LIBRARY[draftIndex];assert.ok(draft.maxFloat<=7);for(let y=0;y<draft.height;y++)for(let x=0;x<48;x++)assert.equal(warpOver(x,y,draftIndex),warpOver(47-x,y,draftIndex));}
});
test('seed replay gives immutable recipes and actual yarn crossing colours',()=>{
 for(let seed=1;seed<=40;seed++){
 const a=createWeavePattern({palette,seed,firstPick:117}),b=createWeavePattern({palette,seed,firstPick:117});assert.equal(a.id,b.id);assert.deepEqual(a.warp,b.warp);assert.deepEqual(a.weft,b.weft);assert.equal(a.symmetry,'warp-colour-and-structure');
 assert.deepEqual(a.warp.sequence,a.warp.sequence.slice().reverse());assert.throws(()=>a.warp.sequence[0]=99,TypeError);assert.throws(()=>a.palette[0].rgb[0]=99,TypeError);
 for(let y=0;y<120;y++)for(let x=0;x<48;x++)assert.deepEqual(a.yarnAt(x,y),a.palette[a.crossing(x,y)?a.warp.sequence[x]:a.weft.sequence[y]].rgb);
 }
});
test('compiler rejects unbound ends and unsafe repeat floats',()=>{
 assert.throws(()=>compileLoomDraft({shafts:2,threading:[0,1],treadling:[0,1],tieUp:[[true,true],[true,true]]}),/Unbound/);
 assert.throws(()=>generateLoomDraft({shafts:8,over:7}),/Float/);
 const d=generateLoomDraft({family:'twill',shafts:3,over:1});assert.equal(d.structuralSymmetry,'warp');assert.equal(d.maxFloat,4);
});
test('archive uses the callable recipe and retains old sections',()=>{
 const archive=new RugArchive(),index=patternIndices()[0],a=archive.append({palette,designSeed:42},3.8,index),before=a.baked.slice();assert.equal(a.plan.draftIndex,index);assert.deepEqual(a.warp,a.plan.warp.sequence);archive.append({palette,designSeed:87},2.4,patternIndices()[1]);assert.deepEqual(a.baked,before);
});

test('composition supports top-bottom, both axes and half-turn medallions',()=>{
 const modes=new Set();for(let seed=1;seed<=80;seed++){
  const plan=createWeavePattern({seed,palette,symmetry:'auto'});modes.add(plan.colourSymmetry);
  for(const [axis,n] of [['warp',48],['weft',120]]){const yarn=plan[axis];assert.equal(yarn.sequence.length,n);const mirrored=plan.colourSymmetry===axis||['both','radial'].includes(plan.colourSymmetry);if(mirrored)assert.deepEqual(yarn.sequence,yarn.sequence.slice().reverse());
   if(plan.allocation==='shared-systems')for(let i=0;i<palette.length;i++)assert.ok(Math.abs(yarn.counts[i]-palette[i].share*n)<(mirrored?2:1));
  }
  if(plan.colourSymmetry==='radial'){assert.equal(plan.design.style,'medallion');assert.equal(plan.rotationalOrder,2);}
 }
 assert.deepEqual([...modes].sort(),['both','radial','warp']);
});

test('every automatic carpet exposes exactly mirrored colour blocks at actual crossings',()=>{
 const photographicPalette=[{rgb:[70,45,31],share:.62},{rgb:[148,144,115],share:.18},{rgb:[65,85,150],share:.20}];
 for(let seed=1;seed<=200;seed++){
 const p=createWeavePattern({seed,palette:photographicPalette,symmetry:'auto'});assert.notEqual(p.colourSymmetry,'weft');
 for(let y=0;y<120;y++)for(let x=0;x<24;x++)assert.deepEqual(p.yarnAt(x,y),p.yarnAt(47-x,y),'visible yarn dyes, not just sequences, must mirror');
 }
});

test('geometric motifs preserve combined dye shares with contrasting yarn systems',()=>{
 const drafts=listWeavePatterns().filter(d=>d.family==='geometric');assert.ok(drafts.length>=10);
 for(const draft of drafts){const p=createWeavePattern({draftId:draft.id,seed:42,palette,symmetry:'both'});assert.equal(p.allocation,'contrasting-systems');
 for(let i=0;i<palette.length;i++){const share=.5*(p.warp.counts[i]/48+p.weft.counts[i]/120);assert.ok(Math.abs(share-palette[i].share)<.5*(2/48+2/120));}
 assert.notDeepEqual(p.warp.counts.map(n=>n/48),p.weft.counts.map(n=>n/120));
 }
});

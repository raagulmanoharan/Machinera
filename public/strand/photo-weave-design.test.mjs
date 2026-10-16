import test from 'node:test';import assert from 'node:assert/strict';
import {createWeavePattern} from './weaving-patterns.js';import {RugArchive} from './rug-archive.js';
const palettes=[
 [{rgb:[10,20,30],share:.7},{rgb:[230,210,180],share:.3}],
 [{rgb:[255,0,20],share:.5},{rgb:[0,200,240],share:.5}],
 [{rgb:[50,90,150],share:.34},{rgb:[130,170,200],share:.33},{rgb:[220,210,240],share:.33}]
];
test('photo statistics determine structure and yarn order independently of seed',()=>{
 const ids=new Set();for(const palette of palettes){const a=createWeavePattern({palette,symmetry:'auto'});ids.add(a.draft.id);for(const seed of [1,257,99999]){const b=createWeavePattern({palette,seed,symmetry:'auto'});assert.equal(a.draft.id,b.draft.id);assert.deepEqual(a.warp,b.warp);assert.deepEqual(a.weft,b.weft);}assert.equal(a.draft.family,'geometric');}assert.ok(ids.size>=3);
});
test('archive automatic printing uses the derived recipe and locks older yarns',()=>{
 const archive=new RugArchive(),a=archive.append({palette:palettes[0]}),before=a.baked.slice();archive.append({palette:palettes[1]});assert.deepEqual(a.baked,before);assert.equal(a.weave,a.plan.draftIndex);assert.notEqual(a.weave,archive.entries[1].weave);
});

test('photo layout becomes an abstract symmetric yarn plan, not a copied bitmap',async()=>{
 const {abstractPhotoLayout}=await import('./photo-weave-design.js');const width=48,height=48;
 const composition={width,height,indices:Uint8Array.from({length:width*height},(_,i)=>Math.floor(i/width)<24?0:1)};
 const layout=abstractPhotoLayout(composition);assert.equal(layout.orientation,'bands');assert.equal('indices' in layout,false);
 const palette=[{rgb:[160,190,200],share:.5},{rgb:[230,50,40],share:.32},{rgb:[8,8,8],share:.18}];
 const archive=new RugArchive(),entry=archive.append({palette,composition});assert.equal(entry.composition,undefined);
 assert.deepEqual(entry.warp,entry.warp.slice().reverse());assert.deepEqual(entry.weft,entry.weft.slice().reverse());
 for(let pick=0;pick<entry.weft.length;pick++){const q=(entry.firstPick+pick)*.032;assert.deepEqual(archive.weftColour(entry,q,.1),archive.weftColour(entry,q,.9));}
 for(let y=0;y<entry.weft.length;y++)for(let x=0;x<24;x++)assert.deepEqual(entry.plan.yarnAt(x,y),entry.plan.yarnAt(47-x,y));
 for(let i=0;i<palette.length;i++){const combined=.5*(entry.plan.warp.counts[i]/48+entry.plan.weft.counts[i]/entry.weft.length);assert.ok(Math.abs(combined-palette[i].share)<.05);}
});

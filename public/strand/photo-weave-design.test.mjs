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

test('light contrast and complexity change the design while retaining symmetric dye quotas',()=>{
 const palette=[{rgb:[160,190,200],share:.5},{rgb:[230,50,40],share:.32},{rgb:[8,8,8],share:.18}];const variants=[{brightness:.7,contrast:.12,complexity:.1},{brightness:.2,contrast:.4,complexity:.1},{brightness:.4,contrast:.3,complexity:.8}],ids=new Set();
 const archive=new RugArchive();let saved,first;for(const analysis of variants){const entry=archive.append({palette,analysis});ids.add(entry.plan.draft.id);assert.equal(entry.design.brightness,analysis.brightness);assert.equal(entry.design.complexity,analysis.complexity);assert.deepEqual(entry.warp,entry.warp.slice().reverse());assert.deepEqual(entry.weft,entry.weft.slice().reverse());for(let i=0;i<palette.length;i++){const combined=.5*(entry.plan.warp.counts[i]/48+entry.plan.weft.counts[i]/entry.weft.length);assert.ok(Math.abs(combined-palette[i].share)<.05);}if(!first){first=entry;saved=entry.baked.slice();}}
 assert.equal(ids.size,3);assert.deepEqual(first.baked,saved);
});

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

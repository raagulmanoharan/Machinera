import assert from 'node:assert/strict';
import {snapshotWeave,validateWeave,MemoryStore} from './memory-store.js';
import {RugArchive} from './rug-archive.js';
const archive=new RugArchive(),a=archive.append({palette:[{rgb:[20,80,130],share:.7,weight:7},{rgb:[235,160,60],share:.3,weight:3}]},3.8),b=archive.append({palette:[{rgb:[145,30,50],share:.5,weight:5},{rgb:[225,225,200],share:.5,weight:5}]},2.4);
const snapshots=archive.entries.map(e=>structuredClone(snapshotWeave(e)));for(const s of snapshots){validateWeave(s);assert.equal(s.previous,undefined);assert.equal(s.plan.crossing,undefined);}
const restored=new RugArchive().restore(snapshots);assert.equal(restored.length,archive.length);assert.equal(restored.entries[1].previous,restored.entries[0]);
for(let q=0;q<archive.length;q+=.07)for(const u of [.01,.3,.7,.99]){assert.deepEqual(restored.sampleMaterial(q,u),archive.sampleMaterial(q,u));assert.deepEqual(restored.materialDraft(q).rows,archive.materialDraft(q).rows);assert.deepEqual(restored.materialYarns(q,u),archive.materialYarns(q,u));}
const old=restored.entries[0].baked.slice();restored.append({palette:[{rgb:[30,160,50],share:1,weight:1}]},2.4);assert.deepEqual(restored.entries[0].baked,old,'Appending after restoration cannot change old weaves');
assert.throws(()=>validateWeave({version:99}),/not supported/);const prior=restored.entries;assert.throws(()=>restored.restore([{...snapshots[0],end:10}]),/out of order/);assert.equal(restored.entries,prior,'Invalid archives do not partially replace the current cloth');await assert.rejects(new MemoryStore(null).load(),/unavailable/);

import assert from 'node:assert/strict';import {postcardDetails} from './memory-postcard.js';import {RugArchive} from './rug-archive.js';import {snapshotWeave} from './memory-store.js';
const archive=new RugArchive();archive.append([[20,85,100]],3.8,1);const entry=archive.append([[200,40,30],[225,190,100]],2.4,3),details=postcardDetails(entry,1);assert.equal(details.number,'02');assert.equal(details.weave,entry.plan.draft.name);assert.ok(details.pattern.length>0);
const restored=new RugArchive().restore(archive.entries.map(e=>structuredClone(snapshotWeave(e))));for(let q=3.81;q<4.25;q+=.016)for(let end=0;end<48;end++)assert.deepEqual(restored.materialYarns(q,(end+.5)/48),archive.materialYarns(q,(end+.5)/48),'Saved staggered splices restore exactly');

assert.ok(details.inventory.includes(`${entry.weft.length} weft picks`));assert.equal(details.draftId,entry.plan.id);assert.ok(details.description.includes(`${entry.plan.draft.width} ends × ${entry.plan.draft.height} picks`));

assert.match(details.inventory,/heavy yarn colours/);assert.ok(!details.inventory.includes('photo-derived'));assert.match(details.code,/^[0-9A-F]{8}$/);assert.equal(postcardDetails(restored.entries[1],1).code,details.code);const changed=structuredClone(snapshotWeave(entry));changed.palette[0].rgb[0]++;assert.notEqual(postcardDetails(changed,1).code,details.code);

import test from 'node:test';import assert from 'node:assert/strict';
import {generatePhotoDraft,draftCrossing} from './photo-draft.js';
import {RugArchive} from './rug-archive.js';
const palette=[{rgb:[18,76,91],share:.5},{rgb:[215,163,48],share:.3},{rgb:[180,54,30],share:.2}];
test('photo-generated lift plans are bound, cyclic-float-safe and symmetric on both axes',()=>{
 const signatures=new Set();for(let i=0;i<180;i++){
  const analysis={brightness:(i%19)/18,contrast:(i%11)/20,complexity:i/179},d=generatePhotoDraft(palette,analysis);signatures.add(d.rows.join(',')+':'+d.width);
  assert.deepEqual(d,generatePhotoDraft(palette,analysis));assert.equal(48%d.width,0);assert.ok(d.maxFloat<=7);
  for(let y=0;y<d.height;y++)for(let x=0;x<d.width;x++){const v=draftCrossing(d,x,y);assert.equal(v,draftCrossing(d,d.width-1-x,y));assert.equal(v,draftCrossing(d,x,d.height-1-y));}
  for(let axis=0;axis<2;axis++){const n=axis?d.height:d.width,lines=axis?d.width:d.height;for(let line=0;line<lines;line++){let last=null,run=0,ones=0;for(let k=0;k<2*n;k++){const v=axis?draftCrossing(d,line,k):draftCrossing(d,k,line);if(k<n&&v)ones++;run=v===last?run+1:1;last=v;assert.ok(run<=7);}assert.ok(ones>0&&ones<n);}}
 }assert.ok(signatures.size>=35,`Only ${signatures.size} distinct structures`);
});
test('generated structure and its binding transitions are baked without modifying older sections',()=>{
 const a=new RugArchive(),first=a.append({palette,analysis:{brightness:.2,contrast:.4,complexity:.8}}),before=first.baked.slice();
 const next=a.append({palette,analysis:{brightness:.8,contrast:.1,complexity:.1}});assert.notEqual(first.plan.draft.id,next.plan.draft.id);assert.deepEqual(first.baked,before);
 for(let y=0;y<next.rows;y++){const q=next.end-y/(next.rows-1)*next.length,d=a.materialDraft(q);assert.ok(d?.rows.length);}
 assert.equal(first.plan.draft.generated,true);assert.ok(first.plan.draft.id.startsWith('photo-'));
});

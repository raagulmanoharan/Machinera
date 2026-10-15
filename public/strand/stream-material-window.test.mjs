import test from 'node:test';
import assert from 'node:assert/strict';
import {splitMaterialPose,paletteHistoryRow} from './stream-material-window.js';
test('rolling material split conserves length, seam and live grid',()=>{
 const nx=3,ny=9,p=new Float32Array(nx*ny*3);for(let j=0;j<p.length;j++)p[j]=j/10;
 const split=splitMaterialPose(p,nx,ny,18,5);
 assert.equal(split.length+split.archivedLength,18);assert.equal(split.retained.length,p.length);
 assert.deepEqual(split.retained.slice(-nx*3),split.tail.slice(0,nx*3));
 assert.deepEqual(split.tail,p.slice(5*nx*3));assert.equal(split.rows,4);
});
test('successive windows retain all previously produced material',()=>{
 let live=6.2,retained=0,produced=6.2;const nx=3,ny=97,p=new Float32Array(nx*ny*3);
 for(let photo=0;photo<100;photo++){if(live+2.4>14){const split=splitMaterialPose(p,nx,ny,live,Math.floor((14-2.4)/live*(ny-1)));retained+=split.archivedLength;live=split.length;}live+=2.4;produced+=2.4;assert.ok(Math.abs(live+retained-produced)<1e-9);assert.ok(live<=14);}
 assert.ok(produced>240);
});

test('retained colours use the same material direction as the live shader',()=>{
 assert.equal(paletteHistoryRow(0,10,100),99);
 assert.equal(paletteHistoryRow(2,10,100),80);
 assert.equal(paletteHistoryRow(8,10,100),19);
 assert.equal(paletteHistoryRow(10,10,100),0);
});

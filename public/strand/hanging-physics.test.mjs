import test from 'node:test';
import assert from 'node:assert/strict';
import { HangingPhysics } from './hanging-physics.js';
test('a local tug preserves the rail, stays finite, and settles',()=>{
 const sim=new HangingPhysics(),pins=sim.positions.filter((_,j)=>sim.pinned[Math.floor(j/3)]),i=sim.index(.5,.5),j=i*3,start=sim.positions[j+1];
 sim.hold(.5,.5,[sim.positions[j]+.15,start-.2,sim.positions[j+2]+.08]);for(let n=0;n<90;n++)sim.advance(1/90);
 assert.ok(sim.positions[j+1]<start-.15);assert.deepEqual(sim.positions.filter((_,j)=>sim.pinned[Math.floor(j/3)]),pins);
 sim.release();for(let n=0;n<2400;n++)sim.advance(1/90);
 assert.ok([...sim.positions].every(Number.isFinite));assert.deepEqual(sim.positions.filter((_,j)=>sim.pinned[Math.floor(j/3)]),pins);
 let stretch=0;for(const[a,b,l]of sim.links){const k=a*3,m=b*3;stretch=Math.max(stretch,Math.hypot(...[0,1,2].map(c=>sim.positions[k+c]-sim.positions[m+c]))/l)}assert.ok(stretch<1.25,`stretch ${stretch}`);assert.equal(sim.active,false);
});
test('the wall collision plane prevents the yarn shell entering plaster',()=>{const sim=new HangingPhysics(),i=sim.index(.4,.4),j=i*3;sim.hold(.4,.4,[sim.positions[j],.08,sim.positions[j+2]]);for(let n=0;n<60;n++)sim.advance(1/90);for(let k=1;k<sim.positions.length;k+=3)assert.ok(sim.positions[k]<=.017001);});
test('the grab target approaches pointer changes without snapping',()=>{const sim=new HangingPhysics(),i=sim.index(.5,.5),j=i*3,start=Array.from(sim.positions.subarray(j,j+3));sim.hold(.5,.5,[start[0]+.2,start[1]-.2,start[2]]);assert.deepEqual(sim.grab.target,start);sim.step();assert.ok(sim.grab.target[0]>start[0]&&sim.grab.target[0]<start[0]+.1);for(let n=0;n<30;n++)sim.step();assert.ok(Math.abs(sim.grab.target[0]-sim.grab.goal[0])<.0001);});

test('uneven hanging has five fixed attachments and gentle surface relief',()=>{
 const sim=new HangingPhysics();assert.equal(sim.pinned.reduce((a,b)=>a+b,0),5);
 const top=(sim.ny-1)*sim.nx;let free=0;for(let x=0;x<sim.nx;x++)if(!sim.pinned[top+x]){free++;assert.ok(sim.positions[(top+x)*3+2]<=sim.bottom+sim.height);}
 assert.equal(free,sim.nx-5);const depth=[];for(let i=1;i<sim.rest.length;i+=3)depth.push(sim.rest[i]);
 const relief=Math.max(...depth)-Math.min(...depth);assert.ok(relief>.02&&relief<.065,`relief ${relief}`);
 for(let y=0;y<sim.ny;y++)for(let x=1;x<sim.nx;x++){const a=(y*sim.nx+x)*3,b=a-3;assert.ok(Math.abs(sim.rest[a+1]-sim.rest[b+1])/(sim.width/(sim.nx-1))<.85);}
});

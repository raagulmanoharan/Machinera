import test from 'node:test';
import assert from 'node:assert/strict';
import { HangingPhysics } from './hanging-physics.js';
test('a local tug preserves the rail, stays finite, and settles',()=>{
 const sim=new HangingPhysics(),pins=sim.positions.slice((sim.ny-1)*sim.nx*3),i=sim.index(.5,.5),j=i*3,start=sim.positions[j+1];
 sim.hold(.5,.5,[sim.positions[j]+.15,start-.2,sim.positions[j+2]+.08]);for(let n=0;n<90;n++)sim.advance(1/90);
 assert.ok(sim.positions[j+1]<start-.15);assert.deepEqual(sim.positions.slice((sim.ny-1)*sim.nx*3),pins);
 sim.release();for(let n=0;n<2400;n++)sim.advance(1/90);
 assert.ok([...sim.positions].every(Number.isFinite));assert.deepEqual(sim.positions.slice((sim.ny-1)*sim.nx*3),pins);
 let stretch=0;for(const[a,b,l]of sim.links){const k=a*3,m=b*3;stretch=Math.max(stretch,Math.hypot(...[0,1,2].map(c=>sim.positions[k+c]-sim.positions[m+c]))/l)}assert.ok(stretch<1.25,`stretch ${stretch}`);assert.equal(sim.active,false);
});
test('the wall collision plane prevents the yarn shell entering plaster',()=>{const sim=new HangingPhysics(),i=sim.index(.4,.4),j=i*3;sim.hold(.4,.4,[sim.positions[j],.08,sim.positions[j+2]]);for(let n=0;n<60;n++)sim.advance(1/90);for(let k=1;k<sim.positions.length;k+=3)assert.ok(sim.positions[k]<=.017001);});

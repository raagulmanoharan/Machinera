import test from 'node:test';
import assert from 'node:assert/strict';
import {StreamPhysics} from './stream-physics.js';
test('stream enters above frame, contacts floor, and stays finite while feeding',()=>{
 const sim=new StreamPhysics();const top=sim.positions.slice(0,sim.nx*3);
 for(let i=0;i<180;i++){sim.setLength(6.2+1.35*Math.min(1,i/120));sim.feed=1;sim.advance(1/90);}
 assert.deepEqual(sim.positions.slice(0,sim.nx*3),top);
 assert.ok(sim.length>7.5);let floorNodes=0;for(let i=0;i<sim.positions.length;i+=3){assert.ok(Number.isFinite(sim.positions[i]+sim.positions[i+1]+sim.positions[i+2]));assert.ok(sim.positions[i+2]>=.0249);assert.ok(sim.positions[i+1]<=.01201);if(sim.positions[i+2]<.12)floorNodes++;}
 assert.ok(floorNodes>100,'old cloth gathers at the floor');
});
test('touching a floor fold moves the cloth without crossing the floor',()=>{
 const sim=new StreamPhysics();sim.hold(.5,.84,[.15,-1.6,.28]);for(let i=0;i<60;i++)sim.advance(1/90);const index=sim.grab.index*3;assert.ok(sim.positions[index+2]>.15);sim.move([.3,-1.6,-1]);for(let i=0;i<30;i++)sim.advance(1/90);assert.ok(sim.positions[index+2]>=.0249);sim.release();for(let i=0;i<60;i++)sim.advance(1/90);assert.ok(sim.positions.every(Number.isFinite));
});
test('long sessions bound the simulation grid and visible length',()=>{const sim=new StreamPhysics();const p=sim.positions;for(let i=0;i<30;i++)sim.setLength(6+i);assert.equal(sim.positions,p);assert.equal(sim.length,14);assert.equal(sim.positions.length,19*137*3);});

test('floor folds go to sleep instead of rendering tiny constraint jitter forever',()=>{const sim=new StreamPhysics();for(let i=0;i<1800&&sim.active;i++)sim.advance(1/90);assert.equal(sim.active,false);sim.hold(.5,.7,[.1,-.8,.25]);assert.equal(sim.active,true);});

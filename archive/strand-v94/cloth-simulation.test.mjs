import assert from 'node:assert/strict';
import test from 'node:test';
import { ClothSimulation } from './cloth-simulation.js';
test('a local tug deforms cloth while both camera attachment edges remain fixed',()=>{
 const cloth=new ClothSimulation();const initial=cloth.positions.slice();
 cloth.hold(.45,.5,[.2,-1,.3]);for(let i=0;i<30;i++)cloth.advance(1/60);
 assert.ok(cloth.positions.some((value,i)=>Math.abs(value-initial[i])>.01));
 for(let i=0;i<cloth.pinned.length;i++)if(cloth.pinned[i])for(let c=0;c<3;c++)assert.ok(Math.abs(cloth.positions[i*3+c]-cloth.rest[i*3+c])<1e-7);
 cloth.release();for(let i=0;i<1000;i++)cloth.advance(1/60);
 assert.ok(cloth.positions.every(Number.isFinite));assert.equal(cloth.active,false);
 for(const [a,b,length] of cloth.constraints){const distance=Math.hypot(...[0,1,2].map(c=>cloth.positions[a*3+c]-cloth.positions[b*3+c]));assert.ok(distance/length<1.5,'bounded constraint stretch');}
});
test('a tap launches a local ripple without moving the pinned rows',()=>{
 const cloth=new ClothSimulation();const initial=cloth.positions.slice();cloth.impulse(.5,.4);for(let i=0;i<20;i++)cloth.advance(1/60);
 assert.ok(cloth.positions.some((value,i)=>Math.abs(value-initial[i])>.001));
 for(let i=0;i<cloth.pinned.length;i++)if(cloth.pinned[i])for(let c=0;c<3;c++)assert.ok(Math.abs(cloth.positions[i*3+c]-cloth.rest[i*3+c])<1e-7);
});

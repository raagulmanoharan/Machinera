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
test('long sessions bound the simulation grid and visible length',()=>{const sim=new StreamPhysics();const p=sim.positions;for(let i=0;i<30;i++)sim.setLength(6+i);assert.equal(sim.positions,p);assert.equal(sim.length,14);assert.ok(sim.positions.length<=19*137*3);});

test('floor folds go to sleep instead of rendering tiny constraint jitter forever',()=>{const sim=new StreamPhysics();for(let i=0;i<1800&&sim.active;i++)sim.advance(1/90);assert.equal(sim.active,false);sim.hold(.5,.7,[.1,-.8,.25]);assert.equal(sim.active,true);});

test('feed constraints preserve actual sheet lengths instead of shortening floor folds',()=>{const s=new StreamPhysics();for(let i=0;i<s.a.length;i++){const a=s.a[i],b=s.b[i],expected=Math.hypot((a%s.nx-b%s.nx)*s.width/(s.nx-1),(Math.floor(a/s.nx)-Math.floor(b/s.nx))*s.length/(s.ny-1));assert.ok(Math.abs(s.lengths[i]-expected)<1e-6);}});
test('feeding inserts material above existing particles without replacing the strip',()=>{const s=new StreamPhysics(),old=s.positions.slice(),before=s.length,delta=.3;s.setLength(before+delta);const y=60,x=9,source=(y/(s.ny-1)*s.length-delta)/before*(s.ny-1),a=Math.floor(source),b=a+1,t=source-a;for(let c=0;c<3;c++)assert.ok(Math.abs(s.positions[(y*s.nx+x)*3+c]-(old[(a*s.nx+x)*3+c]*(1-t)+old[(b*s.nx+x)*3+c]*t))<1e-6);});

test('a floor particle is separated from a nonlocal cloth triangle',async()=>{const {separateFoldSurfaces}=await import('./stream-contact.js');const sim=new StreamPhysics({nx:3,ny:10});for(let i=0;i<30;i++)sim.positions.set([100+i,100,5],i*3);sim.positions.set([-.1,-1,.1],3*3);sim.positions.set([.1,-1,.1],4*3);sim.positions.set([-.1,-1.2,.1],6*3);sim.positions.set([-.05,-1.05,.105],25*3);sim.previous.set(sim.positions);sim.previous[25*3+2]=.13;separateFoldSurfaces(sim);assert.ok(sim.positions[25*3+2]>.1051);assert.ok(sim.positions[3*3+2]>=.025);});

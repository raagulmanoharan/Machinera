import test from 'node:test';
import assert from 'node:assert/strict';
import {Worker} from 'node:worker_threads';
import {once} from 'node:events';
import {StreamPhysics} from './stream-physics.js';
import {findClothIntersections} from './stream-intersections.js';
test('worker publishes finite collision-free moving snapshots with recycled buffers',async()=>{
 const url=new URL('./stream-simulation-worker.js',import.meta.url).href;
 const w=new Worker(`const {parentPort}=require('node:worker_threads');globalThis.self={postMessage:(...args)=>parentPort.postMessage(...args)};import(${JSON.stringify(url)}).then(()=>parentPort.on('message',data=>self.onmessage({data})));`,{eval:true});
 const seed=new StreamPhysics({length:12.95});let movement=0;
 try{let next=once(w,'message');w.postMessage({type:'init',nx:seed.nx,ny:seed.ny,length:seed.length,positions:seed.positions,previous:seed.previous,active:true,feed:0});assert.equal((await next)[0].type,'ready');
 for(let frame=0;frame<160;frame++){
  const commands=frame===0?[{type:'hold',u:.5,v:.75,target:[.2,-1.2,.5]}]:frame===120?[{type:'release'}]:frame<120?[{type:'move',target:[.3*Math.sin(frame*.07),-1.2,.3]}]:[];
  next=once(w,'message');w.postMessage({type:'tick',dt:1/60,length:seed.length,feed:0,commands});const [m]=await next;assert.equal(m.type,'state',m.message);const p=new Float32Array(m.buffer);assert.ok(p.every(Number.isFinite));assert.equal(findClothIntersections(p,seed.nx,seed.ny).length,0);const probe=seed.index(.5,.75)*3+2;movement+=Math.abs(p[probe]-seed.positions[probe]);w.postMessage({type:'recycle',buffer:m.buffer},[m.buffer]);
 }
 assert.ok(movement>1,'safe publication must not freeze the cloth');
 }finally{await w.terminate();}
});

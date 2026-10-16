import {StreamPhysics} from './stream-physics.js?v=54';
import {acceptClothPose,loadCollisionWasm} from './stream-intersections.js?v=54';
let sim,buffers=[],accepted,stepPrevious,collisionBackend='javascript';
self.onmessage=async({data:m})=>{
 try{
  if(m.type==='init'){
   collisionBackend=await loadCollisionWasm(new URL('./wasm/cloth-collision.wasm?v=53',import.meta.url));
   sim=new StreamPhysics({nx:m.nx,ny:m.ny,length:m.length});sim.positions.set(m.positions);sim.previous.set(m.previous);sim.floorField=m.floorField;sim.renderSafe=sim.positions.slice();sim.active=m.active;sim.feed=m.feed;accepted=sim.positions.slice();stepPrevious=sim.positions.slice();buffers=[new ArrayBuffer(accepted.byteLength),new ArrayBuffer(accepted.byteLength)];self.postMessage({type:'ready',collisionBackend});return;
  }
  if(m.type==='recycle'){buffers.push(m.buffer);return;}
  if(m.type!=='tick')return;
  const started=performance.now();for(const c of m.commands)if(c.type==='reseed'){const fresh=new StreamPhysics({nx:sim.nx,ny:sim.ny,length:c.length});fresh.positions.set(c.positions);fresh.previous.set(c.positions);fresh.renderSafe=c.positions.slice();fresh.endAnchor=c.endAnchor;fresh.floorField=c.floorField;sim=fresh;accepted.set(c.positions);stepPrevious.set(c.positions);}
  sim.feed=m.feed;sim.setLength(m.length);if(m.visibleRows)sim.setViewportRows(m.visibleRows);
  for(const c of m.commands){if(c.type==='hold')sim.hold(c.u,c.v,c.target);else if(c.type==='move')sim.move(c.target);else if(c.type==='release')sim.release();else if(c.type==='impulse')sim.impulse(c.u,c.v,c.amount);}
  // Keep integrator velocity history separate from published render snapshots.
  sim.accumulator+=sim.active?Math.min(m.dt,.05):0;
  while(sim.active&&sim.accumulator>=1/90){stepPrevious.set(sim.positions);sim.step();sim.accumulator-=1/90;}
  const physicsMs=performance.now()-started,guardStart=performance.now();
  const alpha=sim.active?Math.min(1,sim.accumulator*90):1;
  for(let i=0;i<accepted.length;i++)accepted[i]=sim.active?stepPrevious[i]+(sim.positions[i]-stepPrevious[i])*alpha:sim.positions[i];
  // Validate every published interpolated pose in the worker; never interpolate
  // unchecked snapshots on the UI thread or queue historical touch targets.
  if(!acceptClothPose(sim,accepted)){stepPrevious.set(accepted);}
  const buffer=buffers.pop();if(!buffer)throw Error('Simulation buffer pool exhausted');new Float32Array(buffer).set(accepted);
  self.postMessage({type:'state',buffer,collisionBackend,length:sim.length,active:sim.active,physicsMs,guardMs:performance.now()-guardStart,blocked:sim.blockedPoses??0,sleepingRows:sim.rowSleeping.reduce((a,b)=>a+b,0)},[buffer]);
 }catch(error){self.postMessage({type:'error',message:error.message});}
};

import assert from 'node:assert/strict';
import {StreamCloth} from './stream-cloth.js';
import {StraightSpan} from './straight-span.js';
const sim=new StraightSpan(),flat=sim.positions.slice();
const cloth={sim,group:{rotation:{},position:{set(){}}},viewportMask:new Uint8Array(sim.ny),upload(){},setTurn:StreamCloth.prototype.setTurn};
StreamCloth.prototype.setFlipProgress.call(cloth,.35);
assert.ok(sim.positions[0]>0,'Top band has already passed its half-turn midpoint');
const bottom=(sim.ny-1)*sim.nx*3;
assert.equal(sim.positions[bottom],flat[bottom],'Bottom band waits for the travelling turn');
assert.ok(sim.positions.some((v,i)=>i%3===1&&Math.abs(v+.19)>.2),'Middle bands lift into the helix');
StreamCloth.prototype.setFlipProgress.call(cloth,1);
assert.deepEqual(sim.positions,flat,'Completed turn restores flat geometry');
assert.equal(cloth.group.rotation.z,Math.PI);
StreamCloth.prototype.setFlipProgress.call(cloth,.35,true);
cloth.setTurn(0);
assert.deepEqual(sim.positions,flat,'Interrupted reverse turn resets flat');
assert.equal(cloth.turnTwist,false);
console.log('Staggered horizontal bands turn in order and reset flat');

for(const fromBack of [false,true])for(const progress of [.1,.3,.5,.7,.9]){
 StreamCloth.prototype.setFlipProgress.call(cloth,progress,fromBack);
 let previous=fromBack?0:Math.PI;
 for(let y=0;y<sim.ny;y++){const i=y*sim.nx*3,angle=Math.atan2((sim.positions[i+1]+.19)/(-sim.width/2),sim.positions[i]/(-sim.width/2));
  const a=angle<-.000001?angle+2*Math.PI:Math.max(0,angle);
  if(fromBack)assert.ok(a>=previous-1e-5,'Reverse also starts at top');
  else assert.ok(a<=previous+1e-5,'Bottom cannot lead the top');
  previous=a;
 }
}
cloth.setTurn(0);

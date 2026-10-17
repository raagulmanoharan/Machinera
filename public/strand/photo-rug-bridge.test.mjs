import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bridgePose,createPrintProgressReader} from './photo-rug-bridge.js';
test('photo and camera share one pace with no gap between floors',()=>{
 let previous=-1;
 for(let i=0;i<=200;i++){
  const p=bridgePose(i/200,844,659);
  assert.ok(Math.abs(p.roomY+p.pan-844)<1e-8);
  assert.ok(Math.abs(p.photoY-p.pan-p.screenPhotoY)<1e-8);
  assert.ok(Math.abs(p.screenPhotoY-p.pan)<1e-8);
  assert.ok(p.screenPhotoY>=previous);previous=p.screenPhotoY;
 }
 assert.equal(bridgePose(0,844,659).photoY,0);
 assert.equal(bridgePose(1,844,659).roomY,0);
});
test('navigation without a photo keeps the image fixed in its floor',()=>{
 const p=bridgePose(.5,844,659,false);
 assert.equal(p.photoY,0);assert.equal(p.screenPhotoY,-p.pan);
});

test('pan matches actual material displacement, stalls with feed and arrives during printing',()=>{
 const print={time:0,duration:4,hold:true},read=createPrintProgressReader(()=>print);assert.equal(read(),0);assert.equal(print.duration,8);assert.equal(print.hold,false);
 const feed=t=>t*t*(3-2*t),end=feed(.68);
 for(let i=0;i<100;i++)assert.equal(read(),0);
 for(let t=.02;t<.68;t+=.02){print.time=t*8;const pose=bridgePose(read(),844,659);assert.ok(Math.abs(pose.pan/844-feed(t)/end)<1e-6,'Camera and material share displacement and acceleration');const held=read();assert.equal(read(),held,'No wall clock drift');}
 print.time=8*.68;assert.equal(read(),1);assert.ok(print.time<print.duration,'Printing continues after arrival');assert.equal(createPrintProgressReader(()=>null)(),1);
 const running={time:1,duration:4,hold:true},resume=createPrintProgressReader(()=>running);assert.equal(resume(),0);assert.equal(running.time/running.duration,.25,'Preserve existing printed length');
});

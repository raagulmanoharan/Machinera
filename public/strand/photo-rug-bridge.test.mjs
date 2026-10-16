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

test('pan follows actual printing, preserves existing length and cannot outrun a stalled feed',()=>{
 const print={time:1.65,duration:4},fraction=print.time/print.duration,read=createPrintProgressReader(()=>print);
 assert.equal(read(),0);assert.equal(print.time/print.duration,fraction);
 const start=print.time;assert.ok(Math.abs(print.duration-start-3.6)<1e-10);
 for(let i=0;i<100;i++)assert.equal(read(),0,'Wall-clock ticks cannot advance a stalled cloth');
 print.time=start+.9;assert.ok(Math.abs(read()-.25)<1e-10);
 print.time=start+2.7;assert.ok(Math.abs(read()-.75)<1e-10);
 print.time=print.duration+.01;assert.equal(read(),1);
 assert.equal(createPrintProgressReader(()=>null)(),1);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bridgePose} from './photo-rug-bridge.js';
test('photo and camera share one pace with no gap between floors',()=>{
 let previous=-1;
 for(let i=0;i<=200;i++){
  const p=bridgePose(i/200,844,659);
  assert.ok(Math.abs(p.roomY+p.pan-844)<1e-8);
  assert.ok(Math.abs(p.photoY-p.pan-p.screenPhotoY)<1e-8);
  assert.ok(Math.abs(p.screenPhotoY/659-p.pan/844)<1e-8);
  assert.ok(p.screenPhotoY>=previous);previous=p.screenPhotoY;
 }
 assert.equal(bridgePose(0,844,659).photoY,0);
 assert.equal(bridgePose(1,844,659).roomY,0);
});
test('navigation without a photo keeps the image fixed in its floor',()=>{
 const p=bridgePose(.5,844,659,false);
 assert.equal(p.photoY,0);assert.equal(p.screenPhotoY,-p.pan);
});

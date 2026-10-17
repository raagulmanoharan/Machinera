import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bridgePose,createPrintProgressReader,photoScanRows,colourScanRows} from './photo-rug-bridge.js';
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

test('scan traverses the full image in alternating directions',()=>{const rows=photoScanRows(390,660,()=>.5);assert.equal(rows.length,60);assert.ok(rows[0].y===5.5);assert.ok(rows.at(-1).y===654.5);for(const [i,row]of rows.entries()){assert.equal(row.reverse,i%2===1);assert.ok(row.dots.every(x=>x>=5.5&&x<=384.5));assert.ok(row.dots.length>=6);}});

test('scan spacing equals dot diameter and dots form adjacent clusters',()=>{const rows=photoScanRows(390,660,()=>.5);for(let i=1;i<rows.length;i++)assert.equal(rows[i].y-rows[i-1].y,11);for(const row of rows){for(let i=0;i<row.dots.length;i+=4){assert.equal(row.dots[i+1]-row.dots[i],11.5);assert.equal(row.dots[i+2]-row.dots[i+1],11.5);assert.equal(row.dots[i+3]-row.dots[i+2],11.5);}}});

test('coloured clusters follow the major image regions',()=>{const palette=[{rgb:[230,40,20]},{rgb:[20,50,220]}],labels=Uint8Array.from({length:96*96},(_,i)=>i%96<48?0:1),rows=colourScanRows(390,390,{width:96,height:96,aspect:1,labels},palette,()=>.5);for(const row of rows){for(let i=0;i<row.dots.length;i++)assert.deepEqual(row.colours[i],palette[row.dots[i]<195?0:1].rgb);}});

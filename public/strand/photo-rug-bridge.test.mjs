import {test} from 'node:test';
import {rugLandingProgress} from './carpet-scroll.js';
import assert from 'node:assert/strict';
import {bridgePose,photoHandoffPose,createPrintProgressReader,photoScanRows,colourScanRows} from './photo-rug-bridge.js';
test('photo and camera share one pace with no gap between floors',()=>{
 let previous=-1;
 for(let i=0;i<=200;i++){
  const p=bridgePose(i/200,844,659);
  assert.ok(Math.abs(p.roomY+p.pan-844)<1e-8);
  assert.ok(Math.abs(p.photoY-p.pan-p.screenPhotoY)<1e-8);
  if(p.progress>=.2)assert.equal(p.photoY,185,'Full photo reaches bottom before the camera pans');
 }
 assert.equal(bridgePose(0,844,659).photoY,0);
 assert.equal(bridgePose(1,844,659).roomY,0);
});
test('navigation without a photo keeps the image fixed in its floor',()=>{
 const p=bridgePose(.5,844,659,false);
 assert.equal(p.photoY,0);assert.equal(p.screenPhotoY,-p.pan);
});

test('pan matches actual material displacement, stalls with feed and finishes with printing',()=>{
 const print={time:0,duration:4,hold:true},read=createPrintProgressReader(()=>print);assert.equal(read(),0);assert.equal(print.duration,8);assert.equal(print.hold,false);
 const feed=t=>t*t*(3-2*t),end=feed(1);
 for(let i=0;i<100;i++)assert.equal(read(),0);
 for(let t=.02;t<1;t+=.02){print.time=t*8;const pose=bridgePose(read(),844,659);const x=Math.max(0,Math.min(1,(feed(t)/end-.2)/.8)),pan=x*x*x*(x*(x*6-15)+10);assert.ok(Math.abs(pose.pan/844-pan)<1e-6,'Camera follows material after the footer overlap');const held=read();assert.equal(read(),held,'No wall clock drift');}
 print.time=8*.68;assert.ok(read()<1,'Pan remains active while printing');print.time=8;assert.equal(read(),1);assert.equal(print.time,print.duration,'Camera and printing finish together');assert.equal(createPrintProgressReader(()=>null)(),1);
 const running={time:1,duration:4,hold:true},resume=createPrintProgressReader(()=>running);assert.equal(resume(),0);assert.equal(running.time/running.duration,.25,'Preserve existing printed length');
});

test('scan traverses the full image in alternating directions',()=>{const rows=photoScanRows(390,660,()=>.5);assert.equal(rows.length,60);assert.ok(rows[0].y===5.5);assert.ok(rows.at(-1).y===654.5);for(const [i,row]of rows.entries()){assert.equal(row.reverse,i%2===1);assert.ok(row.dots.every(x=>x>=5.5&&x<=384.5));assert.ok(row.dots.length>=6);}});

test('scan spacing equals dot diameter and dots form adjacent clusters',()=>{const rows=photoScanRows(390,660,()=>.5);for(let i=1;i<rows.length;i++)assert.equal(rows[i].y-rows[i-1].y,11);for(const row of rows){for(let i=0;i<row.dots.length;i+=4){assert.equal(row.dots[i+1]-row.dots[i],11);assert.equal(row.dots[i+2]-row.dots[i+1],11);assert.equal(row.dots[i+3]-row.dots[i+2],11);}}});

test('coloured clusters follow the major image regions',()=>{const palette=[{rgb:[230,40,20]},{rgb:[20,50,220]}],labels=Uint8Array.from({length:96*96},(_,i)=>i%96<48?0:1),rows=colourScanRows(390,390,{width:96,height:96,aspect:1,labels},palette,()=>.5);for(const row of rows){for(let i=0;i<row.dots.length;i++)assert.deepEqual(row.colours[i],palette[row.dots[i]<195?0:1].rgb);}});

test('narrow colour regions do not spill clusters into neighbouring pixels',()=>{const palette=[{rgb:[80,75,70]},{rgb:[240,30,20]}],labels=new Uint8Array(96*96);for(let y=0;y<96;y++)labels[y*96+48]=1;const rows=colourScanRows(390,390,{width:96,height:96,aspect:1,labels},palette,()=>.5);for(const row of rows)for(const x of row.dots)assert.ok(x+5.5<=48/96*390||x-5.5>=49/96*390);});
test('scan dots use the source colour at their position, not a promoted palette accent',()=>{const palette=[{rgb:[80,75,70]}],labels=new Uint8Array(96*96),colours=new Uint8Array(96*96*3);for(let y=0;y<96;y++)for(let x=0;x<96;x++)colours.set(x<48?[110,85,65]:[55,100,50],(y*96+x)*3);const rows=colourScanRows(390,390,{width:96,height:96,aspect:1,labels,colours},palette,()=>.5);for(const row of rows)for(let i=0;i<row.dots.length;i++)assert.deepEqual(row.colours[i],row.dots[i]<195?[110,85,65]:[55,100,50]);});

test('photo covers the camera footer before the loom pan starts',()=>{const p=bridgePose(.3,844,659);assert.equal(p.pan,0);assert.ok(p.screenPhotoY>0);assert.ok(p.screenPhotoY<185);const end=bridgePose(1,844,659);assert.equal(end.screenPhotoY,-659);});

test('full-size photo remains joined to the rug throughout the pan',()=>{
 for(let i=0;i<=1000;i++){
  const t=i/1000,p=bridgePose(t,844,659),photo=photoHandoffPose(t,844,659,506);
  assert.equal(photo.x,0);assert.equal(photo.scaleX,1);assert.equal(photo.scaleY,1);
  if(p.progress>=.2){
   const photoBottom=photo.y-p.pan+659,rugTop=p.roomY+169*rugLandingProgress(p.progress);
   assert.ok(Math.abs(photoBottom-rugTop)<1e-8,'No gap between the photo and growing rug');
  }else assert.equal(p.pan,0,'Camera waits until the photo reaches the bottom');
 }
});

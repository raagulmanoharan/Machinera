import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bridgePose,photoHandoffPose,createPrintProgressReader,photoScanRows,colourScanRows} from './photo-rug-bridge.js';
test('one clock carries the photo through the slot and settles the loom before printing ends',()=>{
 for(const [height,photoHeight,rugTop] of [[844,667,169],[664,514,133],[932,736,186]]){
  let previous={pan:0,photoY:0};
  for(let i=0;i<=1000;i++){
   const t=i/1000,p=bridgePose(t,height,photoHeight,true,rugTop);
   assert.ok(p.pan>=previous.pan-1e-8&&p.photoY>=previous.photoY-1e-8,'No reversal or jump');
   assert.ok(Math.abs(p.slotY-(p.screenPhotoY+photoHeight))<1e-7,'Photo bottom remains attached to slot');
   if(t>=.16&&t<=.9)assert.ok(Math.abs(p.roomY+rugTop-p.slotY)<1e-7,'Rug origin touches the same slot');
   if(t>=.6)assert.equal(p.roomY,0,'Loom remains stationary while printing completes and slot retracts');
   previous=p;
  }
  assert.ok(bridgePose(.14,height,photoHeight,true,rugTop).pan>0,'Camera starts before photo feed has fully stopped');
  assert.ok(Math.abs(bridgePose(1,height,photoHeight,true,rugTop).slotY+12)<1e-7);
 }
});
test('print clock stalls with submitted frames and releases held printing for the shared timeline',()=>{
 const print={time:0,duration:4,hold:true},read=createPrintProgressReader(()=>print);
 assert.equal(read(),0);assert.equal(print.duration,5.4);assert.equal(print.handoff,true);assert.equal(print.hold,false);
 for(let i=0;i<10;i++)assert.equal(read(),0);
 print.time=2.7;assert.equal(read(),.5);print.time=5.4;assert.equal(read(),1);
 assert.equal(createPrintProgressReader(()=>null)(),1);
});

test('scan traverses the full image in alternating directions',()=>{const rows=photoScanRows(390,660,()=>.5);assert.equal(rows.length,60);assert.ok(rows[0].y===5.5);assert.ok(rows.at(-1).y===654.5);for(const [i,row]of rows.entries()){assert.equal(row.reverse,i%2===1);assert.ok(row.dots.every(x=>x>=5.5&&x<=384.5));assert.ok(row.dots.length>=6);}});

test('scan spacing equals dot diameter and dots form adjacent clusters',()=>{const rows=photoScanRows(390,660,()=>.5);for(let i=1;i<rows.length;i++)assert.equal(rows[i].y-rows[i-1].y,11);for(const row of rows){for(let i=0;i<row.dots.length;i+=4){assert.equal(row.dots[i+1]-row.dots[i],11);assert.equal(row.dots[i+2]-row.dots[i+1],11);assert.equal(row.dots[i+3]-row.dots[i+2],11);}}});

test('coloured clusters follow the major image regions',()=>{const palette=[{rgb:[230,40,20]},{rgb:[20,50,220]}],labels=Uint8Array.from({length:96*96},(_,i)=>i%96<48?0:1),rows=colourScanRows(390,390,{width:96,height:96,aspect:1,labels},palette,()=>.5);for(const row of rows){for(let i=0;i<row.dots.length;i++)assert.deepEqual(row.colours[i],palette[row.dots[i]<195?0:1].rgb);}});

test('narrow colour regions do not spill clusters into neighbouring pixels',()=>{const palette=[{rgb:[80,75,70]},{rgb:[240,30,20]}],labels=new Uint8Array(96*96);for(let y=0;y<96;y++)labels[y*96+48]=1;const rows=colourScanRows(390,390,{width:96,height:96,aspect:1,labels},palette,()=>.5);for(const row of rows)for(const x of row.dots)assert.ok(x+5.5<=48/96*390||x-5.5>=49/96*390);});
test('scan dots use the source colour at their position, not a promoted palette accent',()=>{const palette=[{rgb:[80,75,70]}],labels=new Uint8Array(96*96),colours=new Uint8Array(96*96*3);for(let y=0;y<96;y++)for(let x=0;x<96;x++)colours.set(x<48?[110,85,65]:[55,100,50],(y*96+x)*3);const rows=colourScanRows(390,390,{width:96,height:96,aspect:1,labels,colours},palette,()=>.5);for(const row of rows)for(let i=0;i<row.dots.length;i++)assert.deepEqual(row.colours[i],row.dots[i]<195?[110,85,65]:[55,100,50]);});

test('photo keeps its size, dots layer and opacity throughout the handoff',()=>{
 for(let i=0;i<=1000;i++){const p=photoHandoffPose(i/1000,844,667);assert.equal(p.x,0);assert.equal(p.scaleX,1);assert.equal(p.scaleY,1);assert.equal(p.opacity,1);}
});

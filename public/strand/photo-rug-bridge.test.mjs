import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mosaicCells,revealPose} from './photo-rug-bridge.js';
test('cell colours are area means from their own source region in row-major order',()=>{
 const pixels=new Uint8ClampedArray(4*4*4);
 for(let y=0;y<4;y++)for(let x=0;x<4;x++)pixels.set([x<2?40:220,y<2?80:180,20,255],(y*4+x)*4);
 pixels.set([200,80,20,255],0);
 const cells=mosaicCells(pixels,4,4,64,64);
 assert.deepEqual(cells.map(c=>c.rgb),[[80,80,20],[220,80,20],[40,180,20],[220,180,20]]);
 assert.deepEqual(cells.map(c=>[c.x,c.y]),[[0,0],[32,0],[0,32],[32,32]]);
});
test('transparent pixels do not contaminate block averages',()=>{
 assert.deepEqual(mosaicCells(new Uint8ClampedArray([0,0,0,0,80,120,200,255]),2,1,32,32)[0].rgb,[80,120,200]);
});
test('square cells cover the full portrait and landscape image with only the final row clipped',()=>{
 for(const [w,h]of [[390,667],[390,514],[844,280]]){
  const source=new Uint8ClampedArray(100*100*4).fill(255),cells=mosaicCells(source,100,100,w,h),columns=Math.round(w/32),size=w/columns;
  assert.equal(cells.length,columns*Math.ceil(h/size));
  assert.ok(Math.abs(cells.reduce((sum,c)=>sum+c.width*c.height,0)-w*h)<1e-6);
  for(const c of cells){assert.equal(c.width,size);assert.ok(c.height<=size);assert.deepEqual(c.rgb,[255,255,255]);}
 }
});
test('photo exits upward, rug rises afterward and the camera never pans',()=>{
 let previous={photoY:0,rugY:844,uiOpacity:1};
 for(let i=0;i<=1000;i++){
  const t=i/1000,p=revealPose(t,844,667);
  assert.ok(p.photoY<=previous.photoY+1e-8&&p.rugY<=previous.rugY+1e-8);
  assert.ok(p.uiOpacity<=previous.uiOpacity+1e-8);
  if(t<.38)assert.equal(p.rugY,844,'Rug waits until the mosaic is leaving');
  if(t>=.5)assert.ok(p.photoY+667<0,'Mosaic is completely above the viewport');
  previous=p;
 }
 assert.deepEqual(revealPose(0,844,667),{photoY:-0,rugY:844,uiOpacity:1});
 assert.deepEqual(revealPose(1,844,667),{photoY:-691,rugY:0,uiOpacity:0});
});

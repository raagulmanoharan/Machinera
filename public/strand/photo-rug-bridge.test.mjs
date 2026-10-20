import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mosaicCells,mosaicSequence,revealPose} from './photo-rug-bridge.js';
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
test('uniform cells fit every image edge without a partial final row',()=>{
 for(const [w,h]of [[390,667],[390,514],[844,280]]){
  const source=new Uint8ClampedArray(100*100*4).fill(255),cells=mosaicCells(source,100,100,w,h),columns=Math.round(w/32),size=w/columns;
  const rows=Math.round(h/size);assert.equal(cells.length,columns*rows);
  assert.ok(Math.abs(cells.reduce((sum,c)=>sum+c.width*c.height,0)-w*h)<1e-6);
  assert.ok(Math.abs(cells.at(-1).y+cells.at(-1).height-h)<1e-7);
  for(const c of cells){assert.equal(c.width,size);assert.equal(c.height,h/rows);assert.ok(Math.abs(c.width/c.height-1)<.08);assert.deepEqual(c.rgb,[255,255,255]);}
 }
});
test('random reveal covers each cell once, and actual yarn matches exit last',()=>{
 const cells=Array.from({length:40},(_,i)=>({rgb:[i*6,70,200-i*4]}));let seed=42;
 const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const plan=mosaicSequence(cells,[{rgb:cells[7].rgb},{rgb:cells[28].rgb}],random);
 assert.equal(new Set(plan.map(p=>p.reveal)).size,40);
 assert.deepEqual(plan.flatMap((p,i)=>p.chosen?[i]:[]),[7,28]);
 assert.notDeepEqual(plan.map(p=>p.reveal),[...plan.map(p=>p.reveal)].sort((a,b)=>a-b));
 const others=plan.filter(p=>!p.chosen),chosen=plan.filter(p=>p.chosen);
 assert.ok(Math.max(...others.map(p=>p.exit+p.duration))<Math.min(...chosen.map(p=>p.exit)),'Every unselected block clears before yarn blocks dissolve');
 assert.ok(new Set(others.map(p=>p.exit)).size>30,'Exits are staggered rather than simultaneous');
 assert.ok(Math.max(...plan.map(p=>p.exit+p.duration))<6300);
});
test('rug starts fully above the screen and slides down smoothly into its final position',()=>{
 let previous=-844;
 for(let i=0;i<=1000;i++){const p=revealPose(i/1000,844);assert.ok(p.rugY>=previous-1e-8);assert.equal(p.photoY,0);assert.equal(p.uiOpacity,0);previous=p.rugY;}
 assert.equal(revealPose(0,844).rugY,-844);assert.ok(Math.abs(revealPose(1,844).rugY)<1e-9);
});

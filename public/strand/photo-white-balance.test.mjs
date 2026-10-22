import test from 'node:test';import assert from 'node:assert/strict';
import {estimateWhiteBalance,balanceColour} from './photo-white-balance.js';
import {createColourDistribution,accumulateColours,result} from './photo-colours.js';
const sample=rgb=>({rgb,weight:100});
const spread=rgb=>Math.max(...rgb)-Math.min(...rgb);
test('warm and cool illumination are corrected using neutral references',()=>{
 for(const colours of [[[145,132,112],[205,188,163],[235,216,190]],[[112,132,145],[163,188,205],[190,216,235]]]){
  const gains=estimateWhiteBalance(colours.map(sample));assert.notDeepEqual(gains,[1,1,1]);
  for(const rgb of colours)assert.ok(spread(balanceColour(rgb,gains))<spread(rgb)*.5);
  assert.ok(gains.every(g=>g>=.7875&&g<=1.2975),'Channel correction remains bounded');
 }
});
test('neutral images, saturated warm subjects, darkness and flat beige are not neutralised',()=>{
 for(const colours of [[[135,135,135],[190,190,190],[235,235,235]],[[200,80,30],[240,145,50]],[[30,27,22],[70,60,45]],[[205,188,163]]])assert.deepEqual(estimateWhiteBalance(colours.map(sample)),[1,1,1]);
 assert.deepEqual(estimateWhiteBalance([]),[1,1,1]);
});
test('colour accents remain colourful and output stays inside the display gamut',()=>{
 const gains=estimateWhiteBalance([[145,132,112],[205,188,163],[235,216,190]].map(sample));
 for(const rgb of [[230,50,25],[30,160,55],[35,75,190]]){
  const corrected=balanceColour(rgb,gains);assert.equal(corrected.indexOf(Math.max(...corrected)),rgb.indexOf(Math.max(...rgb)));assert.ok(corrected.every(v=>Number.isFinite(v)&&v>=0&&v<=255));
 }
});
test('palette and woven-photo map use the same correction without changing pixel weights',()=>{
 const width=96,height=96,d=createColourDistribution(width,height),pixels=new Uint8ClampedArray(width*height*4),colours=[[145,132,112],[205,188,163],[235,216,190],[35,75,190]];
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)pixels.set([...colours[Math.floor(x/24)],255],(y*width+x)*4);
 accumulateColours(d,pixels,{x:0,y:0,width});const before=d.values.slice(),r=result(d,width,height);
 const tiled=createColourDistribution(width,height);for(let y=0;y<height;y++)accumulateColours(tiled,pixels.subarray(y*width*4,(y+1)*width*4),{x:0,y,width});assert.deepEqual(result(tiled,width,height),r,'Tiled worker and fallback share the same correction');
 assert.notDeepEqual(r.whiteBalance,[1,1,1]);assert.deepEqual(d.values,before,'Source statistics remain immutable');
 assert.equal(r.palette.reduce((n,c)=>n+c.weight,0),width*height);
 for(let i=0;i<4;i++)assert.deepEqual(Array.from(r.scanMap.colours.slice(i*24*3,i*24*3+3)),balanceColour(colours[i],r.whiteBalance).map(Math.round));
});

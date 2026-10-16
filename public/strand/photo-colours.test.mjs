import test from 'node:test';import assert from 'node:assert/strict';
import {createColourDistribution,accumulateColours,distributionPalette} from './photo-colours.js';
const extract=pixels=>distributionPalette(accumulateColours(createColourDistribution(),pixels));
test('weighted colours preserve proportions independently of image layout',()=>{
 const a=new Uint8ClampedArray([240,20,20,255,240,20,20,255,20,30,230,255,240,20,20,255]),b=new Uint8ClampedArray([240,20,20,255,20,30,230,255,240,20,20,255,240,20,20,255]);const p=extract(a);assert.deepEqual(p,extract(b));assert.deepEqual(p.map(c=>c.share),[.75,.25]);
});
test('transparent pixels are counted but do not add a dye',()=>{
 const d=accumulateColours(createColourDistribution(),new Uint8ClampedArray([10,130,90,255,0,0,0,0]));assert.equal(d.pixels,2);assert.deepEqual(distributionPalette(d).map(c=>c.rgb),[[10,130,90]]);
});
test('tiled accumulation matches every-pixel whole-buffer processing',()=>{
 const pixels=new Uint8ClampedArray(10501*4);for(let n=0;n<10501;n++){pixels[n*4]=n%256;pixels[n*4+1]=n*13%256;pixels[n*4+2]=n*7%256;pixels[n*4+3]=n%9===0?128:255;}
 const d=createColourDistribution();for(let i=0;i<pixels.length;i+=1024)accumulateColours(d,pixels.subarray(i,i+1024));assert.equal(d.pixels,10501);assert.deepEqual(distributionPalette(d),extract(pixels));
});
test('one late pixel still affects the colour distribution',()=>{
 const d=createColourDistribution();accumulateColours(d,new Uint8ClampedArray([17,89,129,255]));const before=d.values.slice();accumulateColours(d,new Uint8ClampedArray([250,2,3,255]));assert.equal(d.pixels,2);assert.notDeepEqual(d.values,before);
});

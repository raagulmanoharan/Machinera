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

test('spatial study distinguishes photos with identical colour weights',async()=>{
 const {result}=await import('./photo-colours.js');const make=reverse=>{const d=createColourDistribution(48,48);for(let y=0;y<48;y++){const row=new Uint8ClampedArray(48*4);for(let x=0;x<48;x++)row.set((x<24)!==reverse?[240,20,20,255]:[20,30,230,255],x*4);accumulateColours(d,row,{x:0,y,width:48});}return result(d,48,48);};
 const a=make(false),b=make(true);assert.deepEqual(a.palette,b.palette);assert.notDeepEqual(a.composition.indices,b.composition.indices);assert.equal(a.processedPixelCount,2304);
 const {RugArchive}=await import('./rug-archive.js');const archive=new RugArchive(),entry=archive.append(a);assert.deepEqual(archive.weftColour(entry,entry.end,.1),archive.weftColour(entry,entry.end,.9));const saved=entry.baked.slice();a.composition.indices.fill(0);archive.append(b);assert.deepEqual(entry.baked,saved);assert.equal(entry.composition,undefined);assert.ok(entry.design.layout);
});

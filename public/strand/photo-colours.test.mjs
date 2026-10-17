import test from 'node:test';import assert from 'node:assert/strict';
import {createColourDistribution,accumulateColours,distributionPalette} from './photo-colours.js';
const extract=pixels=>distributionPalette(accumulateColours(createColourDistribution(),pixels));
test('weighted colours preserve proportions independently of image layout',()=>{
 const a=new Uint8ClampedArray([240,20,20,255,240,20,20,255,20,30,230,255,240,20,20,255]),b=new Uint8ClampedArray([240,20,20,255,20,30,230,255,240,20,20,255,240,20,20,255]);const p=extract(a);assert.deepEqual(p,extract(b));assert.deepEqual(p.map(c=>c.sourceShare),[.75,.25]);
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

test('light and contrast use original pixels before dye merging',async()=>{
 const {result}=await import('./photo-colours.js');const d=createColourDistribution(2,1);accumulateColours(d,new Uint8ClampedArray([0,0,0,255,255,255,255,255]),{x:0,y:0,width:2});const r=result(d,2,1);assert.equal(r.analysis.brightness,.5);assert.equal(r.analysis.contrast,.5);assert.equal(r.composition,undefined);
});
test('complexity distinguishes a busy repeat from simple bands with the same palette',async()=>{
 const {result}=await import('./photo-colours.js');const make=busy=>{const d=createColourDistribution(96,96);for(let y=0;y<96;y++){const row=new Uint8ClampedArray(96*4);for(let x=0;x<96;x++)row.set((busy?(x+y)%2:x<48)?[240,20,20,255]:[20,30,230,255],x*4);accumulateColours(d,row,{x:0,y,width:96});}return result(d,96,96);};const a=make(false),b=make(true);assert.deepEqual(a.palette,b.palette);assert.ok(Math.abs(a.analysis.brightness-b.analysis.brightness)<1e-12);assert.ok(b.analysis.complexity>a.analysis.complexity+.5);assert.equal(b.processedPixelCount,9216);
});
test('tiled and whole scans yield identical light and complexity analysis',async()=>{
 const {result}=await import('./photo-colours.js');const w=96,h=48,bytes=Uint8ClampedArray.from({length:w*h*4},(_,i)=>i%4===3?255:(i*17)%256),a=createColourDistribution(w,h),b=createColourDistribution(w,h);accumulateColours(a,bytes,{x:0,y:0,width:w});for(let y=0;y<h;y++)accumulateColours(b,bytes.subarray(y*w*4,(y+1)*w*4),{x:0,y,width:w});assert.deepEqual(result(a,w,h).analysis,result(b,w,h).analysis);
});

test('scan labels reuse spatial analysis and identify dominant regions',async()=>{const {result}=await import('./photo-colours.js');const d=createColourDistribution(96,96);for(let y=0;y<96;y++){const row=new Uint8ClampedArray(384);for(let x=0;x<96;x++)row.set(x<48?[230,40,20,255]:[20,50,220,255],x*4);accumulateColours(d,row,{x:0,y,width:96});}const r=result(d,96,96);assert.equal(r.scanMap.width,96);assert.equal(r.scanMap.height,96);assert.ok(r.scanMap.labels.byteLength<=15360);for(const x of [12,80])assert.deepEqual(r.palette[r.scanMap.labels[x]].rgb,x<48?[230,40,20]:[20,50,220]);});

test('similar-colour sampling averages pixel noise while preserving broad colour areas and opacity weights',()=>{const width=192,height=192,d=createColourDistribution(width,height);for(let y=0;y<height;y++){const row=new Uint8ClampedArray(width*4);for(let x=0;x<width;x++){const jitter=(x+y)%2?12:-12,base=x<144?[210,50,30]:[30,80,190];row.set([...base.map(v=>v+jitter),255],x*4);}accumulateColours(d,row,{x:0,y,width});}const p=distributionPalette(d);assert.deepEqual(p.map(c=>c.rgb),[[210,50,30],[30,80,190]]);assert.deepEqual(p.map(c=>c.sourceShare),[.75,.25]);assert.equal(p.reduce((n,c)=>n+c.weight,0),width*height);assert.equal(d.pixels,width*height);});

test('small distinct accents survive colour averaging without inflated weight',async()=>{const {result}=await import('./photo-colours.js');const width=192,height=192,d=createColourDistribution(width,height);let red=0;for(let y=0;y<height;y++){const row=new Uint8ClampedArray(width*4);for(let x=0;x<width;x++){const accent=x%10===0&&y%2===0;row.set(accent?[240,30,20,255]:[80,75,70,255],x*4);if(accent)red++;}accumulateColours(d,row,{x:0,y,width});}const p=distributionPalette(d),accent=p.find(c=>c.rgb[0]>200&&c.rgb[1]<60);assert.ok(accent,'Small red accents must not disappear into patch averages');assert.equal(accent.weight,red);const r=result(d,width,height),index=r.palette.findIndex(c=>c.rgb[0]>200&&c.rgb[1]<60);assert.notDeepEqual(Array.from(r.scanMap.colours.slice(0,3)),r.palette[index].rgb,'Scan colours remain locally sampled, regardless of the nearest dye label');assert.deepEqual(Array.from(r.scanMap.colours.slice(0,3)),[120,64,58],'Scan shows the actual four-pixel patch mean');assert.equal(p.reduce((n,c)=>n+c.weight,0),width*height);});

test('fine multicolour detail never averages distinct hues into grey or brown',()=>{const width=768,height=768,d=createColourDistribution(width,height),colours=[[240,30,20],[20,220,40],[20,40,240]];for(let y=0;y<height;y++){const row=new Uint8ClampedArray(width*4);for(let x=0;x<width;x++)row.set([...colours[(Math.floor(x/2)+Math.floor(y/2))%3],255],x*4);accumulateColours(d,row,{x:0,y,width});}const palette=distributionPalette(d);assert.equal(palette.length,3);for(const rgb of colours){const dye=palette.find(c=>c.rgb.every((v,i)=>v===rgb[i]));assert.ok(dye,'True hue lost to spatial averaging');assert.equal(dye.sourceShare,1/3);assert.ok(Math.abs(dye.share-1/3)<.00001);}assert.equal(palette.reduce((n,c)=>n+c.weight,0),width*height);});

test('a small green region survives extraction and is woven as the same source dye',async()=>{
 const {result}=await import('./photo-colours.js'),{RugArchive}=await import('./rug-archive.js'),width=100,height=100,d=createColourDistribution(width,height),colours=[[195,125,40],[215,208,185],[70,150,205],[60,62,58],[55,105,45]];
 for(let y=0;y<height;y++){const row=new Uint8ClampedArray(width*4);for(let x=0;x<width;x++)row.set([...colours[x<54?0:x<78?1:x<88?2:x<96?3:4],255],x*4);accumulateColours(d,row,{x:0,y,width});}
 const prepared=result(d,width,height),green=prepared.palette.find(c=>c.rgb[1]>c.rgb[0]+30&&c.rgb[1]>c.rgb[2]+30);assert.deepEqual(green.rgb,colours[4]);assert.equal(green.sourceShare,.04);const entry=new RugArchive().append(prepared);let visible=0;for(let i=0;i<entry.baked.length;i+=4)if(green.rgb.every((c,k)=>entry.baked[i+k]===c))visible++;assert.ok(visible>0,'Green must reach visible woven crossings');
});


test('a small centred subject gets more influence without inventing colours or discarding the room',async()=>{
 const {result}=await import('./photo-colours.js');const width=160,height=160,background=[115,95,70],subject=[30,110,190],pixels=new Uint8ClampedArray(width*height*4);let count=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const inside=x>=56&&x<104&&y>=48&&y<112;if(inside)count++;pixels.set([...(inside?subject:background),255],(y*width+x)*4);}
 const whole=createColourDistribution(width,height),tiled=createColourDistribution(width,height);accumulateColours(whole,pixels);for(let y=0;y<height;y++)accumulateColours(tiled,pixels.subarray(y*width*4,(y+1)*width*4),{x:0,y,width});const a=result(whole,width,height),b=result(tiled,width,height);assert.deepEqual(a.palette,b.palette);const dye=a.palette.find(c=>c.rgb.join()===subject.join()),room=a.palette.find(c=>c.rgb.join()===background.join());assert.equal(dye.sourceShare,count/(width*height));assert.ok(dye.share>dye.sourceShare*2);assert.ok(room.share>.25,'Room remains part of the memory');assert.equal(a.palette.reduce((n,c)=>n+c.weight,0),width*height);assert.ok(Math.abs(a.palette.reduce((n,c)=>n+c.share,0)-1)<1e-12);
});


test('focal weighting still keeps small peripheral lights in a night photo',()=>{const w=100,h=100,bytes=new Uint8ClampedArray(w*h*4),d=createColourDistribution(w,h);for(let i=0;i<w*h;i++)bytes.set([...(i<9910?[14,18,19]:i<9970?[230,152,62]:[220,235,240]),255],i*4);accumulateColours(d,bytes);const palette=distributionPalette(d);assert.equal(palette.length,3);for(const rgb of [[14,18,19],[230,152,62],[220,235,240]])assert.ok(palette.some(c=>c.rgb.join()===rgb.join()));assert.equal(palette.reduce((n,c)=>n+c.weight,0),10000);});

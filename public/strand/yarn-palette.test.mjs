import test from 'node:test';import assert from 'node:assert/strict';
import {mergeDyeColours,allocateYarns} from './yarn-palette.js';
import {RugArchive} from './rug-archive.js';import {warpOver} from './weave-library.js';import {THREAD_PITCH,WARP_ENDS} from './yarn-structure.js';
test('similar shades merge into weighted dye lots while distinct hues and pixel mass survive',()=>{
 const p=mergeDyeColours([{rgb:[180,30,25],weight:60},{rgb:[200,40,35],weight:20},{rgb:[20,50,180],weight:20}]);assert.equal(p.length,2);assert.equal(p[0].weight,80);assert.equal(p[1].weight,20);assert.deepEqual(p[0].rgb,[185,33,28]);assert.equal(p.reduce((s,c)=>s+c.share,0),1);
});
test('dominant colour owns the correct number of complete yarns without rounding loss',()=>{
 const p=[{rgb:[200,30,20],share:.7},{rgb:[20,40,190],share:.2},{rgb:[230,200,30],share:.1}];for(const n of [64,101,159]){const c=allocateYarns(p,n);assert.equal(c.reduce((a,b)=>a+b,0),n);for(let i=0;i<c.length;i++)assert.ok(Math.abs(c[i]-p[i].share*n)<1);}
});
test('a real weave exposes its warp or weft yarn colour, never a blended gradient',()=>{
 const p=[{rgb:[190,30,20],weight:7,share:.7},{rgb:[20,40,180],weight:3,share:.3}],a=new RugArchive(),e=a.append({palette:p},3.8,3);assert.equal(e.warp.length,WARP_ENDS);assert.equal(e.weft.length,e.weftCounts.reduce((a,b)=>a+b,0));
 for(let pick=1;pick<150;pick++){const q=pick*THREAD_PITCH;if(q>=e.end)break;for(let end=0;end<WARP_ENDS;end++){const u=(end+.5)/WARP_ENDS,yarns=a.materialYarns(q,u),expected=warpOver(end,pick,3)?yarns.warp:yarns.weft;assert.deepEqual(a.sampleMaterial(q,u),expected);assert.ok(p.some(c=>c.rgb.join()===expected.join()));}}
 const warp=e.warp.slice(),weft=e.weft.slice(),bytes=e.baked.slice();a.append({palette:[{rgb:[20,170,40],share:1,weight:1}]},2.4,21);assert.deepEqual(e.warp,warp);assert.deepEqual(e.weft,weft);assert.deepEqual(e.baked,bytes);
});
import {createColourDistribution,accumulateColours,distributionPalette,result} from './photo-colours.js';
test('complete pixel scans produce dye lots with conserved opacity weight',()=>{
 const rgba=new Uint8ClampedArray([180,30,25,255,200,40,35,255,20,50,180,128,0,0,0,0]),d=accumulateColours(createColourDistribution(),rgba),p=distributionPalette(d),r=result(d,4,1,1024);assert.equal(r.kind,'yarn-dye-palette');assert.equal(r.processedPixelCount,4);assert.equal(r.strands,undefined,'active pipeline does not generate gradient strips');assert.ok(Math.abs(p.reduce((s,c)=>s+c.weight,0)-(2+128/255))<1e-10);assert.equal(p.length,2);
});

import {areDyeColoursDistinct} from './yarn-palette.js';
test('final rounded dye lots remain pairwise distinct after all weighted folds',()=>{
 let seed=741;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
 for(let n=0;n<100;n++){const input=Array.from({length:45},()=>({rgb:[0,0,0].map(()=>Math.floor(random()*256)),weight:1+Math.floor(random()*100)})),p=mergeDyeColours(input);
 assert.equal(p.reduce((s,c)=>s+c.weight,0),input.reduce((s,c)=>s+c.weight,0));assert.ok(Math.abs(p.reduce((s,c)=>s+c.share,0)-1)<1e-12);
 for(let i=0;i<p.length;i++)for(let j=i+1;j<p.length;j++)assert.ok(areDyeColoursDistinct(p[i].rgb,p[j].rgb),'rounded output dyes must be perceptually distinct');
 }
 const grey=mergeDyeColours([{rgb:[80,80,80],weight:3},{rgb:[82,82,82],weight:7}]);assert.equal(grey.length,1);assert.equal(grey[0].weight,10);
});

test('saturated primaries stay source-derived and transparent input cannot create brown fallback',()=>{
 for(const rgb of [[255,0,0],[0,255,0],[0,0,255],[0,255,255],[255,0,255]])assert.deepEqual(mergeDyeColours([{rgb,weight:100}])[0].rgb,rgb);
 assert.throws(()=>mergeDyeColours([]),/No opaque/);
});

test('night photos retain small warm and pale light accents without changing source weights',()=>{
 const p=mergeDyeColours([{rgb:[14,18,19],weight:9910},{rgb:[230,152,62],weight:60},{rgb:[220,235,240],weight:30}]);
 assert.equal(p.length,3,'Sub-4% lights must not disappear into black');
 assert.deepEqual(p.map(c=>c.weight),[9910,60,30]);assert.deepEqual(p.map(c=>c.rgb),[[14,18,19],[230,152,62],[220,235,240]]);
 assert.equal(p.reduce((n,c)=>n+c.weight,0),10000);
 const black=mergeDyeColours([{rgb:[0,0,0],weight:10000}]);assert.equal(black.length,1,'A truly black image must not acquire invented colours');
});

test('muted navy is distinct from warm brown and neutral grey',()=>{assert.ok(areDyeColoursDistinct([50,55,75],[90,70,55]));assert.ok(areDyeColoursDistinct([50,55,75],[60,60,60]));});
test('several upholstery shades cannot crowd out muted blue and red',()=>{const colours=[[[111,79,61],2123],[[53,35,27],2059],[[165,134,111],1832],[[87,87,86],1445],[[205,181,151],987],[[215,213,196],259],[[217,25,41],238],[[249,249,244],201],[[177,60,81],129],[[102,106,126],119],[[50,41,45],111],[[68,64,80],33]],palette=mergeDyeColours(colours.map(([rgb,weight])=>({rgb,weight})));assert.ok(palette.some(c=>c.rgb[2]>c.rgb[0]+10&&c.rgb[2]>c.rgb[1]+10),'Muted shirt blue must remain a yarn');assert.ok(palette.some(c=>c.rgb[0]>c.rgb[1]*2),'Red rug/shirt accents must remain');assert.equal(palette.reduce((n,c)=>n+c.weight,0),colours.reduce((n,c)=>n+c[1],0));assert.ok(palette.length<=5);});

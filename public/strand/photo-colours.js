import {mergeDyeColours} from './yarn-palette.js?v=182';
// Every decoded source pixel is visited. Colour-space bins retain weighted means;
// Similar-colour samples are averaged after hue separation, never across a
// mixed-colour image patch. The spatial grid only guides complexity and scanning.
const BIN_COUNT=32768;
const LINEAR=Float64Array.from({length:256},(_,v)=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});
export function createColourDistribution(width=0,height=0){const spatial=width&&height?new Float64Array(96*Math.min(160,Math.max(24,Math.round(96*height/width)))*4):null;return{width,height,lightSum:0,lightSquared:0,luminanceHistogram:new Float64Array(64),spatial,values:new Float64Array(BIN_COUNT*4),pixels:0,opaqueWeight:0};}
export function accumulateColours(distribution,rgba,tile=null){const values=distribution.values;for(let i=0;i<rgba.length;i+=4){distribution.pixels++;const a=rgba[i+3]/255;if(!a)continue;const r=rgba[i],g=rgba[i+1],b=rgba[i+2],offset=((r>>3)*1024+(g>>3)*32+(b>>3))*4;values[offset]+=r*a;values[offset+1]+=g*a;values[offset+2]+=b*a;values[offset+3]+=a;distribution.opaqueWeight+=a;const light=.2126*LINEAR[r]+.7152*LINEAR[g]+.0722*LINEAR[b];distribution.lightSum+=light*a;distribution.lightSquared+=light*light*a;distribution.luminanceHistogram[Math.min(63,Math.floor(light*64))]+=a;if(distribution.spatial&&tile){const pixel=i/4,px=tile.x+pixel%tile.width,py=tile.y+Math.floor(pixel/tile.width),rows=distribution.spatial.length/384,cell=(Math.min(rows-1,Math.floor(py/distribution.height*rows))*96+Math.min(95,Math.floor(px/distribution.width*96)))*4;distribution.spatial[cell]+=r*a;distribution.spatial[cell+1]+=g*a;distribution.spatial[cell+2]+=b*a;distribution.spatial[cell+3]+=a;}}return distribution;}
export function imageDimensions(image){return[image.naturalWidth||image.videoWidth||image.width,image.naturalHeight||image.videoHeight||image.height];}
export function isPreparedPalette(value){return(value?.kind==='yarn-dye-palette'&&Array.isArray(value.palette));}
function colourSamples(values){const samples=[];for(let i=0;i<values.length;i+=4)if(values[i+3])samples.push({rgb:[values[i]/values[i+3],values[i+1]/values[i+3],values[i+2]/values[i+3]],weight:values[i+3]});return samples;}
export function distributionPalette(distribution){
 // Bin within a narrow RGB range, then merge perceptually similar dye lots.
 // Every source pixel contributes its full opacity weight. Spatial patch means
 // must never become palette colours: red + green detail is not brown yarn.
 return mergeDyeColours(colourSamples(distribution.values));
}

export function distributionFeatures(d){
 const weight=d.opaqueWeight||1,brightness=d.lightSum/weight,contrast=Math.sqrt(Math.max(0,d.lightSquared/weight-brightness**2));
 let entropy=0;for(const count of d.luminanceHistogram){if(count){const p=count/weight;entropy-=p*Math.log2(p)/6;}}
 let edges=0,pairs=0;const v=d.spatial;
 if(v){const rows=v.length/384;for(let y=0;y<rows;y++)for(let x=0;x<96;x++){const i=(y*96+x)*4;if(!v[i+3])continue;for(const j of [x?i-4:-1,y?i-384:-1]){if(j<0||!v[j+3])continue;const delta=Math.hypot(...[0,1,2].map(k=>(v[i+k]/v[i+3]-v[j+k]/v[j+3])/255))/Math.sqrt(3);edges+=Math.min(1,Math.max(0,(delta-.035)/.22));pairs++;}}}
 const edgeDensity=pairs?edges/pairs:0,complexity=Math.min(1,edgeDensity*.85+entropy*.15);
 return Object.freeze({version:1,brightness,contrast,tonalEntropy:entropy,edgeDensity,complexity});
}
export function result(distribution,width,height){const palette=distributionPalette(distribution),v=distribution.spatial;let scanMap=null;if(v){const labels=new Uint8Array(v.length/4),colours=new Uint8Array(labels.length*3);for(let i=0;i<labels.length;i++){const at=i*4,w=v[at+3]||1,rgb=[v[at]/w,v[at+1]/w,v[at+2]/w];colours.set(rgb.map(Math.round),i*3);let nearest=0,best=Infinity;for(let k=0;k<palette.length;k++){const d=rgb.reduce((n,c,j)=>n+(c-palette[k].rgb[j])**2,0);if(d<best){best=d;nearest=k;}}labels[i]=nearest;}scanMap={width:96,height:labels.length/96,aspect:width/height,labels,colours};}return{analysis:distributionFeatures(distribution),kind:'yarn-dye-palette',palette,scanMap,sourceWidth:width,sourceHeight:height,sourcePixelCount:width*height,processedPixelCount:distribution.pixels,pixelsProcessed:distribution.pixels,opaqueWeight:distribution.opaqueWeight,colourBinBits:5};}
function tileContext(){const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;return canvas.getContext('2d',{willReadFrequently:true});}
function scanTile(ctx,image,x,y,width,height,distribution){ctx.clearRect(0,0,256,256);ctx.drawImage(image,x,y,width,height,0,0,width,height);accumulateColours(distribution,ctx.getImageData(0,0,width,height).data,{x,y,width});}
// Bounded 256² readbacks avoid a second full-resolution RGBA allocation. No resize,
// cropping, stride sampling, random sampling or texture-size cap is applied.
export async function preparePhotoPalette(image,{onProgress}={}){if(isPreparedPalette(image))return image;const[width,height]=imageDimensions(image);if(!(width>0&&height>0))throw new Error('Photo has no decoded pixels');if(typeof Worker!=='undefined'&&typeof createImageBitmap==='function'&&typeof OffscreenCanvas!=='undefined'){let worker,bitmap;try{bitmap=await createImageBitmap(image);worker=new Worker(new URL('./photo-colours-worker.js?v=193',import.meta.url),{type:'module'});return await new Promise((resolve,reject)=>{worker.onmessage=({data})=>{if(data.progress!==undefined){onProgress?.(data.progress);return;}data.error?reject(new Error(data.error)):resolve(data);};worker.onerror=event=>reject(new Error(event.message||'Photo worker failed'));worker.postMessage({bitmap},[bitmap]);});}catch{/* Safari capability failures use the same complete tiled scan below. */}finally{worker?.terminate();bitmap?.close();}}
 const ctx=tileContext(),distribution=createColourDistribution(width,height);for(let y=0;y<height;y+=256){for(let x=0;x<width;x+=256)scanTile(ctx,image,x,y,Math.min(256,width-x),Math.min(256,height-y),distribution);onProgress?.(Math.min(1,(y+256)/height));await new Promise(resolve=>setTimeout(resolve,0));}return result(distribution,width,height);}

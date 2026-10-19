// Derived crossing colours, not a saved source photo. The existing loom supplies
// the geometry and over-under draft. A centred cover crop prevents stretching.
export function photoYarns(scanMap,palette,width,height){
 if(!scanMap||!palette?.length)return null;
 const colours=new Uint8Array(width*height*3);
 const sourceAspect=scanMap.aspect??scanMap.width/scanMap.height,targetAspect=width/height,cropW=Math.min(1,targetAspect/sourceAspect),cropH=Math.min(1,sourceAspect/targetAspect);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const sx=Math.min(scanMap.width-1,Math.floor(((1-cropW)/2+(x+.5)/width*cropW)*scanMap.width)),sy=Math.min(scanMap.height-1,Math.floor(((1-cropH)/2+(y+.5)/height*cropH)*scanMap.height)),at=sy*scanMap.width+sx,i=y*width+x;
  const source=scanMap.colours?scanMap.colours.subarray(at*3,at*3+3):palette[scanMap.labels[at]].rgb;
  colours.set(source,i*3);
 }
 return{width,height,colours,aspectCorrect:true};
}
export function photoYarnColour(entry,u,local){
 const grid=entry.photoYarns;if(!grid)return null;
 let v=Math.max(0,Math.min(1,local/entry.length)),s=1-u;
 // Legacy backs stored the whole frame stretched. Correct its geometry using
 // saved source dimensions; lost source tones cannot be recovered retroactively.
 if(!grid.aspectCorrect){const sourceAspect=entry.metadata?.sourceWidth/entry.metadata?.sourceHeight,targetAspect=1.536/entry.length;if(Number.isFinite(sourceAspect)&&sourceAspect>0){const w=Math.min(1,targetAspect/sourceAspect),h=Math.min(1,sourceAspect/targetAspect);s=(1-w)/2+s*w;v=(1-h)/2+v*h;}}
 const x=Math.max(0,Math.min(grid.width-1,Math.floor(s*grid.width))),y=Math.max(0,Math.min(grid.height-1,Math.floor(v*grid.height))),at=y*grid.width+x;
 return grid.colours?grid.colours.subarray(at*3,at*3+3):entry.palette[grid.indices[at]].rgb;
}

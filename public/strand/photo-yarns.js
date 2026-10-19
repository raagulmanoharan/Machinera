// A small palette-index draft, never the source photograph. Each cell is one
// warp end × one weft pick; the existing loom still supplies every crossing.
export function photoYarns(scanMap,palette,width,height){
 if(!scanMap||!palette?.length)return null;
 const indices=new Uint8Array(width*height),errors=new Float32Array(width*height*3);
 const distance=(a,b)=>a.reduce((s,v,k)=>s+(v-b[k])**2,0);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const sx=Math.min(scanMap.width-1,Math.floor((x+.5)/width*scanMap.width)),sy=Math.min(scanMap.height-1,Math.floor((y+.5)/height*scanMap.height)),at=sy*scanMap.width+sx,i=y*width+x;
  const source=scanMap.colours?scanMap.colours.slice(at*3,at*3+3):palette[scanMap.labels[at]].rgb;
  const colour=Array.from(source,(v,k)=>v+errors[i*3+k]);let nearest=0;
  for(let k=1;k<palette.length;k++)if(distance(colour,palette[k].rgb)<distance(colour,palette[nearest].rgb))nearest=k;
  indices[i]=nearest;
  for(const [dx,dy,weight] of [[1,0,7/16],[-1,1,3/16],[0,1,5/16],[1,1,1/16]])if(x+dx>=0&&x+dx<width&&y+dy<height)for(let k=0;k<3;k++)errors[((y+dy)*width+x+dx)*3+k]+=(colour[k]-palette[nearest].rgb[k])*weight;
 }
 return{width,height,indices};
}
export function photoYarnColour(entry,u,local){
 const grid=entry.photoYarns;if(!grid)return null;
 // Turned over around its vertical axis, so pre-mirror the back's yarn map.
 const x=Math.max(0,Math.min(grid.width-1,Math.floor((1-u)*grid.width))),y=Math.max(0,Math.min(grid.height-1,Math.floor(local/entry.length*grid.height)));
 return entry.palette[grid.indices[y*grid.width+x]].rgb;
}

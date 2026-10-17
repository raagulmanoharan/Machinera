import {WARP_ENDS} from './yarn-structure.js?v=156';
export function postcardDetails(entry,index){const d=entry.plan.draft;return{number:String(index+1).padStart(2,'0'),weave:d.generated?`Symmetric ${d.shafts}-shaft weave`:d.name,yarns:`${entry.palette.length} new dyed yarns · ${WARP_ENDS} warp ends · ${entry.weft.length} weft picks`,palette:entry.palette.map(c=>({rgb:c.rgb.slice(),share:c.share}))};}
const colour=(rgb,k=1)=>`rgb(${rgb.map(v=>Math.max(0,Math.min(255,Math.round(v*k)))).join(',')})`;
function wrap(ctx,text,x,y,width,line=42){let row='';for(const word of text.split(' ')){const next=row?row+' '+word:word;if(row&&ctx.measureText(next).width>width){ctx.fillText(row,x,y);y+=line;row=word;}else row=next;}if(row)ctx.fillText(row,x,y);return y+line;}
export async function createMemoryPostcard({archive,entry,index,paper,renderThumbnail}){
 await document.fonts.load('34px "EB Garamond"').catch(()=>{});const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;const ctx=canvas.getContext('2d',{willReadFrequently:true}),details=postcardDetails(entry,index);ctx.fillStyle='#141414';ctx.fillRect(0,0,1080,1350);
 if(paper){try{const image=new Image();image.src=paper;await image.decode();const scale=Math.max(1080/image.width,1350/image.height);ctx.drawImage(image,(1080-image.width*scale)/2,(1350-image.height*scale)/2,image.width*scale,image.height*scale);}catch{}}
 const thumbnail=renderThumbnail(entry);ctx.drawImage(thumbnail,54,54,972,900);thumbnail.width=thumbnail.height=0;
 ctx.fillStyle='#ecebe5';ctx.font='400 34px "EB Garamond", Garamond, serif';ctx.textBaseline='alphabetic';ctx.fillText(`Memory ${details.number}`,54,1015);let y=wrap(ctx,details.weave,54,1063,972);y=wrap(ctx,details.yarns,54,y+6,972);
 const swatchY=Math.max(1170,y+8),gap=972/details.palette.length;details.palette.forEach((d,i)=>{ctx.fillStyle=colour(d.rgb);ctx.fillRect(54+i*gap,swatchY,Math.min(100,gap-16),22);ctx.fillStyle='#ecebe5';ctx.fillText(`${Math.round(d.share*100)}%`,54+i*gap,swatchY+64);});ctx.fillStyle='#ecebe5';ctx.fillText('MACHINERA',54,1296);
 // Fine monochrome paper/fibre grain, fixed to the exported image.
 const pixels=ctx.getImageData(0,0,1080,1350);let seed=(index+1)*982451653;for(let i=0;i<pixels.data.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const grain=((seed>>>24)/255-.5)*5;for(let c=0;c<3;c++)pixels.data[i+c]=Math.max(0,Math.min(255,pixels.data[i+c]+grain));}ctx.putImageData(pixels,0,0);
 const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Image export failed')),'image/png'));canvas.width=canvas.height=0;return{blob,filename:`machinera-memory-${details.number}.png`,details};
}

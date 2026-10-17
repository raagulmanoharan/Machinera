export function postcardDetails(entry,index){const d=entry.plan.draft;return{number:String(index+1).padStart(2,'0'),description:d.generated?'A mirrored geometric draft, formed one crossing at a time.':`A ${d.family} structure, formed by the rhythm of over-and-under threads.`,weave:d.generated?`Symmetric ${d.shafts}-shaft weave`:d.name};}
function wrap(ctx,text,x,y,width,line=42){let row='';for(const word of text.split(' ')){const next=row?row+' '+word:word;if(row&&ctx.measureText(next).width>width){ctx.fillText(row,x,y);y+=line;row=word;}else row=next;}if(row)ctx.fillText(row,x,y);return y+line;}
export async function createMemoryPostcard({entry,index,renderThumbnail}){
 await document.fonts.load('34px "EB Garamond"').catch(()=>{});const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1920;const ctx=canvas.getContext('2d',{willReadFrequently:true}),details=postcardDetails(entry,index);
 // One full-bleed render supplies the rug and the same uninterrupted paper.
 const thumbnail=renderThumbnail(entry);ctx.drawImage(thumbnail,0,0,1080,1920);thumbnail.width=thumbnail.height=0;
 ctx.fillStyle='#ecebe5';ctx.font='400 34px "EB Garamond", Garamond, serif';ctx.textBaseline='alphabetic';ctx.fillText(`Memory ${details.number}`,90,1530);let y=wrap(ctx,details.weave,90,1582,900);wrap(ctx,details.description,90,y+10,900);ctx.fillText('MACHINERA',90,1810);
 const pixels=ctx.getImageData(0,0,1080,1920);let seed=(index+1)*982451653;for(let i=0;i<pixels.data.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const grain=((seed>>>24)/255-.5)*5;for(let c=0;c<3;c++)pixels.data[i+c]=Math.max(0,Math.min(255,pixels.data[i+c]+grain));}ctx.putImageData(pixels,0,0);
 const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Image export failed')),'image/png'));canvas.width=canvas.height=0;return{blob,filename:`machinera-memory-${details.number}.png`,details};
}

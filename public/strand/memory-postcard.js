// A reproducible fingerprint of the saved construction, including colours and
// actual end/pick assignments. It identifies a design, not a random export.
function patternCode(entry){let hash=2166136261;const data=[entry.plan.draft.rows,entry.warp,entry.weft,entry.plan.motif?.map??[],entry.palette.map(c=>c.rgb)];for(const char of JSON.stringify(data))hash=Math.imul(hash^char.charCodeAt(0),16777619)>>>0;return hash.toString(16).padStart(8,'0').toUpperCase();}
export function postcardDetails(entry,index){
 const d=entry.plan.draft,m=entry.plan.motif,design=entry.plan.design,used=new Set([...entry.warp,...entry.weft,...(m?.map??[])]),family=(m?.family??design.style).replaceAll('-',' '),symmetry=m?'Mirrored on both axes':({both:'Mirrored on both axes',radial:'Half-turn symmetry',warp:'Side-to-side symmetry',weft:'Top-to-bottom symmetry'}[design.symmetry]??'');
 return{number:String(index+1).padStart(2,'0'),description:`${d.width} ends × ${d.height} picks per repeat · maximum float ${d.maxFloat} threads`,weave:d.generated?`Symmetric ${d.shafts}-shaft weave`:d.name,pattern:`${family[0].toUpperCase()+family.slice(1)} · ${symmetry.toLowerCase()}${m?` · ${m.columns} × ${m.rows} motifs · ${m.border}-thread border`:''}`,inventory:`${used.size} heavy yarn ${used.size===1?'colour':'colours'} · ${entry.warp.length} warp ends · ${entry.weft.length} weft picks`,code:patternCode(entry),draftId:entry.plan.id};
}
function wrap(ctx,text,x,y,width,line=42){let row='';for(const word of text.split(' ')){const next=row?row+' '+word:word;if(row&&ctx.measureText(next).width>width){ctx.fillText(row,x,y);y+=line;row=word;}else row=next;}if(row)ctx.fillText(row,x,y);return y+line;}
export async function createMemoryPostcard({entry,index,renderThumbnail}){
 await document.fonts.load('28px "EB Garamond"').catch(()=>{});const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1920;const ctx=canvas.getContext('2d',{willReadFrequently:true}),details=postcardDetails(entry,index);
 // One full-bleed render supplies the rug and the same uninterrupted paper.
 const thumbnail=renderThumbnail(entry),bounds=thumbnail.rugBounds??{left:150,right:930,bottom:1270};ctx.drawImage(thumbnail,0,0,1080,1920);thumbnail.width=thumbnail.height=0;
 ctx.fillStyle='#ecebe5';ctx.font='400 28px "EB Garamond", Garamond, serif';ctx.textBaseline='alphabetic';const x=bounds.left,width=bounds.right-x;let y=Math.max(1380,bounds.bottom+95);ctx.fillText(`Memory ${details.number}`,x,y);y=wrap(ctx,details.weave,x,y+42,width,34);y=wrap(ctx,details.pattern,x,y+6,width,34);y=wrap(ctx,details.description,x,y+6,width,34);y=wrap(ctx,details.inventory,x,y+6,width,34);ctx.fillText(`Pattern ${details.code}`,x,y+6);ctx.fillText('MACHINERA',x,1810);

 const pixels=ctx.getImageData(0,0,1080,1920);let seed=(index+1)*982451653;for(let i=0;i<pixels.data.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const grain=((seed>>>24)/255-.5)*5;for(let c=0;c<3;c++)pixels.data[i+c]=Math.max(0,Math.min(255,pixels.data[i+c]+grain));}ctx.putImageData(pixels,0,0);
 const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Image export failed')),'image/png'));canvas.width=canvas.height=0;return{blob,filename:`machinera-memory-${details.number}.png`,details};
}

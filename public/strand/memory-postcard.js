// A reproducible fingerprint of the saved construction, including colours and
// actual end/pick assignments. It identifies a design, not a random export.
function patternCode(entry){let hash=2166136261;const data=[entry.plan.draft.rows,entry.warp,entry.weft,entry.plan.motif?.map??[],entry.palette.map(c=>c.rgb)];for(const char of JSON.stringify(data))hash=Math.imul(hash^char.charCodeAt(0),16777619)>>>0;return hash.toString(16).padStart(8,'0').toUpperCase();}
export function postcardDetails(entry,index){
 const d=entry.plan.draft,m=entry.plan.motif,design=entry.plan.design,used=new Set([...entry.warp,...entry.weft,...(m?.map??[])]),family=(m?.family??design.style).replaceAll('-',' '),symmetry=m?'Mirrored on both axes':({both:'Mirrored on both axes',radial:'Half-turn symmetry',warp:'Side-to-side symmetry',weft:'Top-to-bottom symmetry'}[design.symmetry]??'');
 return{number:String(index+1).padStart(2,'0'),description:`${d.width} ends × ${d.height} picks per repeat · maximum float ${d.maxFloat} threads`,weave:d.generated?`Symmetric ${d.shafts}-shaft weave`:d.name,pattern:`${family[0].toUpperCase()+family.slice(1)} · ${symmetry.toLowerCase()}${m?` · ${m.columns} × ${m.rows} motifs · ${m.border}-thread border`:''}`,inventory:`${used.size} heavy yarn ${used.size===1?'colour':'colours'} · ${entry.warp.length} warp ends · ${entry.weft.length} weft picks`,code:patternCode(entry),draftId:entry.plan.id};
}
export function postcardLines(ctx,text,width){const rows=[];let row=[];for(const word of text.split(' ')){if(row.length&&ctx.measureText([...row,word].join(' ')).width>width){rows.push(row);row=[];}row.push(word);}if(row.length)rows.push(row);if(rows.length>1){const last=rows.at(-1),previous=rows.at(-2);while(previous.length>2&&(last.length<2||ctx.measureText(last.join(' ')).width<width*.3)){const word=previous.at(-1);if(ctx.measureText([word,...last].join(' ')).width>width)break;last.unshift(previous.pop());}}return rows.map(words=>words.join(' '));}
function wrap(ctx,text,x,y,width,line=34){for(const row of postcardLines(ctx,text,width)){ctx.fillText(row,x,y);y+=line;}return y;}
export async function createMemoryPostcard({entry,index,renderThumbnail}){
 await document.fonts.load('28px "EB Garamond"').catch(()=>{});const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1920;const ctx=canvas.getContext('2d',{willReadFrequently:true}),details=postcardDetails(entry,index);
 // One full-bleed render supplies the rug and the same uninterrupted paper.
 const thumbnail=renderThumbnail(entry),bounds=thumbnail.rugBounds??{left:150,right:930,bottom:1270};ctx.drawImage(thumbnail,0,0,1080,1920);thumbnail.width=thumbnail.height=0;
 const x=bounds.left,width=bounds.right-x;let y=Math.max(1410,bounds.bottom+140);
 ctx.fillStyle='#ecebe5';ctx.textBaseline='alphabetic';ctx.font='400 40px "EB Garamond", Garamond, serif';ctx.fillText(`Memory ${details.number}`,x,y);
 ctx.font='400 28px "EB Garamond", Garamond, serif';y=wrap(ctx,details.weave,x,y+46,width);ctx.fillStyle='#cccac3';y=wrap(ctx,details.pattern,x,y+8,width);y=wrap(ctx,details.description,x,y+8,width);wrap(ctx,details.inventory,x,y+8,width);
 // The rug starts 170px from the top; the footer ends 170px above the bottom.
 ctx.fillStyle='#ecebe5';ctx.fillText('MACHINERA',x,1742);ctx.fillStyle='#aaa9a3';ctx.textAlign='right';ctx.fillText(details.code,bounds.right,1742);ctx.textAlign='left';

 const pixels=ctx.getImageData(0,0,1080,1920);let seed=(index+1)*982451653;for(let i=0;i<pixels.data.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const grain=((seed>>>24)/255-.5)*8,px=(i/4)%1080,py=Math.floor(i/4320),outside=px<bounds.left-2||px>bounds.right+2||py<1440-bounds.bottom-2||py>bounds.bottom+2;for(let c=0;c<3;c++){const value=pixels.data[i+c];pixels.data[i+c]=Math.max(0,Math.min(255,(outside&&value<42?17+(value-17)*.25:value)+grain));}}ctx.putImageData(pixels,0,0);
 const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Image export failed')),'image/png'));canvas.width=canvas.height=0;return{blob,filename:`machinera-memory-${details.number}.png`,details};
}

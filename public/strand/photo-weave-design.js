// Colour statistics drive loom structure and complete yarn runs, never random pixels.
export function analyseDyes(palette){
 const luminance=rgb=>rgb.reduce((n,v,i)=>{v/=255;return n+[.2126,.7152,.0722][i]*(v<=.04045?v/12.92:((v+.055)/1.055)**2.4);},0);
 const light=palette.map(c=>luminance(c.rgb)),mean=light.reduce((n,v,i)=>n+v*palette[i].share,0);
 const contrast=Math.sqrt(light.reduce((n,v,i)=>n+(v-mean)**2*palette[i].share,0));
 const dominant=Math.max(...palette.map(c=>c.share)),entropy=-palette.reduce((n,c)=>n+(c.share?c.share*Math.log(c.share):0),0)/Math.log(Math.max(2,palette.length));
 const saturation=palette.reduce((n,c)=>n+(Math.max(...c.rgb)-Math.min(...c.rgb))/255*c.share,0);
 return {contrast,dominant,entropy,saturation,colours:palette.length};
}
export function deriveColourDesign(palette,layout=null){
 const m=analyseDyes(palette),medallion=m.dominant>.62&&m.colours>1;
 return {...m,layout,centreDye:layout?.centreDye,symmetry:medallion?'radial':'both',style:medallion?'medallion':layout?.orientation==='bands'?'stripes':layout?.orientation==='columns'?'columns':m.entropy>.88?'checks':m.contrast>.22?'point-repeat':'stripes',repeat:m.entropy>.9?3:2};
}
export function chooseLoomDraft(palette,candidates,library,layout=null){
 const m=analyseDyes(palette),targetFloat=2+Math.round(3*m.contrast+ m.saturation),targetScale=m.colours<=2?16:m.entropy>.9?8:12;
 // Balanced palettes favour interlocking motifs; dominant grounds favour nested
 // medallions. Within that family, match float length and repeat scale to contrast.
 const preferred=layout?.orientation==='bands'?'nested-squares':layout?.orientation==='columns'?'window-grid':m.dominant>.62?'nested-squares':m.colours===2?'diamond-rings':m.contrast>.28?'diamond-eye':m.entropy>.9?'stepped-chevron':'window-grid';
 const score=d=>(d.id===`geo-${preferred}`?0:3)+(d.family==='geometric'?0:4)+Math.abs(d.maxFloat-targetFloat)*.3+Math.abs(d.width-targetScale)/16;
 return candidates.reduce((best,i)=>score(library[i])<score(library[best])?i:best,candidates[0]);
}

// Keep only broad layout cues. No source pixel/region becomes a visible motif.
export function abstractPhotoLayout(composition){
 if(!composition)return null;
 const {width,height,indices}=composition;let across=0,down=0,centre=[];
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=y*width+x,c=indices[i];if(x&&c!==indices[i-1])across++;if(y&&c!==indices[i-width])down++;if(x>=width*.3&&x<width*.7&&y>=height*.3&&y<height*.7)centre[c]=(centre[c]||0)+1;}
 across/=Math.max(1,(width-1)*height);down/=Math.max(1,(height-1)*width);
 const centreDye=centre.length?centre.reduce((best,n,i)=>(n||0)>(centre[best]||0)?i:best,0):0;
 return Object.freeze({orientation:down>across*1.25?'bands':across>down*1.25?'columns':'balanced',complexity:Math.min(1,(across+down)*2),centreDye});
}

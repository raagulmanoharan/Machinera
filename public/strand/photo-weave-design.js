// Colour statistics drive loom structure and complete yarn runs, never random pixels.
export function analyseDyes(palette){
 const luminance=rgb=>rgb.reduce((n,v,i)=>{v/=255;return n+[.2126,.7152,.0722][i]*(v<=.04045?v/12.92:((v+.055)/1.055)**2.4);},0);
 const light=palette.map(c=>luminance(c.rgb)),mean=light.reduce((n,v,i)=>n+v*palette[i].share,0);
 const contrast=Math.sqrt(light.reduce((n,v,i)=>n+(v-mean)**2*palette[i].share,0));
 const dominant=Math.max(...palette.map(c=>c.share)),entropy=-palette.reduce((n,c)=>n+(c.share?c.share*Math.log(c.share):0),0)/Math.log(Math.max(2,palette.length));
 const saturation=palette.reduce((n,c)=>n+(Math.max(...c.rgb)-Math.min(...c.rgb))/255*c.share,0);
 return {brightness:mean,contrast,dominant,entropy,saturation,colours:palette.length};
}
export function deriveColourDesign(palette,analysis=null){
 const m=photoDesignMetrics(palette,analysis),medallion=m.dominant>.62&&m.colours>1;
 return {...m,symmetry:medallion?'radial':'both',style:medallion?'medallion':m.complexity>.35?'checks':m.contrast>.22?'point-repeat':'stripes',repeat:m.complexity>.55?3:m.brightness>.55&&m.complexity<.2?1:2};
}
export function chooseLoomDraft(palette,candidates,library,analysis=null){
 const m=photoDesignMetrics(palette,analysis),targetFloat=2+Math.round(3*m.contrast+ m.saturation),targetScale=m.colours<=2?16:m.entropy>.9?8:12;
 // Balanced palettes favour interlocking motifs; dominant grounds favour nested
 // medallions. Within that family, match float length and repeat scale to contrast.
 const preferred=analysis?(m.complexity>.55?'diamond-lattice':m.complexity>.28?(m.contrast>.22?'diamond-eye':'stepped-chevron'):m.brightness>.55?'window-grid':m.contrast>.25?'diamond-rings':'nested-squares'):(m.dominant>.62?'nested-squares':m.colours===2?'diamond-rings':m.contrast>.28?'diamond-eye':m.entropy>.9?'stepped-chevron':'window-grid');
 const score=d=>(d.id===`geo-${preferred}`?0:3)+(d.family==='geometric'?0:4)+Math.abs(d.maxFloat-targetFloat)*.3+Math.abs(d.width-targetScale)/16;
 return candidates.reduce((best,i)=>score(library[i])<score(library[best])?i:best,candidates[0]);
}


export function photoDesignMetrics(palette,analysis){
 const m=analyseDyes(palette);if(!analysis)return {...m,complexity:m.entropy*.3};
 const unit=(v,fallback)=>Number.isFinite(v)?Math.max(0,Math.min(1,v)):fallback;
 return {...m,brightness:unit(analysis.brightness,m.brightness),contrast:unit(analysis.contrast,m.contrast),complexity:unit(analysis.complexity,m.entropy*.3)};
}

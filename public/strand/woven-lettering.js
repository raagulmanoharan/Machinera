import * as T from 'three';
import {WARP_ENDS,THREAD_PITCH} from './yarn-structure.js?v=156';
export const wovenTextGLSL=`
uniform sampler2D streamTextMask;
uniform vec2 streamTextSpan;
uniform vec3 streamTextColour,streamTextLight;
uniform float streamTextEnabled,streamTextBack;
vec3 wovenTextDye(vec3 dye,float u,float q){
 vec2 at=vec2(streamTextBack>.5?1.-u:u,(streamTextSpan.x-q)/max(.001,streamTextSpan.y));
 if(streamTextEnabled<.5||at.x<0.||at.x>1.||at.y<0.||at.y>1.)return dye;
 vec3 ink=dot(dye,vec3(.2126,.7152,.0722))>.22?streamTextColour:streamTextLight;
 return mix(dye,ink,step(.5,texture2D(streamTextMask,at).r));
}
`;
export function letteringMetrics(text,width,height,measure){
 const lines=(text.text||'').split('\n'),size=text.h*height/(Math.max(1,lines.length)*1.15);
 const natural=Math.max(1,...lines.map(line=>measure(line,size))),stretch=Math.min(text.stretch??1,text.w*width/natural);
 return{lines,size,stretch};
}
export function makeLetteringMask(text,width,height){
 const rgba=new Uint8Array(width*height*4);if(!text?.text)return rgba;
 const scale=4,canvas=document.createElement('canvas');canvas.width=width*scale;canvas.height=height*scale;const ctx=canvas.getContext('2d',{willReadFrequently:true});
 const metrics=letteringMetrics(text,width,height,(line,size)=>{ctx.font=`500 ${size*scale}px "EB Garamond",Garamond,serif`;return ctx.measureText(line).width/scale;});
 ctx.fillStyle='#fff';ctx.textBaseline='top';ctx.font=`500 ${metrics.size*scale}px "EB Garamond",Garamond,serif`;ctx.save();ctx.beginPath();ctx.rect(text.x*width*scale,text.y*height*scale,text.w*width*scale,text.h*height*scale);ctx.clip();ctx.translate(text.x*width*scale,text.y*height*scale);ctx.scale(metrics.stretch,1);
 metrics.lines.forEach((line,i)=>ctx.fillText(line,0,i*metrics.size*1.15*scale));ctx.restore();
 const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){let coverage=0;for(let dy=0;dy<scale;dy++)for(let dx=0;dx<scale;dx++)coverage+=pixels[((y*scale+dy)*canvas.width+x*scale+dx)*4+3];const value=coverage/(scale*scale)>48?255:0;rgba.set([value,value,value,255],(y*width+x)*4);}
 return rgba;
}
export function initialiseLettering(cloth){
 const texture=new T.DataTexture(new Uint8Array(4),1,1);texture.minFilter=texture.magFilter=T.NearestFilter;texture.generateMipmaps=false;texture.needsUpdate=true;
 Object.assign(cloth.story,{streamTextMask:{value:texture},streamTextSpan:{value:new T.Vector2(0,1)},streamTextColour:{value:new T.Color()},streamTextLight:{value:new T.Color()},streamTextEnabled:{value:0},streamTextBack:{value:0}});
}
export function refreshLettering(cloth){
 const entry=cloth.archive.entries.at(-1),side=cloth.backSide?'back':'front',text=entry?.lettering?.[side],enabled=!!text?.text;
 cloth.story.streamTextEnabled.value=+enabled;cloth.story.streamTextBack.value=+cloth.backSide;if(!entry)return;
 cloth.story.streamTextSpan.value.set(entry.end,entry.length);if(!enabled)return;
 const width=WARP_ENDS,height=Math.max(1,Math.round(entry.length/THREAD_PITCH)),data=makeLetteringMask(text,width,height);let texture=cloth.story.streamTextMask.value;
 if(texture.image.width!==width||texture.image.height!==height){texture.dispose();texture=new T.DataTexture(data,width,height);texture.minFilter=texture.magFilter=T.NearestFilter;texture.generateMipmaps=false;cloth.story.streamTextMask.value=texture;}else texture.image.data=data;
 texture.needsUpdate=true;
 const light=c=>c.rgb[0]*.2126+c.rgb[1]*.7152+c.rgb[2]*.0722;
 const dark=entry.palette.reduce((a,b)=>light(b)<light(a)?b:a),bright=entry.palette.reduce((a,b)=>light(b)>light(a)?b:a);
 const darkRGB=light(dark)>100?dark.rgb.map(v=>v*.2):dark.rgb,lightRGB=light(bright)<160?bright.rgb.map(v=>v+(255-v)*.8):bright.rgb;
 for(const [uniform,rgb] of [['streamTextColour',darkRGB],['streamTextLight',lightRGB]])cloth.story[uniform].value.setRGB(rgb[0]/255,rgb[1]/255,rgb[2]/255,T.SRGBColorSpace);
}

import {generatePhotoDraft,draftCrossing} from './photo-draft.js?v=120';
// One raster bake on first open: real lift decisions, elliptical yarn sections,
// directional shading and deterministic fibre noise. No animation or WebGL.
export function drawWeaveThumbnail(canvas){
 const width=640,height=400,pitch=16,ctx=canvas.getContext('2d'),image=ctx.createImageData(width,height),pixels=image.data;
 const draft=generatePhotoDraft([{rgb:[235,235,231],share:.55},{rgb:[24,24,24],share:.45}],{brightness:.5,contrast:.4,complexity:.65});
 const noise=(x,y)=>{let n=Math.imul(x+1,374761393)^Math.imul(y+1,668265263);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967295;};
 const crossing=(x,y)=>draftCrossing(draft,x,y)?1:-1,smooth=t=>(1-Math.cos(t*Math.PI))*.5;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const u=x/pitch,v=y/pitch,ix=Math.round(u),iy=Math.round(v),dx=u-ix,dy=v-iy,ax=Math.floor(u),ay=Math.floor(v),warpRadius=.43+(noise(ix,7)-.5)*.025,weftRadius=.43+(noise(iy,19)-.5)*.025;
  const warpDome=Math.sqrt(Math.max(0,1-(dx/warpRadius)**2)),weftDome=Math.sqrt(Math.max(0,1-(dy/weftRadius)**2));
  const warpLift=crossing(ix,ay)*(1-smooth(v-ay))+crossing(ix,ay+1)*smooth(v-ay),weftLift=-crossing(ax,iy)*(1-smooth(u-ax))-crossing(ax+1,iy)*smooth(u-ax);
  const warpH=Math.abs(dx)<warpRadius?warpLift*.36+warpDome*.42:-10,weftH=Math.abs(dy)<weftRadius?weftLift*.36+weftDome*.42:-10;
  let colour=12+(noise(x,y)-.5)*9;
  if(Math.max(warpH,weftH)>-9){const warp=warpH>weftH,across=warp?dx/warpRadius:dy/weftRadius,dome=warp?warpDome:weftDome,along=warp?v:u,thread=warp?ix:iy;
   const shade=.5+.5*Math.max(0,-across*(warp?.45:.55)+dome*.72),dye=warp?227:36;
   const fibre=Math.sin(across*56+Math.sin(along*.5+thread)*2)*2.5,grit=(noise(x,y)-.5)*13,uptake=(noise(thread,warp?31:47)-.5)*12;
   colour=dye*shade+fibre+grit+uptake;
  }
  const i=(y*width+x)*4;pixels[i]=pixels[i+1]=pixels[i+2]=Math.max(0,Math.min(255,colour));pixels[i+3]=255;
 }
 canvas.width=width;canvas.height=height;ctx.putImageData(image,0,0);canvas.dataset.draft=draft.id;
}

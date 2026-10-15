import * as T from 'three';
// Overlapping diffused daylight pools: no straight pane edges or hard mullion lines.
export function windowDaylight(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;const c=canvas.getContext('2d'),pixels=c.createImageData(1024,1024),cos=Math.cos(-.98),sin=Math.sin(-.98);
 for(let y=0;y<1024;y++)for(let x=0;x<1024;x++){
  const dx=x-512,dy=y-512,u=cos*dx+sin*dy,v=-sin*dx+cos*dy;
  const a=(u+155+.00013*v*v)/74,b=(u-8-19*Math.sin(v/310))/67,d=(u-174+.00010*v*v)/84;
  const value=Math.min(1,.035+.70*Math.exp(-.5*a*a-(v+100)**2/900000)+.64*Math.exp(-.5*b*b-(v-40)**2/760000)+.52*Math.exp(-.5*d*d-(v-110)**2/680000));
  const i=(y*1024+x)*4,level=Math.round(value*255);pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=level;pixels.data[i+3]=255;
 }
 c.putImageData(pixels,0,0);const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
 const light=new T.SpotLight('#fff1dc',180,0,.9,.9,2);light.map=map;light.castShadow=true;light.shadow.mapSize.set(1024,1024);light.shadow.camera.near=.1;light.shadow.camera.far=15;light.shadow.radius=5;light.shadow.bias=-.00002;light.shadow.normalBias=.00035;light.shadow.camera.up.set(0,0,1);light.position.set(-2.2,-2.0,3.4);light.target.position.set(-.2,.03,1.7);return light;
}

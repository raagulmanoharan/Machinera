import * as T from 'three';
// Positive window illumination: broad luminous panes with diffused edges, not painted shadows.
export function windowDaylight(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;const c=canvas.getContext('2d');c.fillStyle='#000';c.fillRect(0,0,1024,1024);
 c.translate(512,512);c.rotate(-.98);c.filter='blur(32px)';
 for(const [x,width] of [[-132,80],[0,80],[132,80]]){const g=c.createLinearGradient(x-width/2,0,x+width/2,0);g.addColorStop(0,'#8c8c8c');g.addColorStop(.5,'#fff');g.addColorStop(1,'#8c8c8c');c.fillStyle=g;c.fillRect(x-width/2,-700,width,1400);}
 const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
 const light=new T.SpotLight('#fff1dc',700,0,.65,.65,2);light.map=map;light.castShadow=true;light.shadow.mapSize.set(1024,1024);light.shadow.camera.near=.1;light.shadow.camera.far=15;light.shadow.radius=5;light.shadow.bias=-.00002;light.shadow.normalBias=.00035;light.shadow.camera.up.set(0,0,1);light.position.set(-2.2,-2.0,3.4);light.target.position.set(-1.05,.03,1.4);return light;
}

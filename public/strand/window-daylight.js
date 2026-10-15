import * as T from 'three';
// A soft rectangular window, projected as illumination rather than painted onto the room.
export function windowDaylight(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;const c=canvas.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,1024,1024);
 c.translate(512,512);c.rotate(-.40);c.filter='blur(10px)';c.fillStyle='#fff';c.fillRect(-370,-800,740,1600);c.fillStyle='#555';for(const x of [-37,67])c.fillRect(x-12,-800,24,1600);
 const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
 const light=new T.SpotLight('#ffe1b8',80,0,.65,.65,2);light.map=map;light.shadow.camera.up.set(0,0,1);light.position.set(-2.2,-2.0,3.4);light.target.position.set(-.9,.03,1.4);return light;
}

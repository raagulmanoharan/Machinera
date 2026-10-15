import * as T from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { windowDaylight } from './window-daylight.js?v=29';
// Shared by the offline room bake and the interactive textile. Z is up.
export function addTextileLights(scene){
 scene.environmentIntensity=.16;scene.environmentRotation.set(Math.PI/2,0,.35);
 const key=new T.DirectionalLight(0xffecd1,1.65);key.position.set(-3.6,-1.9,5.2);key.target.position.set(0,0,1.5);key.castShadow=true;
 Object.assign(key.shadow.camera,{left:-2.3,right:2.3,top:2.7,bottom:-2.7,near:.1,far:15});key.shadow.mapSize.set(1024,1024);key.shadow.radius=4.5;key.shadow.bias=-.000008;key.shadow.normalBias=.00025;scene.add(key,key.target);
 RectAreaLightUniformsLib.init();
 const windowLight=new T.RectAreaLight(0xfff1de,.8,3.5,4.5);windowLight.position.set(-2.8,-2.7,4.8);windowLight.lookAt(0,-.014,1.8);scene.add(windowLight);
 const daylight=windowDaylight();daylight.intensity=65;daylight.castShadow=false;scene.add(daylight,daylight.target);
 const bounce=new T.RectAreaLight('#ffedd8',10,3,1);bounce.position.set(-1,-2,4.3);bounce.lookAt(0,.03,3.4);scene.add(bounce);
 return {key,daylight};
}

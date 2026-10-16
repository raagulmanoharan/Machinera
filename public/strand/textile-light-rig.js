import * as T from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
// Diffuse studio light for the freestanding textile. Z is up.
export function addTextileLights(scene){
 scene.environmentIntensity=.38;scene.environmentRotation.set(Math.PI/2,0,.35);
 // Fixed-cost PCF: a wider footprint feathers edges; 1K is enough for cloth folds.
 const key=new T.DirectionalLight(0xffffff,3.1);key.position.set(-3.6,-2.6,6.0);key.target.position.set(0,0,1.5);key.castShadow=true;
 Object.assign(key.shadow.camera,{left:-2.3,right:2.3,top:2.7,bottom:-2.7,near:.1,far:15});key.shadow.mapSize.set(1024,1024);key.shadow.radius=6;key.shadow.bias=-.000008;key.shadow.normalBias=.00025;scene.add(key,key.target);
 RectAreaLightUniformsLib.init();
 const windowLight=new T.RectAreaLight(0xffffff,.75,3.5,4.5);windowLight.position.set(-2.8,-2.7,4.8);windowLight.lookAt(0,-.014,1.8);scene.add(windowLight);
 const bounce=new T.RectAreaLight('#ffffff',1.15,4.5,3);bounce.position.set(-1.8,-2.5,6.1);bounce.lookAt(0,-.35,1.8);bounce.name='Large diffused overhead studio softbox';scene.add(bounce);
 return {key};
}

import * as T from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
// Two linear HDR room states: full daylight and daylight with the shadowed key removed.
export async function addHeritageRoom(scene,renderer){
 const map=await new RGBELoader().loadAsync('./assets/room/empty-room.hdr?v=33');
 map.colorSpace=T.LinearSRGBColorSpace;map.magFilter=T.LinearFilter;map.minFilter=T.LinearFilter;
 const height=5,width=height*512/910,centre=1.35,photoY=.03;
 const props=new T.Group();props.name='Empty room — shared HDR lighting';
 const material=new T.ShadowMaterial({transparent:false,depthWrite:true});
 material.onBeforeCompile=shader=>{
  shader.uniforms.roomAtlas={value:map};
  shader.vertexShader='varying vec2 vRoomUV;varying float vRoomZ;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvRoomUV=uv;vRoomZ=(modelMatrix*vec4(position,1.0)).z;');
  shader.fragmentShader='uniform sampler2D roomAtlas;varying vec2 vRoomUV;varying float vRoomZ;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );',`
   vec2 p=clamp(vRoomUV,vec2(.5/512.,.5/910.),vec2(1.-.5/512.,1.-.5/910.));
   vec3 lit=texture2D(roomAtlas,vec2(p.x*.5,p.y)).rgb;
   vec3 shade=texture2D(roomAtlas,vec2(.5+p.x*.5,p.y)).rgb;
   float visibility=mix(1.,getShadowMask(),smoothstep(-.01,.015,vRoomZ));
   gl_FragColor=vec4(mix(shade,lit,visibility),1.);`);
 };
 material.customProgramCacheKey=()=> 'strand-room-hdr-shadow-v1';
 const photo=new T.Mesh(new T.PlaneGeometry(width,height),material);photo.name='Baked empty room with live matched-colour shadows';photo.rotation.x=Math.PI/2;photo.position.set(0,photoY,centre);photo.receiveShadow=true;props.add(photo);
 scene.add(props);renderer.shadowMap.needsUpdate=true;
 const offset=new T.Vector3();
 function bounds(camera){const tan=Math.tan(T.MathUtils.degToRad(camera.fov/2));return {tan,maxDistance:Math.max(.17,Math.min(height/(2*tan),width/(2*tan*camera.aspect))-photoY-.02)};}
 function constrain(camera,controls){
  const {tan,maxDistance}=bounds(camera);controls.maxDistance=maxDistance;
  offset.copy(camera.position).sub(controls.target);let distance=offset.length();
  if(distance>maxDistance){offset.multiplyScalar(maxDistance/distance);camera.position.copy(controls.target).add(offset);distance=maxDistance;}
  const halfHeight=(distance+photoY)*tan,panX=Math.max(0,width/2-halfHeight*camera.aspect),panZ=Math.max(0,height/2-halfHeight);
  const x=T.MathUtils.clamp(controls.target.x,-panX,panX),z=T.MathUtils.clamp(controls.target.z,centre-panZ,centre+panZ);
  camera.position.x+=x-controls.target.x;camera.position.z+=z-controls.target.z;controls.target.x=x;controls.target.z=z;
 }
 function fit(camera,controls){const {maxDistance}=bounds(camera);controls.maxDistance=maxDistance;controls.target.set(0,0,1.47);camera.position.set(0,-maxDistance*.95,1.47);constrain(camera,controls);controls.update();}
 return {props,triangles:2,meshes:1,fit,constrain};
}

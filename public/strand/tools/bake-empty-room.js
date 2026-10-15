import * as T from 'three';
import { loadRoomEnvironment } from '../room-lighting.js?v=27';
import { addTextileLights } from '../textile-light-rig.js?v=33';
// Offline source scene; runtime uses only the resulting two-state HDR atlas.
const width=512,height=910,worldHeight=5,centre=1.35;
const renderer=new T.WebGLRenderer({antialias:false});renderer.setSize(width,height);renderer.toneMapping=T.NoToneMapping;
const scene=new T.Scene();scene.environment=await loadRoomEnvironment(renderer);const {key}=addTextileLights(scene);
const manifest=await(await fetch('../assets/materials-provenance.json')).json();
async function maps(name,repeat){const result={};await Promise.all(Object.entries(manifest[name].maps).map(async([role,entry])=>{const t=await new T.TextureLoader().loadAsync(entry.url);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(...repeat);t.colorSpace=role==='Diffuse'?T.SRGBColorSpace:T.NoColorSpace;result[role]=t;}));return result;}
const [plaster,timber]=await Promise.all([maps('painted_plaster_wall',[2.5,2.5]),maps('wood_floor',[2,3])]);
// Restrained matte styling, with real scanned surface relief and warm room bounce.
const wallMat=new T.MeshStandardMaterial({color:'#d9cbb5',roughness:1,normalMap:plaster.nor_gl,normalScale:new T.Vector2(.22,.22)});
wallMat.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 float grain=fract(sin(dot(vNormalMapUv,vec2(127.1,311.7)))*43758.5453);diffuseColor.rgb*=.985+.03*grain;`);};
const wall=new T.Mesh(new T.PlaneGeometry(12,10),wallMat);wall.rotation.x=Math.PI/2;wall.position.set(0,.03,2);scene.add(wall);
const floorMat=new T.MeshStandardMaterial({map:timber.Diffuse,color:'#d1bda3',roughness:1,normalMap:timber.nor_gl,normalScale:new T.Vector2(.6,.6),roughnessMap:timber.Rough});
const floor=new T.Mesh(new T.PlaneGeometry(12,12),floorMat);floor.position.set(0,-5.97,0);scene.add(floor);
const camera=new T.PerspectiveCamera(25,width/height,.03,40);camera.up.set(0,0,1);camera.position.set(0,-(worldHeight/(2*Math.tan(T.MathUtils.degToRad(12.5)))-.03),centre);camera.lookAt(0,0,centre);
const target=new T.WebGLRenderTarget(width,height,{type:T.FloatType});target.texture.colorSpace=T.LinearSRGBColorSpace;
async function capture(name){renderer.setRenderTarget(target);renderer.render(scene,camera);const pixels=new Float32Array(width*height*4);renderer.readRenderTargetPixels(target,0,0,width,height,pixels);await window.saveBake(name,Array.from(pixels));}
await capture('lit');key.intensity=0;await capture('shadow');window.bakeDone=true;

import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { studioEnvironment } from './studio-environment.js?v=10';
const stage=document.querySelector('#stage');
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
renderer.shadowMap.enabled=true;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;renderer.shadowMap.type=T.VSMShadowMap;stage.prepend(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color('#d5c8b4');
scene.environment=studioEnvironment(renderer);scene.environmentIntensity=.22;scene.environmentRotation.set(Math.PI/2,0,.35);
const camera=new T.PerspectiveCamera(38,innerWidth/innerHeight,.01,40);camera.up.set(0,0,1);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableRotate=false;controls.screenSpacePanning=true;controls.minDistance=.16;controls.maxDistance=10;controls.mouseButtons.LEFT=T.MOUSE.PAN;controls.touches.ONE=T.TOUCH.PAN;controls.touches.TWO=T.TOUCH.DOLLY_PAN;
const target=new T.Vector3(0,0,1.8),home=new T.Vector3(0,-5.0,1.8);
function fit(){controls.target.copy(target);camera.position.copy(target).add(home.clone().sub(target).multiplyScalar(Math.max(1,.57/camera.aspect)));controls.update();render()}
const key=new T.DirectionalLight(0xffead5,1.8);key.position.set(-3,-2.5,5.5);key.target.position.set(0,0,1.5);key.castShadow=true;
Object.assign(key.shadow.camera,{left:-2.3,right:2.3,top:2.7,bottom:-2.7,near:.1,far:15});key.shadow.mapSize.set(4096,4096);key.shadow.radius=3.5;key.shadow.blurSamples=8;key.shadow.bias=-.000008;key.shadow.normalBias=.00025;scene.add(key,key.target);
// A finite window source supplies distance falloff across the wall and fabric.
const windowLight=new T.SpotLight(0xffebd3,9,12,Math.PI/3,.8,2);
windowLight.position.set(-1.2,-1.5,3.5);windowLight.target.position.set(-.1,.03,1.8);
windowLight.castShadow=true;windowLight.shadow.mapSize.set(2048,2048);
windowLight.shadow.radius=4;windowLight.shadow.blurSamples=8;windowLight.shadow.bias=-.00001;windowLight.shadow.normalBias=.0002;
scene.add(windowLight,windowLight.target);
const bounce=new T.HemisphereLight(0xe9f0ff,0xa58a68,.20);bounce.position.set(0,0,1);scene.add(bounce);
const composer=new EffectComposer(renderer,new T.WebGLRenderTarget(innerWidth,innerHeight,{type:T.HalfFloatType}));
composer.addPass(new RenderPass(scene,camera));
// SSAO depth thresholds are normalized by the 40 m camera range: 0.6 mm–8 cm.
const occlusion=new SSAOPass(scene,camera,innerWidth,innerHeight,16);occlusion.kernelRadius=.035;occlusion.minDistance=.000015;occlusion.maxDistance=.002;composer.addPass(occlusion);composer.addPass(new OutputPass());
const antialias=new ShaderPass(FXAAShader);composer.addPass(antialias);
function updateAntialias(w,h,ratio=renderer.getPixelRatio()){antialias.uniforms.resolution.value.set(1/(w*ratio),1/(h*ratio))}updateAntialias(innerWidth,innerHeight);
// Reproducible multiscale plaster maps; pigment and surface relief are independent.
function noiseTexture(kind){const n=512,data=new Uint8Array(n*n*4);function hash(x,y){return ((Math.sin(x*127.1+y*311.7)*43758.5453)%1+1)%1}function noise(x,y){const a=Math.floor(x),b=Math.floor(y),u=x-a,v=y-b,s=u*u*(3-2*u),t=v*v*(3-2*v);return T.MathUtils.lerp(T.MathUtils.lerp(hash(a,b),hash(a+1,b),s),T.MathUtils.lerp(hash(a,b+1),hash(a+1,b+1),s),t)}for(let y=0;y<n;y++)for(let x=0;x<n;x++){const grain=hash(x,y),cloud=noise(x/50,y/50)*.6+noise(x/13,y/13)*.3+noise(x/3,y/3)*.1,j=(y*n+x)*4;if(kind==='colour'){const v=.94+cloud*.035;data.set([233*v,220*v,197*v,255],j)}else{const v=100+cloud*70+grain*35;data.set([v,v,v,255],j)}}const tex=new T.DataTexture(data,n,n);tex.needsUpdate=true;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(3,2);tex.magFilter=T.LinearFilter;tex.minFilter=T.LinearMipmapLinearFilter;tex.generateMipmaps=true;tex.anisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());if(kind==='colour')tex.colorSpace=T.SRGBColorSpace;return tex;}
const plaster=new T.MeshStandardMaterial({map:noiseTexture('colour'),bumpMap:noiseTexture('height'),bumpScale:.0014,roughness:.96});
function box(name,xyz,size,material){const m=new T.Mesh(new T.BoxGeometry(...size),material);m.name=name;m.position.set(...xyz);m.castShadow=m.receiveShadow=true;scene.add(m);return m;}
box('Warm lime-plaster wall',[0,.12,2.3],[8,.18,4.6],plaster);
box('Limestone floor',[0,-1.7,-.05],[8,4,.1],new T.MeshStandardMaterial({color:'#b6a18a',roughness:.9,bumpMap:noiseTexture('height'),bumpScale:.001}));
const wood=new T.MeshStandardMaterial({color:'#725036',roughness:.73,bumpMap:noiseTexture('height'),bumpScale:.0008});
box('Oak skirting',[0,-.006,.075],[8,.06,.15],wood);box('Hanging rail',[0,-.018,2.985],[1.7,.04,.035],wood);
for(const x of [-.73,.73])box('Brass fixing',[x,-.049,2.985],[.018,.012,.018],new T.MeshStandardMaterial({color:'#9d7940',metalness:.75,roughness:.4}));
const colours=['#265a64','#b75036','#c79837','#dbca9e'],pattern=[0,0,0,3,1,2,0,0,1,1,1,3,2,2,3,0,0,0];
function yarnBump(){const w=512,h=256,data=new Uint8Array(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const phase=y/h*Math.PI*48+.16*Math.sin(x*.12),v=128+60*Math.sin(phase)+10*Math.sin(x*23.7+y*13.1),i=(y*w+x)*4;data.set([v,v,v,255],i)}const t=new T.DataTexture(data,w,h);t.wrapS=t.wrapT=T.RepeatWrapping;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());t.needsUpdate=true;return t;}
const P=.016,warpCount=12*18,mat=new T.MeshPhysicalMaterial({color:0xffffff,roughness:.96,sheen:.3,sheenColor:'#c5ad8c',sheenRoughness:.9,bumpMap:yarnBump(),bumpScale:.0003});
const yarnMeshes=[],frustum=new T.Frustum(),projectionView=new T.Matrix4(),tileSphere=new T.Sphere(new T.Vector3(),.105);
function distantGeometry(source){
 const p=source.getAttribute('position'),n=source.getAttribute('normal'),uv=source.getAttribute('uv'),positions=[],normals=[],uvs=[],indices=[];
 // Blender tile: 24 plies, each with 81 rings of six vertices.
 for(let ply=0;ply<24;ply++){const base=positions.length/3;for(let ring=0;ring<=80;ring+=2)for(const side of [0,2,4]){const v=ply*81*6+ring*6+side;positions.push(p.getX(v),p.getY(v),p.getZ(v));normals.push(n.getX(v),n.getY(v),n.getZ(v));uvs.push(uv.getX(v),uv.getY(v))}for(let ring=0;ring<40;ring++)for(let side=0;side<3;side++){const a=base+ring*3+side,b=base+ring*3+(side+1)%3;indices.push(a,b,b+3,a,b+3,a+3)}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setIndex(indices);return g;
}
let pending=false,ready=false;
function render(){if(pending)return;pending=true;requestAnimationFrame(()=>{camera.updateMatrixWorld();frustum.setFromProjectionMatrix(projectionView.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));const close=camera.position.distanceTo(controls.target)<2.3;for(const item of yarnMeshes){item.mesh.geometry=close?item.high:item.low;let count=0;for(const entry of item.entries){tileSphere.center.copy(entry.centre);if(close&&!frustum.intersectsSphere(tileSphere))continue;item.mesh.setMatrixAt(count,entry.matrix);item.mesh.setColorAt(count++,entry.colour)}item.mesh.count=count;item.mesh.instanceMatrix.needsUpdate=true;item.mesh.instanceColor.needsUpdate=true}composer.render();if(ready)renderer.shadowMap.autoUpdate=false;pending=false;if(ready)stage.dataset.ready='true'})}
try{
 const gltf=await new GLTFLoader().loadAsync('./assets/blender-poc/weave-tile.gltf?v=13');
 for(const source of gltf.scene.children){if(!source.isMesh)continue;const warp=source.name.includes('warp'),mesh=new T.InstancedMesh(source.geometry,mat,warpCount);const entries=[];yarnMeshes.push({mesh,entries,high:source.geometry,low:distantGeometry(source.geometry)});mesh.name=source.name;mesh.castShadow=mesh.receiveShadow=true;const matrix=new T.Matrix4(),rotation=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),Math.PI/2),colour=new T.Color();let index=0;for(let y=0;y<18;y++)for(let x=0;x<12;x++){matrix.compose(new T.Vector3((x*8-47.5)*P,-.014,1.8+(y*8-71.5)*P),rotation,new T.Vector3(1,1,1));mesh.setMatrixAt(index,matrix);colour.set(colours[warp?0:pattern[y]]);mesh.setColorAt(index++,colour);entries.push({matrix:matrix.clone(),colour:colour.clone(),centre:new T.Vector3((x*8-44)*P,-.014,1.8+(y*8-68)*P)})}mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;scene.add(mesh);}
 // Fine loose fibres are sparse geometry rather than a thick fuzzy surface shell.
 let seed=24;function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}const fibres=[],tints=[];
 for(let i=0;i<18000;i++){const x=(random()-.5)*1.52,z=.65+random()*2.3,len=.001+random()*.004,angle=random()*Math.PI*2,row=T.MathUtils.clamp(Math.floor((z-.648)/.128),0,17),c=new T.Color(colours[pattern[row]]);for(let j=0;j<2;j++){const a=j/2,b=(j+1)/2;for(const t of [a,b]){fibres.push(x+Math.cos(angle)*len*t,-.024-Math.sin(t*2)*len*.5,z+Math.sin(angle)*len*t);tints.push(c.r,c.g,c.b)}}}
 const fg=new T.BufferGeometry();fg.setAttribute('position',new T.Float32BufferAttribute(fibres,3));fg.setAttribute('color',new T.Float32BufferAttribute(tints,3));scene.add(new T.LineSegments(fg,new T.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.3,depthWrite:false})));
 const fringeMaterial=new T.MeshPhysicalMaterial({color:colours[3],roughness:1,sheen:.3});for(let i=0;i<96;i++){const points=[];for(let j=0;j<=8;j++){const t=j/8;points.push(new T.Vector3((i-47.5)*P+.002*Math.sin(t*3+i),-.014-.003*Math.sin(t*2),.648-.055*t))}const mesh=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),12,.0025,5,false),fringeMaterial);mesh.castShadow=true;scene.add(mesh)}
 ready=true;fit();
}catch(error){stage.dataset.error=error.message;const msg=document.createElement('p');msg.textContent='The textile model could not load. Please reload.';msg.style.cssText='position:fixed;top:30%;width:100%;text-align:center;color:#514633';stage.append(msg);console.error(error)}
controls.addEventListener('change',render);
window.addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();composer.setSize(innerWidth,innerHeight);updateAntialias(innerWidth,innerHeight);render()});
function zoom(f){const offset=camera.position.clone().sub(controls.target);offset.multiplyScalar(f);offset.clampLength(.16,10);camera.position.copy(controls.target).add(offset);controls.update();render()}
document.querySelector('#zoomIn').onclick=()=>zoom(1/1.5);document.querySelector('#zoomOut').onclick=()=>zoom(1.5);document.querySelector('#fitFabric').onclick=fit;
document.querySelector('#light').value='1.1';document.querySelector('#light').oninput=e=>{renderer.toneMappingExposure=Number(e.target.value);render()};
document.querySelector('#saveFabric').onclick=()=>{const size=new T.Vector2();renderer.getSize(size);const aspect=size.x/size.y,h=Math.min(4096,renderer.capabilities.maxTextureSize),w=Math.round(h*aspect),pixelRatio=renderer.getPixelRatio();renderer.setPixelRatio(1);renderer.setSize(w,h,false);composer.setPixelRatio(1);composer.setSize(w,h);updateAntialias(w,h,1);composer.render();renderer.domElement.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='strand-blender-room.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000)});renderer.setPixelRatio(pixelRatio);renderer.setSize(size.x,size.y,false);composer.setPixelRatio(pixelRatio);composer.setSize(size.x,size.y);updateAntialias(size.x,size.y,pixelRatio);render()};

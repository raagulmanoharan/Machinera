import { FramePacer } from './frame-pacer.js?v=31';
import { applyRoomDaylight } from './room-daylight.js?v=29';
import * as T from 'three';
import { applySurfaceRelief } from './surface-relief.js?v=28';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { installClothInteraction } from './cloth-interaction.js?v=30';
import { HangingCloth } from './hanging-cloth.js?v=27';
import { repairWeaveGeometry } from './weave-model.js?v=27';
import { bakeWeave } from './weave-bake.js?v=27';
import { loadSurfaceMaterials } from './surface-materials.js?v=29';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { loadRoomEnvironment } from './room-lighting.js?v=27';
import { windowDaylight } from './window-daylight.js?v=29';
const stage=document.querySelector('#stage');
const renderer=new T.WebGLRenderer({antialias:false,depth:false,stencil:false,preserveDrawingBuffer:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.AgXToneMapping;renderer.toneMappingExposure=1.1;
renderer.info.autoReset=false;renderer.shadowMap.enabled=true;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;renderer.shadowMap.type=T.PCFShadowMap;stage.prepend(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color('#d5c8b4');
const hdrStatus=document.querySelector('#photoStatus');hdrStatus.hidden=false;hdrStatus.textContent='Lighting the room…';
try{scene.environment=await loadRoomEnvironment(renderer);}catch(error){hdrStatus.textContent='The room lighting could not load. Please reload.';throw error;}scene.environmentIntensity=.16;scene.environmentRotation.set(Math.PI/2,0,.35);
const camera=new T.PerspectiveCamera(25,innerWidth/innerHeight,.03,40);camera.up.set(0,0,1);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableRotate=false;controls.screenSpacePanning=true;controls.minDistance=.16;controls.maxDistance=14;controls.mouseButtons.LEFT=T.MOUSE.PAN;controls.touches.ONE=T.TOUCH.PAN;controls.touches.TWO=T.TOUCH.DOLLY_PAN;
const target=new T.Vector3(0,0,1.47),home=new T.Vector3(0,-8.65,1.47);
function fit(){controls.target.copy(target);camera.position.copy(target).add(home.clone().sub(target).multiplyScalar(Math.max(1,.57/camera.aspect)));controls.update();render()}
const key=new T.DirectionalLight(0xffecd1,1.65);key.position.set(-3.6,-1.9,5.2);key.target.position.set(0,0,1.5);key.castShadow=true;
Object.assign(key.shadow.camera,{left:-2.3,right:2.3,top:2.7,bottom:-2.7,near:.1,far:15});key.shadow.mapSize.set(1024,1024);key.shadow.radius=4.5;key.shadow.bias=-.000008;key.shadow.normalBias=.00025;scene.add(key,key.target);
// Broad photographic window light; the aligned directional key casts the wall shadow.
RectAreaLightUniformsLib.init();
const windowLight=new T.RectAreaLight(0xfff1de,.8,3.5,4.5);
windowLight.position.set(-2.8,-2.7,4.8);windowLight.lookAt(0,-.014,1.8);scene.add(windowLight);
const daylight=windowDaylight();daylight.castShadow=false;scene.add(daylight,daylight.target);
const highWindowBounce=new T.RectAreaLight('#ffedd8',10,3,1);highWindowBounce.position.set(-1,-2,4.3);highWindowBounce.lookAt(0,.03,3.4);scene.add(highWindowBounce);
const floorSun=new T.SpotLight('#fff0d7',200,0,.28,1,2);floorSun.map=daylight.map;floorSun.shadow.camera.up.set(0,0,1);floorSun.position.copy(daylight.position);floorSun.target.position.set(-.7,-.6,0);scene.add(floorSun,floorSun.target);
// HDR supplies the softer room bounce.
const composer=new EffectComposer(renderer,new T.WebGLRenderTarget(innerWidth,innerHeight,{type:T.HalfFloatType}));
composer.addPass(new RenderPass(scene,camera));
composer.addPass(new OutputPass());
const antialias=new ShaderPass(FXAAShader);composer.addPass(antialias);
function updateAntialias(w,h,ratio=renderer.getPixelRatio()){antialias.uniforms.resolution.value.set(1/(w*ratio),1/(h*ratio))}updateAntialias(innerWidth,innerHeight);
const materialStatus=document.querySelector('#photoStatus');materialStatus.hidden=false;materialStatus.textContent='Preparing the room and yarn…';
let surfaces;
try{surfaces=await loadSurfaceMaterials(renderer);}catch(error){materialStatus.textContent='The surface materials could not load. Please reload.';throw error;}
const plaster=surfaces.wall;plaster.envMapIntensity=2.0;surfaces.floor.envMapIntensity=.9;
plaster.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
 float pigment=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb=vec3(.87,.78,.67)*(.87+.25*pigment);`);};
for(const material of [plaster,surfaces.floor,surfaces.wood])applyRoomDaylight(material);
function box(name,xyz,size,material){const m=new T.Mesh(new T.BoxGeometry(...size),material);m.name=name;m.position.set(...xyz);m.castShadow=m.receiveShadow=true;scene.add(m);return m;}
box('Warm lime-plaster wall',[0,.12,2.3],[8,.18,4.6],plaster);
box('Oak floor',[0,-1.7,-.05],[8,4,.1],surfaces.floor);
const roomRug=new T.Mesh(new T.PlaneGeometry(2.8,1.3),surfaces.rug);roomRug.position.set(0,-1.65,.003);roomRug.receiveShadow=true;scene.add(roomRug);
const wood=surfaces.wood;
function woodGrainUV(mesh){const g=mesh.geometry,p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;for(let i=0;i<p.count;i++){const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i)),nz=Math.abs(n.getZ(i));if(nx>ny&&nx>nz)uv.setXY(i,p.getY(i)/.22,p.getZ(i)/.22);else uv.setXY(i,(ny>nz?p.getZ(i):p.getY(i))/.22,p.getX(i)/.7);}uv.needsUpdate=true;}

const skirting=new T.Mesh(new RoundedBoxGeometry(8,.045,.15,3,.007),wood);skirting.position.set(0,.002,.075);skirting.castShadow=skirting.receiveShadow=true;woodGrainUV(skirting);scene.add(skirting);
const rail=new T.Mesh(new RoundedBoxGeometry(1.7,.045,.038,4,.007),wood);rail.position.set(0,-.018,2.985);rail.castShadow=rail.receiveShadow=true;woodGrainUV(rail);scene.add(rail);
for(const x of [-.73,.73]){const pin=new T.Mesh(new T.CylinderGeometry(.0055,.0055,.009,16),new T.MeshPhysicalMaterial({color:'#a28042',metalness:.8,roughness:.32}));pin.position.set(x,-.045,2.985);pin.castShadow=true;scene.add(pin);}
const cloth=new HangingCloth(scene,renderer);
// Small linen loops make the five load-bearing attachment points visible.
const ties=new T.MeshStandardMaterial({color:'#d6c6a7',roughness:1,normalMap:surfaces.cotton.nor_gl,normalScale:new T.Vector2(.2,.2)});
for(let x=0;x<cloth.sim.nx;x++){const i=(cloth.sim.ny-1)*cloth.sim.nx+x;if(!cloth.sim.pinned[i])continue;const j=i*3,px=cloth.sim.positions[j],py=cloth.sim.positions[j+1],pz=cloth.sim.positions[j+2];const points=[new T.Vector3(px-.003,py,pz),new T.Vector3(px-.003,-.044,2.98),new T.Vector3(px,-.023,3.008),new T.Vector3(px+.003,.008,2.982),new T.Vector3(px+.003,py,pz)];const loop=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),24,.0014,6,false),ties);loop.name='Linen attachment loop';loop.castShadow=true;scene.add(loop);}

const colours=['#3b595a','#a74730','#ae812c','#cbbb9d'],pattern=[0,0,0,3,1,2,0,0,1,1,1,3,2,2,3,0,0,0];
const fibreNormal=surfaces.wool.nor_gl;
const P=.0192,warpCount=10*15,mat=new T.MeshPhysicalMaterial({color:0xffffff,side:T.DoubleSide,roughness:1,roughnessMap:surfaces.wool.Rough,sheen:0,specularIntensity:0,normalMap:fibreNormal,normalScale:new T.Vector2(.55,.55)});
// One reusable Blender asset; photos only change live yarn colour on the GPU.
mat.envMapIntensity=1.3;
const blankPhoto=new T.DataTexture(new Uint8Array([255,255,255,255]),1,1);blankPhoto.needsUpdate=true;
const photoUniform={value:blankPhoto},hasPhotoUniform={value:0},weaveAOUniform={value:blankPhoto},weaveLightUniform={value:blankPhoto},microShadowUniform={value:0};
mat.onBeforeCompile=shader=>{
 shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_begin>',T.ShaderChunk.lights_fragment_begin.replace('directLight.color * spotColor.rgb','directLight.color * spotColor.rgb * .2'));
 shader.uniforms.strandBands={value:pattern.map(i=>new T.Color(colours[i]))};shader.uniforms.strandPhoto=photoUniform;shader.uniforms.strandHasPhoto=hasPhotoUniform;shader.uniforms.strandWeaveAO=weaveAOUniform;shader.uniforms.strandWeaveLight=weaveLightUniform;shader.uniforms.strandMicroShadow=microShadowUniform;
 shader.vertexShader='varying vec2 vStrandPhotoUV;\n'+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
 vec4 strandPosition=vec4(transformed,1.0);
 #ifdef USE_INSTANCING
 strandPosition=instanceMatrix*strandPosition;
 #endif
 strandPosition=modelMatrix*strandPosition;
 vStrandPhotoUV=vec2(strandPosition.x/1.536+0.5,(strandPosition.z-0.648)/2.304);`);
 shader.fragmentShader='uniform vec3 strandBands[18];uniform sampler2D strandPhoto;uniform sampler2D strandWeaveLight;uniform float strandMicroShadow;uniform sampler2D strandWeaveAO;uniform float strandHasPhoto;varying vec2 vStrandPhotoUV;\n'+shader.fragmentShader;
 shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 if(strandHasPhoto>0.5){diffuseColor.rgb=texture2D(strandPhoto,clamp(vStrandPhotoUV,0.0,1.0)).rgb;}else{int stripe=int(clamp(floor(vStrandPhotoUV.y*18.),0.,17.));diffuseColor.rgb=strandBands[stripe];}`);
 shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
 roughnessFactor*=.975+.025*sin(vStrandPhotoUV.x*231.0+vStrandPhotoUV.y*593.0);
 float strandDye=.97+.03*sin(vStrandPhotoUV.x*423.0+sin(vStrandPhotoUV.y*83.0)*2.0)*sin(vStrandPhotoUV.y*521.0+vStrandPhotoUV.x*31.0);diffuseColor.rgb*=strandDye;`);
 shader.fragmentShader=shader.fragmentShader.replace('#include <lights_physical_fragment>',`#include <lights_physical_fragment>\n#ifdef USE_SHEEN\n material.sheenColor*=diffuseColor.rgb;\n#endif`);
 shader.fragmentShader=shader.fragmentShader.replace('#include <aomap_fragment>',`#include <aomap_fragment>
 float strandAO=mix(1.0,texture2D(strandWeaveAO,vStrandPhotoUV*vec2(10.,15.)).r,.42);reflectedLight.indirectDiffuse*=strandAO;reflectedLight.indirectSpecular*=strandAO;reflectedLight.directDiffuse*=mix(1.,strandAO,.5);float yarnVisibility=1.-texture2D(strandWeaveLight,vStrandPhotoUV*vec2(10.,15.)).r;reflectedLight.directDiffuse*=mix(1.,yarnVisibility,.4*strandMicroShadow);`);
};
mat.customProgramCacheKey=()=> 'strand-live-photo-v2';
let fibreMesh,fringeMaterial,farFabric,photoVersion=0,photoRequest=0;
function photoColour(pixels,width,height,x,z,out){const u=T.MathUtils.clamp(x/1.536+.5,0,1),v=T.MathUtils.clamp(1-(z-.648)/2.304,0,1),i=(Math.min(height-1,Math.floor(v*height))*width+Math.min(width-1,Math.floor(u*width)))*4;return out.setRGB(pixels[i]/255,pixels[i+1]/255,pixels[i+2]/255,T.SRGBColorSpace)}
async function applyPhoto(file){
 if(!file)return;const request=++photoRequest,status=document.querySelector('#photoStatus');status.textContent='Weaving your colours…';status.hidden=false;
 const url=URL.createObjectURL(file);let texture;
 try{
  const image=new Image();image.src=url;await image.decode();
  const limit=Math.min(4096,renderer.capabilities.maxTextureSize),scale=Math.min(1,limit/Math.max(image.naturalWidth,image.naturalHeight));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
  if(request!==photoRequest)return;
  texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());
  const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data,colour=new T.Color();
  if(fibreMesh){const positions=fibreMesh.geometry.attributes.position,tints=fibreMesh.geometry.attributes.color;for(let i=0;i<positions.count;i++){photoColour(pixels,canvas.width,canvas.height,positions.getX(i),positions.getZ(i),colour);tints.setXYZ(i,colour.r,colour.g,colour.b)}tints.needsUpdate=true;}
  if(fringeMaterial){const sum=new T.Color(0,0,0);for(let i=0;i<64;i++)sum.add(photoColour(pixels,canvas.width,canvas.height,(i/63-.5)*1.536,.648,colour));fringeMaterial.color.copy(sum.multiplyScalar(1/64));}
  const old=photoUniform.value;photoUniform.value=texture;hasPhotoUniform.value=1;if(old!==blankPhoto)old.dispose();photoVersion++;
  stage.dataset.photoWidth=String(canvas.width);stage.dataset.photoHeight=String(canvas.height);status.hidden=true;fit();render();
 }catch(error){texture?.dispose();if(request===photoRequest){status.textContent='That photo could not be opened. Try JPEG, PNG or WebP.';status.hidden=false;console.error(error)}}finally{URL.revokeObjectURL(url)}
}
for(const [button,input]of [['takePhoto','cameraPhoto'],['uploadPhoto','photoFile']]){document.querySelector('#'+button).onclick=()=>document.querySelector('#'+input).click();document.querySelector('#'+input).onchange=e=>{applyPhoto(e.target.files?.[0]);e.target.value='';};}
let floorCords;
const yarnMeshes=[],frustum=new T.Frustum(),projectionView=new T.Matrix4(),tileSphere=new T.Sphere(new T.Vector3(),.105);
function distantGeometry(source){
 const p=source.getAttribute('position'),n=source.getAttribute('normal'),uv=source.getAttribute('uv'),positions=[],normals=[],uvs=[],indices=[];
 // Blender tile: 24 plies, each with 81 rings of six vertices.
 for(let ply=0;ply<24;ply++){const base=positions.length/3;for(let ring=0;ring<=80;ring+=4)for(const side of [0,1,2,3,4,5]){const v=ply*81*6+ring*6+side;positions.push(p.getX(v),p.getY(v),p.getZ(v));normals.push(n.getX(v),n.getY(v),n.getZ(v));uvs.push(uv.getX(v),uv.getY(v))}for(let ring=0;ring<20;ring++)for(let side=0;side<6;side++){const a=base+ring*6+side,b=base+ring*6+(side+1)%6;indices.push(a,b,b+6,a,b+6,a+6)}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setIndex(indices);return g;
}
let detailedShadowCasters=false;
function updateYarns(forceHigh=false){
 camera.updateMatrixWorld();frustum.setFromProjectionMatrix(projectionView.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
 // Cull static floor tiles conservatively; retain the exact authored cord mesh.
 if(floorCords){let count=0,dirty=false;for(let i=0;i<floorCords.entries.length;i++){const entry=floorCords.entries[i];tileSphere.center.copy(entry.centre);tileSphere.radius=floorCords.radius;if(!frustum.intersectsSphere(tileSphere))continue;if(floorCords.indices[count]!==i){floorCords.indices[count]=i;floorCords.mesh.setMatrixAt(count,entry.matrix);dirty=true;}count++;}floorCords.mesh.count=count;if(dirty)floorCords.mesh.instanceMatrix.needsUpdate=true;}
 const distance=camera.position.distanceTo(controls.target);
 const wantsDetailed=distance<(detailedShadowCasters?1.12:1);
 if(detailedShadowCasters!==wantsDetailed){detailedShadowCasters=wantsDetailed;renderer.shadowMap.needsUpdate=true;}
 microShadowUniform.value=detailedShadowCasters?0:1;if(farFabric)farFabric.visible=false;
 if(fibreMesh){fibreMesh.visible=true;fibreMesh.material.opacity=Math.min(.4,.4/Math.pow(distance,1.2));}
 for(const item of yarnMeshes){
  item.mesh.visible=true;item.mesh.receiveShadow=true;item.mesh.geometry=forceHigh||detailedShadowCasters?item.high:item.low;item.mesh.castShadow=detailedShadowCasters;
  let count=0,dirty=false;
  for(let index=0;index<item.entries.length;index++){
   const entry=item.entries[index];cloth.sample(entry.centre.x/1.536+.5,(entry.centre.z-.648)/2.304,tileSphere.center);tileSphere.radius=cloth.sim.active?.20:.16;
   if(!frustum.intersectsSphere(tileSphere))continue;
   if(item.visibleIndices[count]!==index){item.visibleIndices[count]=index;item.mesh.setMatrixAt(count,entry.matrix);item.mesh.setColorAt(count,entry.colour);dirty=true;}count++;
  }
  if(item.mesh.castShadow&&(dirty||item.mesh.count!==count))renderer.shadowMap.needsUpdate=true;
  item.mesh.count=count;if(dirty)item.mesh.instanceMatrix.needsUpdate=item.mesh.instanceColor.needsUpdate=true;
 }
}
// Reuse shadows while motion stays below a small fraction of a shadow texel.
const shadowPose=new Float32Array(cloth.display.length);shadowPose.set(cloth.display);
function shadowPoseChanged(){for(let i=0;i<shadowPose.length;i++)if(Math.abs(shadowPose[i]-cloth.display[i])>.00025)return true;return false;}
const framePacer=new FramePacer();
let pending=false,ready=false,lastFrame=0;
function render(){if(pending)return;pending=true;requestAnimationFrame(frame)}
function frame(time){const frameStart=performance.now();pending=false;if(document.hidden){lastFrame=0;return;}if(!framePacer.accept(time)){render();return;}const dt=lastFrame?Math.min((time-lastFrame)/1000,.05):1/60;lastFrame=time;const moved=cloth.update(dt),physicsEnd=performance.now();if(moved&&shadowPoseChanged())renderer.shadowMap.needsUpdate=true;updateYarns();renderer.info.reset();const refreshShadows=renderer.shadowMap.needsUpdate;composer.render();if(refreshShadows)shadowPose.set(cloth.display);if(ready){stage.dataset.physicsMs=(physicsEnd-frameStart).toFixed(2);stage.dataset.frameDtMs=(dt*1000).toFixed(2);stage.dataset.frameCpuMs=(performance.now()-frameStart).toFixed(2);stage.dataset.ready='true';stage.dataset.triangles=String(renderer.info.render.triangles);stage.dataset.drawCalls=String(renderer.info.render.calls);stage.dataset.cameraDistance=camera.position.distanceTo(controls.target).toFixed(4);stage.dataset.lod=farFabric?.visible?'baked-surface':'yarns';stage.dataset.photoVersion=String(photoVersion);stage.dataset.clothActive=String(cloth.sim.active);stage.dataset.clothCentreY=cloth.sim.positions[(Math.floor(cloth.sim.ny/2)*cloth.sim.nx+Math.floor(cloth.sim.nx/2))*3+1].toFixed(5);}if(cloth.sim.active)render();else lastFrame=0;}
try{
 const gltf=await new GLTFLoader().loadAsync('./assets/blender-poc/weave-tile.gltf?v=13');
 let seamGap=0;for(const source of gltf.scene.children)if(source.isMesh){seamGap=Math.max(seamGap,repairWeaveGeometry(source.geometry,source.name.includes('warp')));source.geometry.scale(1,1,.78);}
 stage.dataset.weaveSeamGap=String(seamGap);
 const baked=bakeWeave(renderer,gltf.scene);weaveAOUniform.value=baked.ao;weaveLightUniform.value=baked.light;microShadowUniform.value=1;
 const farMaterial=mat.clone();farMaterial.side=T.DoubleSide;farMaterial.normalMap=baked.normal;farMaterial.normalMap.repeat.set(10,15);farMaterial.normalScale.set(.88,.88);
 farMaterial.bumpMap=null;farMaterial.roughnessMap=null;farMaterial.roughness=.95;const photoCompile=mat.onBeforeCompile;farMaterial.onBeforeCompile=shader=>{photoCompile(shader);shader.uniforms.strandRole={value:baked.role};shader.uniforms.strandBands={value:pattern.map(i=>new T.Color(colours[i]))};shader.uniforms.strandWarp={value:new T.Color(colours[0])};shader.fragmentShader='uniform sampler2D strandRole;uniform vec3 strandWarp;\n'+shader.fragmentShader;
 shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 vec4 strandMask=texture2D(strandRole,vStrandPhotoUV*vec2(10.,15.));if(strandMask.a<.12)discard;if(strandHasPhoto<.5){int stripe=int(clamp(floor(vStrandPhotoUV.y*18.),0.,17.));diffuseColor.rgb=mix(strandBands[stripe]*.94,strandBands[stripe],strandMask.r);}`);};farMaterial.customProgramCacheKey=()=> 'strand-far-baked-v1';
 const farGeometry=new T.PlaneGeometry(1.536,2.304,48,72);farGeometry.rotateX(Math.PI/2);farGeometry.translate(0,-.014,1.8);farFabric=new T.Mesh(farGeometry,farMaterial);farFabric.name='Deformed full-view cloth with baked real-yarn normals';cloth.attach(farFabric);scene.add(farFabric);
 for(const source of gltf.scene.children)if(source.isMesh)source.geometry.scale(1.2,1.2,1.2);
 // Reuse the authored three-ply yarn geometry for genuinely raised jute cords.
 const rugSource=gltf.scene.children.find(source=>source.isMesh&&source.name.includes('warp'));
 const rugMaterial=new T.MeshPhysicalMaterial({color:'#d5ba90',roughness:1,specularIntensity:0,normalMap:surfaces.wool.nor_gl,normalScale:new T.Vector2(.8,.8),roughnessMap:surfaces.wool.Rough});applySurfaceRelief(rugMaterial,surfaces.wool.Displacement,.0003);
 const rugGeometry=distantGeometry(rugSource.geometry),rugPositions=rugGeometry.attributes.position;for(let i=0;i<rugPositions.count;i++){const strand=Math.floor(Math.floor(i/(21*6))/3),along=rugPositions.getY(i)/(.016*1.2);rugPositions.setZ(i,rugPositions.getZ(i)+Math.cos(Math.PI*(along+strand))*.016*.32*.78*1.2);}rugGeometry.computeVertexNormals();
 const rugCords=new T.InstancedMesh(rugGeometry,rugMaterial,15*7),rugMatrix=new T.Matrix4();let rugIndex=0;rugGeometry.computeBoundingSphere();floorCords={mesh:rugCords,entries:[],indices:new Int16Array(105).fill(-1),radius:rugGeometry.boundingSphere.radius*1.3};
 for(let y=0;y<7;y++)for(let x=0;x<15;x++){rugMatrix.makeScale(1.25,1.25,1.3);rugMatrix.setPosition((x*8-59.5)*.024,-1.65+(y*8-27.5)*.024,.013);rugCords.setMatrixAt(rugIndex++,rugMatrix);floorCords.entries.push({matrix:rugMatrix.clone(),centre:rugGeometry.boundingSphere.center.clone().applyMatrix4(rugMatrix)});}
 rugCords.frustumCulled=false;rugCords.name='Raised three-ply jute cords';rugCords.receiveShadow=true;scene.add(rugCords);

 const cottonMaterial=mat.clone();cottonMaterial.normalMap=surfaces.cotton.nor_gl;cottonMaterial.roughnessMap=surfaces.cotton.Rough;cottonMaterial.normalScale.set(.8,.8);cottonMaterial.onBeforeCompile=mat.onBeforeCompile;cottonMaterial.customProgramCacheKey=()=> 'strand-cotton-photo-v20';
 cloth.patch(mat,{yarn:true});cloth.patch(cottonMaterial,{yarn:true});
 applySurfaceRelief(mat,surfaces.wool.Displacement,.00012,{fibres:true});applySurfaceRelief(cottonMaterial,surfaces.cotton.Displacement,.0001,{fibres:true});
 for(const source of gltf.scene.children){if(!source.isMesh)continue;const warp=source.name.includes('warp'),mesh=new T.InstancedMesh(source.geometry,warp?cottonMaterial:mat,warpCount);const entries=[];yarnMeshes.push({mesh,entries,high:source.geometry,low:distantGeometry(source.geometry),visibleIndices:new Int16Array(warpCount).fill(-1)});mesh.name=source.name;mesh.castShadow=mesh.receiveShadow=true;mesh.customDepthMaterial=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,side:T.DoubleSide});cloth.patch(mesh.customDepthMaterial,{depth:true,yarn:true});mesh.frustumCulled=false;const matrix=new T.Matrix4(),rotation=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),Math.PI/2),colour=new T.Color();let index=0;for(let y=0;y<15;y++)for(let x=0;x<10;x++){matrix.compose(new T.Vector3((x*8-39.5)*P,-.014,1.8+(y*8-59.5)*P),rotation,new T.Vector3(1,1,1));mesh.setMatrixAt(index,matrix);colour.set(colours[pattern[Math.min(17,Math.floor(y*18/15))]]);if(warp)colour.multiplyScalar(.94);mesh.setColorAt(index++,colour);entries.push({matrix:matrix.clone(),colour:colour.clone(),centre:new T.Vector3((x*8-36)*P,-.014,1.8+(y*8-56)*P)})}mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;scene.add(mesh);}
 // Fine loose fibres are sparse geometry rather than a thick fuzzy surface shell.
 let seed=24;function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}const fibres=[],tints=[],fibreShading=[],fibreCoverage=[];
 const fibreKey=new T.Vector3(-.6,-.6,.53).normalize();
 const fibreSources=gltf.scene.children.filter(source=>source.isMesh),root=new T.Vector3(),normal=new T.Vector3(),tangent=new T.Vector3(),vertex=new T.Vector3(),axis=new T.Vector3(1,0,0);
 const turnToWall=new T.Quaternion().setFromAxisAngle(axis,Math.PI/2);
 for(let i=0;i<24000;i++){
  const source=fibreSources[Math.floor(random()*fibreSources.length)],g=source.geometry,triangle=Math.floor(random()*g.index.count/3)*3;let a=random(),b=random();if(a+b>1){a=1-a;b=1-b;}const weights=[1-a-b,a,b];root.set(0,0,0);normal.set(0,0,0);
  for(let corner=0;corner<3;corner++){const index=g.index.getX(triangle+corner);root.addScaledVector(vertex.fromBufferAttribute(g.attributes.position,index),weights[corner]);normal.addScaledVector(vertex.fromBufferAttribute(g.attributes.normal,index),weights[corner]);}
  normal.normalize();if(normal.z<.65||root.z<.006){i--;continue;}
  const tx=Math.floor(random()*10),ty=Math.floor(random()*15);root.applyQuaternion(turnToWall).add(new T.Vector3((tx*8-39.5)*P,-.014,1.8+(ty*8-59.5)*P));normal.applyQuaternion(turnToWall);root.addScaledVector(normal,.0008);
  tangent.crossVectors(normal,axis).normalize().applyAxisAngle(normal,random()*Math.PI*2);
  const len=.001+random()*.003,angle=random()*Math.PI*2,row=T.MathUtils.clamp(Math.floor((root.z-.648)/.128),0,17),c=new T.Color(colours[pattern[row]]);
  for(let j=0;j<2;j++)for(const t of [j/2,(j+1)/2]){vertex.copy(root).addScaledVector(tangent,len*t).addScaledVector(normal,len*(.25*t+.2*Math.sin(t*Math.PI)));fibres.push(vertex.x,vertex.y,vertex.z);tints.push(c.r,c.g,c.b);fibreShading.push(.65+.8*Math.max(0,normal.dot(fibreKey)));fibreCoverage.push(1.-.8*t);}

 }
 const fg=new T.BufferGeometry();fg.setAttribute('position',new T.Float32BufferAttribute(fibres,3));fg.setAttribute('color',new T.Float32BufferAttribute(tints,3));fibreMesh=new T.LineSegments(fg,new T.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.3,depthWrite:false}));cloth.attach(fibreMesh,{line:true});
 // Matte flyaways respond to the upper-left key and fade toward their fine tips.
 fg.setAttribute('fibreShade',new T.Float32BufferAttribute(fibreShading,1));fg.setAttribute('fibreCoverage',new T.Float32BufferAttribute(fibreCoverage,1));
 const fibreCompile=fibreMesh.material.onBeforeCompile;
 fibreMesh.material.onBeforeCompile=(shader,renderer)=>{fibreCompile.call(fibreMesh.material,shader,renderer);shader.vertexShader='attribute float fibreShade;attribute float fibreCoverage;varying float vFibreShade;varying float vFibreCoverage;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvFibreShade=fibreShade;vFibreCoverage=fibreCoverage;');shader.fragmentShader='varying float vFibreShade;varying float vFibreCoverage;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=vFibreShade;diffuseColor.a*=vFibreCoverage;');};
 fibreMesh.material.customProgramCacheKey=()=> 'strand-matte-flyaways-v28';scene.add(fibreMesh);
 fringeMaterial=new T.MeshPhysicalMaterial({color:'#eee0c5',roughness:1,roughnessMap:surfaces.wool.Rough,sheen:0,specularIntensity:0,normalMap:fibreNormal,normalScale:new T.Vector2(.95,.95)});fringeMaterial.normalScale.set(.65,.65);cloth.patch(fringeMaterial);applySurfaceRelief(fringeMaterial,surfaces.wool.Displacement,.00012);
 const fringeGeometry=new T.BufferGeometry(),fp=[],fn=[],fu=[],fi=[],shadowPoints=[],shadowNormals=[],shadowIndices=[];
 for(let i=0;i<176;i++){
  const length=.105*(.9+random()*.2),curl=(random()-.5)*.008,phase=random()*Math.PI*2;
  // Shadow texels are wider than individual plies: cast the stable strand envelope.
  const centre=[];for(let j=0;j<=6;j++){const t=j/6;centre.push(new T.Vector3((i-87.5)*(1.536/176)+.0015*Math.sin(t*4+i)+curl*t*t,-.014-.003*Math.sin(t*2+i*.2),.648-length*t));}
  const envelope=new T.TubeGeometry(new T.CatmullRomCurve3(centre),6,.0028,4,false),base=shadowPoints.length/3;shadowPoints.push(...envelope.attributes.position.array);shadowNormals.push(...envelope.attributes.normal.array);for(const k of envelope.index.array)shadowIndices.push(k+base);envelope.dispose();
  for(let ply=0;ply<3;ply++){
   const points=[];for(let j=0;j<=24;j++){const t=j/24,turn=phase+ply*Math.PI*2/3+t*Math.PI*12;points.push(new T.Vector3((i-87.5)*(1.536/176)+.0013*Math.cos(turn)+.0015*Math.sin(t*4+i)+curl*t*t,-.014+.0013*Math.sin(turn)-.003*Math.sin(t*2+i*.2),.648-length*t));}
   const tube=new T.TubeGeometry(new T.CatmullRomCurve3(points),24,.0015*(.94+random()*.12),5,false),offset=fp.length/3;fp.push(...tube.attributes.position.array);fn.push(...tube.attributes.normal.array);fu.push(...tube.attributes.uv.array);for(const k of tube.index.array)fi.push(k+offset);tube.dispose();
  }
 }
 fringeGeometry.setAttribute('position',new T.Float32BufferAttribute(fp,3));fringeGeometry.setAttribute('normal',new T.Float32BufferAttribute(fn,3));fringeGeometry.setAttribute('uv',new T.Float32BufferAttribute(fu,2));fringeGeometry.setIndex(fi);const fringe=new T.Mesh(fringeGeometry,fringeMaterial);cloth.attach(fringe);fringe.castShadow=false;scene.add(fringe);
 const shadowGeometry=new T.BufferGeometry();shadowGeometry.setAttribute('position',new T.Float32BufferAttribute(shadowPoints,3));shadowGeometry.setAttribute('normal',new T.Float32BufferAttribute(shadowNormals,3));shadowGeometry.setIndex(shadowIndices);
 const fringeShadow=new T.Mesh(shadowGeometry,new T.MeshStandardMaterial({colorWrite:false,depthWrite:false,side:T.DoubleSide,roughness:1}));fringeShadow.name='Soft fringe shadow envelopes';cloth.attach(fringeShadow);fringeShadow.castShadow=true;scene.add(fringeShadow);
 installClothInteraction({canvas:renderer.domElement,camera,controls,cloth,render,onInteraction:type=>{stage.dataset.lastInteraction=type;}});
 materialStatus.hidden=true;stage.dataset.materials='polyhaven-cc0';stage.dataset.lighting='1k-hdri';stage.dataset.shadows='deformed-mesh';ready=true;document.querySelector('#takePhoto').disabled=false;document.querySelector('#uploadPhoto').disabled=false;fit();
}catch(error){stage.dataset.error=error.message;const msg=document.createElement('p');msg.textContent='The textile model could not load. Please reload.';msg.style.cssText='position:fixed;top:30%;width:100%;text-align:center;color:#514633';stage.append(msg);console.error(error)}
controls.addEventListener('change',render);
document.addEventListener('visibilitychange',()=>{lastFrame=0;framePacer.reset();if(!document.hidden)render();});
window.addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();composer.setSize(innerWidth,innerHeight);updateAntialias(innerWidth,innerHeight);render()});
function zoom(f){const offset=camera.position.clone().sub(controls.target);offset.multiplyScalar(f);offset.clampLength(.16,14);camera.position.copy(controls.target).add(offset);controls.update();render()}
document.querySelector('#zoomIn').onclick=()=>zoom(1/1.5);document.querySelector('#zoomOut').onclick=()=>zoom(1.5);document.querySelector('#fitFabric').onclick=fit;
document.querySelector('#light').value='1.1';document.querySelector('#light').oninput=e=>{renderer.toneMappingExposure=Number(e.target.value);render()};
document.querySelector('#saveFabric').onclick=()=>{const size=new T.Vector2();renderer.getSize(size);const aspect=size.x/size.y,h=Math.min(4096,renderer.capabilities.maxTextureSize),w=Math.round(h*aspect),pixelRatio=renderer.getPixelRatio();renderer.setPixelRatio(1);renderer.setSize(w,h,false);composer.setPixelRatio(1);composer.setSize(w,h);updateAntialias(w,h,1);updateYarns(true);composer.render();renderer.domElement.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='strand-photo-carpet.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000)});renderer.setPixelRatio(pixelRatio);renderer.setSize(size.x,size.y,false);composer.setPixelRatio(pixelRatio);composer.setSize(size.x,size.y);updateAntialias(size.x,size.y,pixelRatio);render()};


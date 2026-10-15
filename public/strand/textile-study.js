import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { installClothInteraction } from './cloth-interaction.js?v=18';
import { HangingCloth } from './hanging-cloth.js?v=18';
import { repairWeaveGeometry } from './weave-model.js?v=18';
import { bakeWeave } from './weave-bake.js?v=18';
import { woodMaterial } from './room-wood.js?v=18';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { studioEnvironment } from './studio-environment.js?v=10';
const stage=document.querySelector('#stage');
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.AgXToneMapping;renderer.toneMappingExposure=1.1;
renderer.info.autoReset=false;renderer.shadowMap.enabled=true;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;renderer.shadowMap.type=T.VSMShadowMap;stage.prepend(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color('#d5c8b4');
scene.environment=studioEnvironment(renderer);scene.environmentIntensity=.14;scene.environmentRotation.set(Math.PI/2,0,.35);
const camera=new T.PerspectiveCamera(25,innerWidth/innerHeight,.01,40);camera.up.set(0,0,1);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableRotate=false;controls.screenSpacePanning=true;controls.minDistance=.16;controls.maxDistance=14;controls.mouseButtons.LEFT=T.MOUSE.PAN;controls.touches.ONE=T.TOUCH.PAN;controls.touches.TWO=T.TOUCH.DOLLY_PAN;
const target=new T.Vector3(0,0,1.65),home=new T.Vector3(0,-7.9,1.65);
function fit(){controls.target.copy(target);camera.position.copy(target).add(home.clone().sub(target).multiplyScalar(Math.max(1,.57/camera.aspect)));controls.update();render()}
const key=new T.DirectionalLight(0xfff1de,.65);key.position.set(-3,-3.5,5.8);key.target.position.set(0,0,1.5);key.castShadow=true;
Object.assign(key.shadow.camera,{left:-2.3,right:2.3,top:2.7,bottom:-2.7,near:.1,far:15});key.shadow.mapSize.set(1024,1024);key.shadow.radius=10;key.shadow.blurSamples=24;key.shadow.bias=-.000008;key.shadow.normalBias=.00025;scene.add(key,key.target);
// Broad photographic window light; the aligned directional key casts the wall shadow.
RectAreaLightUniformsLib.init();
const windowLight=new T.RectAreaLight(0xfff1de,5.0,3.5,4.5);
windowLight.position.set(-2.8,-2.7,4.8);windowLight.lookAt(0,-.014,1.8);scene.add(windowLight);
// A feathered pool of window illumination gives the plaster a spatial light gradient.
const daylight=new T.SpotLight(0xffefda,30,0,.60,1,2);daylight.position.set(-2,-2,4.3);daylight.target.position.set(-.6,.03,2.25);scene.add(daylight,daylight.target);
const bounce=new T.HemisphereLight(0xf3f4f5,0xa58a68,.12);bounce.position.set(0,0,1);scene.add(bounce);
const composer=new EffectComposer(renderer,new T.WebGLRenderTarget(innerWidth,innerHeight,{type:T.HalfFloatType}));
composer.addPass(new RenderPass(scene,camera));
composer.addPass(new OutputPass());
const antialias=new ShaderPass(FXAAShader);composer.addPass(antialias);
function updateAntialias(w,h,ratio=renderer.getPixelRatio()){antialias.uniforms.resolution.value.set(1/(w*ratio),1/(h*ratio))}updateAntialias(innerWidth,innerHeight);
// Reproducible multiscale plaster maps; pigment and surface relief are independent.
function noiseTexture(kind){const n=512,data=new Uint8Array(n*n*4);function hash(x,y){return ((Math.sin(x*127.1+y*311.7)*43758.5453)%1+1)%1}function noise(x,y){const a=Math.floor(x),b=Math.floor(y),u=x-a,v=y-b,s=u*u*(3-2*u),t=v*v*(3-2*v);return T.MathUtils.lerp(T.MathUtils.lerp(hash(a,b),hash(a+1,b),s),T.MathUtils.lerp(hash(a,b+1),hash(a+1,b+1),s),t)}for(let y=0;y<n;y++)for(let x=0;x<n;x++){const grain=hash(x,y),cloud=noise(x/50,y/50)*.6+noise(x/13,y/13)*.3+noise(x/3,y/3)*.1,j=(y*n+x)*4;if(kind==='colour'){const v=.94+cloud*.035;data.set([249*v,242*v,229*v,255],j)}else{const v=100+cloud*70+grain*35;data.set([v,v,v,255],j)}}const tex=new T.DataTexture(data,n,n);tex.needsUpdate=true;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(3,2);tex.magFilter=T.LinearFilter;tex.minFilter=T.LinearMipmapLinearFilter;tex.generateMipmaps=true;tex.anisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());if(kind==='colour')tex.colorSpace=T.SRGBColorSpace;return tex;}
const plaster=new T.MeshStandardMaterial({map:noiseTexture('colour'),bumpMap:noiseTexture('height'),bumpScale:.0014,roughness:.96});
function box(name,xyz,size,material){const m=new T.Mesh(new T.BoxGeometry(...size),material);m.name=name;m.position.set(...xyz);m.castShadow=m.receiveShadow=true;scene.add(m);return m;}
box('Warm lime-plaster wall',[0,.12,2.3],[8,.18,4.6],plaster);
box('Oak floor',[0,-1.7,-.05],[8,4,.1],woodMaterial({floor:true}));
const wood=woodMaterial();
const skirting=new T.Mesh(new RoundedBoxGeometry(8,.045,.15,3,.007),wood);skirting.position.set(0,.002,.075);skirting.castShadow=skirting.receiveShadow=true;scene.add(skirting);
const rail=new T.Mesh(new RoundedBoxGeometry(1.7,.045,.038,4,.007),wood);rail.position.set(0,-.018,2.985);rail.castShadow=rail.receiveShadow=true;scene.add(rail);
for(const x of [-.73,.73]){const pin=new T.Mesh(new T.CylinderGeometry(.0055,.0055,.009,16),new T.MeshPhysicalMaterial({color:'#a28042',metalness:.8,roughness:.32}));pin.position.set(x,-.045,2.985);pin.castShadow=true;scene.add(pin);}
const cloth=new HangingCloth(scene,renderer);
const colours=['#174650','#a93e28','#b98720','#d5c6a7'],pattern=[0,0,0,3,1,2,0,0,1,1,1,3,2,2,3,0,0,0];
function yarnBump(){const w=512,h=256,data=new Uint8Array(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const phase=y/h*Math.PI*48+.16*Math.sin(x*.12),v=128+60*Math.sin(phase)+10*Math.sin(x*23.7+y*13.1),i=(y*w+x)*4;data.set([v,v,v,255],i)}const t=new T.DataTexture(data,w,h);t.wrapS=t.wrapT=T.RepeatWrapping;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());t.needsUpdate=true;return t;}
const fibreTexture=yarnBump(),roughData=new Uint8Array(fibreTexture.image.data.length);
for(let i=0;i<roughData.length;i+=4){const r=240+Math.round(fibreTexture.image.data[i]/255*15);roughData.set([r,r,r,255],i)}
const fibreRoughness=new T.DataTexture(roughData,512,256);fibreRoughness.wrapS=fibreRoughness.wrapT=T.RepeatWrapping;fibreRoughness.generateMipmaps=true;fibreRoughness.minFilter=T.LinearMipmapLinearFilter;fibreRoughness.magFilter=T.LinearFilter;fibreRoughness.needsUpdate=true;
const fibreNormalData=new Uint8Array(1024*512*4);
for(let y=0;y<512;y++)for(let x=0;x<1024;x++){const phase=y/512*Math.PI*96+.22*Math.sin(x*.027),grain=((Math.sin(x*127.1+y*311.7)*43758.5453)%1+1)%1*2-1,nx=.13*Math.sin(x*.11+y*.07)+grain*.30,ny=.25*Math.cos(phase)+grain*.28,nz=Math.sqrt(Math.max(.01,1-nx*nx-ny*ny)),i=(y*1024+x)*4;fibreNormalData.set([(nx*.5+.5)*255,(ny*.5+.5)*255,(nz*.5+.5)*255,255],i)}
const fibreNormal=new T.DataTexture(fibreNormalData,1024,512);fibreNormal.wrapS=fibreNormal.wrapT=T.RepeatWrapping;fibreNormal.generateMipmaps=true;fibreNormal.minFilter=T.LinearMipmapLinearFilter;fibreNormal.magFilter=T.LinearFilter;fibreNormal.anisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());fibreNormal.needsUpdate=true;
const P=.016,warpCount=12*18,mat=new T.MeshPhysicalMaterial({color:0xffffff,side:T.DoubleSide,roughness:1,roughnessMap:fibreRoughness,sheen:0,specularIntensity:0,sheenColor:'#c5ad8c',sheenRoughness:.9,normalMap:fibreNormal,normalScale:new T.Vector2(1.15,1.15),bumpMap:fibreTexture,bumpScale:.0003});
// One reusable Blender asset; photos only change live yarn colour on the GPU.
const blankPhoto=new T.DataTexture(new Uint8Array([255,255,255,255]),1,1);blankPhoto.needsUpdate=true;
const photoUniform={value:blankPhoto},hasPhotoUniform={value:0},weaveAOUniform={value:blankPhoto};
mat.onBeforeCompile=shader=>{
 shader.uniforms.strandPhoto=photoUniform;shader.uniforms.strandHasPhoto=hasPhotoUniform;shader.uniforms.strandWeaveAO=weaveAOUniform;
 shader.vertexShader='varying vec2 vStrandPhotoUV;\n'+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
 vec4 strandPosition=vec4(transformed,1.0);
 #ifdef USE_INSTANCING
 strandPosition=instanceMatrix*strandPosition;
 #endif
 strandPosition=modelMatrix*strandPosition;
 vStrandPhotoUV=vec2(strandPosition.x/1.536+0.5,(strandPosition.z-0.648)/2.304);`);
 shader.fragmentShader='uniform sampler2D strandPhoto;uniform sampler2D strandWeaveAO;uniform float strandHasPhoto;varying vec2 vStrandPhotoUV;\n'+shader.fragmentShader;
 shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 if(strandHasPhoto>0.5){diffuseColor.rgb=texture2D(strandPhoto,clamp(vStrandPhotoUV,0.0,1.0)).rgb;}`);
 shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
 roughnessFactor*=.975+.025*sin(vStrandPhotoUV.x*231.0+vStrandPhotoUV.y*593.0);
 float strandDye=.97+.03*sin(vStrandPhotoUV.x*423.0+sin(vStrandPhotoUV.y*83.0)*2.0)*sin(vStrandPhotoUV.y*521.0+vStrandPhotoUV.x*31.0);float fleck=fract(sin(dot(floor(vStrandPhotoUV*vec2(2450.,3675.)),vec2(127.1,311.7)))*43758.5453);diffuseColor.rgb*=strandDye*(.89+.15*fleck);`);
 shader.fragmentShader=shader.fragmentShader.replace('#include <lights_physical_fragment>',`#include <lights_physical_fragment>\n#ifdef USE_SHEEN\n material.sheenColor*=diffuseColor.rgb;\n#endif`);
 shader.fragmentShader=shader.fragmentShader.replace('#include <aomap_fragment>',`#include <aomap_fragment>
 float strandAO=mix(1.0,texture2D(strandWeaveAO,vStrandPhotoUV*vec2(12.,18.)).r,.42);reflectedLight.indirectDiffuse*=strandAO;reflectedLight.indirectSpecular*=strandAO;reflectedLight.directDiffuse*=mix(1.,strandAO,.5);`);
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
const yarnMeshes=[],frustum=new T.Frustum(),projectionView=new T.Matrix4(),tileSphere=new T.Sphere(new T.Vector3(),.105);
function distantGeometry(source){
 const p=source.getAttribute('position'),n=source.getAttribute('normal'),uv=source.getAttribute('uv'),positions=[],normals=[],uvs=[],indices=[];
 // Blender tile: 24 plies, each with 81 rings of six vertices.
 for(let ply=0;ply<24;ply++){const base=positions.length/3;for(let ring=0;ring<=80;ring+=4)for(const side of [0,1,2,3,4,5]){const v=ply*81*6+ring*6+side;positions.push(p.getX(v),p.getY(v),p.getZ(v));normals.push(n.getX(v),n.getY(v),n.getZ(v));uvs.push(uv.getX(v),uv.getY(v))}for(let ring=0;ring<20;ring++)for(let side=0;side<6;side++){const a=base+ring*6+side,b=base+ring*6+(side+1)%6;indices.push(a,b,b+6,a,b+6,a+6)}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setIndex(indices);return g;
}
function updateYarns(forceHigh=false){camera.updateMatrixWorld();frustum.setFromProjectionMatrix(projectionView.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));const distance=camera.position.distanceTo(controls.target),near=forceHigh||!cloth.sim.active||distance<3.1;if(farFabric)farFabric.visible=!near;if(fibreMesh)fibreMesh.visible=distance<1.0&&!cloth.sim.active;for(const item of yarnMeshes){item.mesh.visible=near;item.mesh.receiveShadow=distance<3.1;if(!near)continue;item.mesh.geometry=forceHigh||distance<1.0&&!cloth.sim.active?item.high:item.low;item.mesh.castShadow=distance<1.0&&!cloth.sim.active;let count=0;for(const entry of item.entries){cloth.sample(entry.centre.x/1.536+.5,(entry.centre.z-.648)/2.304,tileSphere.center);tileSphere.radius=cloth.sim.active?.18:.14;if(!frustum.intersectsSphere(tileSphere))continue;item.mesh.setMatrixAt(count,entry.matrix);item.mesh.setColorAt(count++,entry.colour)}item.mesh.count=count;item.mesh.instanceMatrix.needsUpdate=true;item.mesh.instanceColor.needsUpdate=true;}}
let pending=false,ready=false,lastFrame=0;
function render(){if(pending)return;pending=true;requestAnimationFrame(frame)}
function frame(time){pending=false;const dt=lastFrame?Math.min((time-lastFrame)/1000,.05):1/60;lastFrame=time;const moved=cloth.update(dt);if(moved)renderer.shadowMap.needsUpdate=true;updateYarns();renderer.info.reset();composer.render();if(ready){stage.dataset.ready='true';stage.dataset.triangles=String(renderer.info.render.triangles);stage.dataset.drawCalls=String(renderer.info.render.calls);stage.dataset.cameraDistance=camera.position.distanceTo(controls.target).toFixed(4);stage.dataset.lod=farFabric?.visible?'baked-surface':'yarns';stage.dataset.photoVersion=String(photoVersion);stage.dataset.clothActive=String(cloth.sim.active);stage.dataset.clothCentreY=cloth.sim.positions[(Math.floor(cloth.sim.ny/2)*cloth.sim.nx+Math.floor(cloth.sim.nx/2))*3+1].toFixed(5);}if(cloth.sim.active)render();}
try{
 const gltf=await new GLTFLoader().loadAsync('./assets/blender-poc/weave-tile.gltf?v=13');
 let seamGap=0;for(const source of gltf.scene.children)if(source.isMesh){seamGap=Math.max(seamGap,repairWeaveGeometry(source.geometry,source.name.includes('warp')));source.geometry.scale(1,1,.78);}
 stage.dataset.weaveSeamGap=String(seamGap);
 const baked=bakeWeave(renderer,gltf.scene);weaveAOUniform.value=baked.ao;
 const farMaterial=mat.clone();farMaterial.normalMap=baked.normal;farMaterial.normalMap.repeat.set(12,18);farMaterial.normalScale.set(.88,.88);
 farMaterial.bumpMap=null;farMaterial.roughnessMap=null;farMaterial.roughness=.95;const photoCompile=mat.onBeforeCompile;farMaterial.onBeforeCompile=shader=>{photoCompile(shader);shader.uniforms.strandRole={value:baked.role};shader.uniforms.strandBands={value:pattern.map(i=>new T.Color(colours[i]))};shader.uniforms.strandWarp={value:new T.Color(colours[0])};shader.fragmentShader='uniform sampler2D strandRole;uniform vec3 strandBands[18];uniform vec3 strandWarp;\n'+shader.fragmentShader;
 shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 vec4 strandMask=texture2D(strandRole,vStrandPhotoUV*vec2(12.,18.));if(strandMask.a<.12)discard;if(strandHasPhoto<.5){int stripe=int(clamp(floor(vStrandPhotoUV.y*18.),0.,17.));diffuseColor.rgb=mix(strandBands[stripe]*.94,strandBands[stripe],strandMask.r);}`);};farMaterial.customProgramCacheKey=()=> 'strand-far-baked-v1';
 const farGeometry=new T.PlaneGeometry(1.536,2.304,48,72);farGeometry.rotateX(Math.PI/2);farGeometry.translate(0,-.014,1.8);farFabric=new T.Mesh(farGeometry,farMaterial);farFabric.name='Deformed full-view cloth with baked real-yarn normals';cloth.attach(farFabric);scene.add(farFabric);
 cloth.patch(mat,{yarn:true});
 for(const source of gltf.scene.children){if(!source.isMesh)continue;const warp=source.name.includes('warp'),mesh=new T.InstancedMesh(source.geometry,mat,warpCount);const entries=[];yarnMeshes.push({mesh,entries,high:source.geometry,low:distantGeometry(source.geometry)});mesh.name=source.name;mesh.castShadow=mesh.receiveShadow=true;mesh.customDepthMaterial=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,side:T.DoubleSide});cloth.patch(mesh.customDepthMaterial,{depth:true,yarn:true});mesh.frustumCulled=false;const matrix=new T.Matrix4(),rotation=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),Math.PI/2),colour=new T.Color();let index=0;for(let y=0;y<18;y++)for(let x=0;x<12;x++){matrix.compose(new T.Vector3((x*8-47.5)*P,-.014,1.8+(y*8-71.5)*P),rotation,new T.Vector3(1,1,1));mesh.setMatrixAt(index,matrix);colour.set(colours[pattern[y]]);if(warp)colour.multiplyScalar(.94);mesh.setColorAt(index++,colour);entries.push({matrix:matrix.clone(),colour:colour.clone(),centre:new T.Vector3((x*8-44)*P,-.014,1.8+(y*8-68)*P)})}mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;scene.add(mesh);}
 // Fine loose fibres are sparse geometry rather than a thick fuzzy surface shell.
 let seed=24;function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}const fibres=[],tints=[];
 for(let i=0;i<18000;i++){const x=(random()-.5)*1.52,z=.65+random()*2.3,len=.001+random()*.004,angle=random()*Math.PI*2,row=T.MathUtils.clamp(Math.floor((z-.648)/.128),0,17),c=new T.Color(colours[pattern[row]]);for(let j=0;j<2;j++){const a=j/2,b=(j+1)/2;for(const t of [a,b]){fibres.push(x+Math.cos(angle)*len*t,-.024-Math.sin(t*2)*len*.5,z+Math.sin(angle)*len*t);tints.push(c.r,c.g,c.b)}}}
 const fg=new T.BufferGeometry();fg.setAttribute('position',new T.Float32BufferAttribute(fibres,3));fg.setAttribute('color',new T.Float32BufferAttribute(tints,3));fibreMesh=new T.LineSegments(fg,new T.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.3,depthWrite:false}));cloth.attach(fibreMesh,{line:true});scene.add(fibreMesh);
 fringeMaterial=new T.MeshPhysicalMaterial({color:colours[3],roughness:1,sheen:0,specularIntensity:0,normalMap:fibreNormal,normalScale:new T.Vector2(1,1)});cloth.patch(fringeMaterial);
 const fringeGeometry=new T.BufferGeometry(),fp=[],fn=[],fi=[];for(let i=0;i<96;i++){const points=[],length=.055*(.87+random()*.26),curl=(random()-.5)*.008;for(let j=0;j<=12;j++){const t=j/12;points.push(new T.Vector3((i-47.5)*P+.002*Math.sin(t*4+i)+curl*t*t,-.014-.003*Math.sin(t*2+i*.2),.648-length*t))}const tube=new T.TubeGeometry(new T.CatmullRomCurve3(points),16,.0018*(.9+random()*.2),5,false),offset=fp.length/3;fp.push(...tube.attributes.position.array);fn.push(...tube.attributes.normal.array);for(const k of tube.index.array)fi.push(k+offset);tube.dispose();}
 fringeGeometry.setAttribute('position',new T.Float32BufferAttribute(fp,3));fringeGeometry.setAttribute('normal',new T.Float32BufferAttribute(fn,3));fringeGeometry.setIndex(fi);const fringe=new T.Mesh(fringeGeometry,fringeMaterial);cloth.attach(fringe);fringe.castShadow=true;scene.add(fringe);
 installClothInteraction({canvas:renderer.domElement,camera,controls,cloth,render,onInteraction:type=>{stage.dataset.lastInteraction=type;}});
 ready=true;document.querySelector('#takePhoto').disabled=false;document.querySelector('#uploadPhoto').disabled=false;fit();
}catch(error){stage.dataset.error=error.message;const msg=document.createElement('p');msg.textContent='The textile model could not load. Please reload.';msg.style.cssText='position:fixed;top:30%;width:100%;text-align:center;color:#514633';stage.append(msg);console.error(error)}
controls.addEventListener('change',()=>{if(camera.position.distanceTo(controls.target)<3.1)renderer.shadowMap.needsUpdate=true;render()});
window.addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();composer.setSize(innerWidth,innerHeight);updateAntialias(innerWidth,innerHeight);render()});
function zoom(f){const offset=camera.position.clone().sub(controls.target);offset.multiplyScalar(f);offset.clampLength(.16,14);camera.position.copy(controls.target).add(offset);controls.update();render()}
document.querySelector('#zoomIn').onclick=()=>zoom(1/1.5);document.querySelector('#zoomOut').onclick=()=>zoom(1.5);document.querySelector('#fitFabric').onclick=fit;
document.querySelector('#light').value='1.1';document.querySelector('#light').oninput=e=>{renderer.toneMappingExposure=Number(e.target.value);render()};
document.querySelector('#saveFabric').onclick=()=>{const size=new T.Vector2();renderer.getSize(size);const aspect=size.x/size.y,h=Math.min(4096,renderer.capabilities.maxTextureSize),w=Math.round(h*aspect),pixelRatio=renderer.getPixelRatio();renderer.setPixelRatio(1);renderer.setSize(w,h,false);composer.setPixelRatio(1);composer.setSize(w,h);updateAntialias(w,h,1);updateYarns(true);composer.render();renderer.domElement.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='strand-photo-carpet.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000)});renderer.setPixelRatio(pixelRatio);renderer.setSize(size.x,size.y,false);composer.setPixelRatio(pixelRatio);composer.setSize(size.x,size.y);updateAntialias(size.x,size.y,pixelRatio);render()};

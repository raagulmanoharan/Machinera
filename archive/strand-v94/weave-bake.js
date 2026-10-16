import * as T from 'three';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
// Bake real Blender crossing geometry once. No external renderer or photo leaves the browser.
export function bakeWeave(renderer,source){
 const size=1024,scene=new T.Scene(),camera=new T.OrthographicCamera(-.008,.120,.120,-.008,.01,1);camera.position.z=.35;camera.lookAt(0,0,0);camera.updateProjectionMatrix();
 const normalMat=new T.MeshNormalMaterial({side:T.DoubleSide});const objects=[];
 source.children.forEach(item=>{if(!item.isMesh)return;const mesh=new T.Mesh(item.geometry,normalMat);mesh.userData.warp=item.name.includes('warp');scene.add(mesh);objects.push(mesh)});
 const settings={target:renderer.getRenderTarget(),clear:renderer.getClearColor(new T.Color()),alpha:renderer.getClearAlpha(),tone:renderer.toneMapping,shadow:renderer.shadowMap.enabled};renderer.shadowMap.enabled=false;renderer.toneMapping=T.NoToneMapping;renderer.setClearColor(0,0);
 const target=(samples=0)=>{const t=new T.WebGLRenderTarget(size,size,{type:T.UnsignedByteType,samples});t.texture.wrapS=t.texture.wrapT=T.RepeatWrapping;t.texture.anisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());t.texture.generateMipmaps=true;t.texture.minFilter=T.LinearMipmapLinearFilter;return t;};
 const normal=target(4);renderer.setClearColor(0x8080ff,0);renderer.setRenderTarget(normal);renderer.clear();renderer.render(scene,camera);
 const role=target(4);const roleMaterials=[];for(const ob of objects){const m=new T.MeshBasicMaterial({color:ob.userData.warp?0x000000:0xffffff,side:T.DoubleSide});roleMaterials.push(m);ob.material=m;}renderer.setClearColor(0,0);renderer.setRenderTarget(role);renderer.clear();renderer.render(scene,camera);
 for(const ob of objects)ob.material=normalMat;
 const ao=new SSAOPass(scene,camera,size,size,32);ao.kernelRadius=.016;ao.minDistance=.0003;ao.maxDistance=.04;ao.ssaoMaterial.defines.PERSPECTIVE_CAMERA=0;ao.output=SSAOPass.OUTPUT.Blur;
 const occlusion=target();ao.render(renderer,occlusion,occlusion); // AO pass writes its read buffer when not rendering to screen.
 for(const tex of [normal.texture,role.texture,occlusion.texture]){tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.generateMipmaps=true;tex.minFilter=T.LinearMipmapLinearFilter;tex.magFilter=T.LinearFilter;tex.anisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());tex.colorSpace=T.NoColorSpace;}
 renderer.setRenderTarget(settings.target);renderer.setClearColor(settings.clear,settings.alpha);renderer.toneMapping=settings.tone;renderer.shadowMap.enabled=settings.shadow;ao.dispose();normalMat.dispose();roleMaterials.forEach(m=>m.dispose());
 const light=bakeYarnVisibility(renderer,source);
 return {normal:normal.texture,role:role.texture,ao:occlusion.texture,light:light.texture,targets:[normal,role,occlusion,light]};
}

// Periodic self-shadow visibility from the same upper-left window direction.
// Baked once from real yarns; it adds recess shadows without per-frame shadow geometry.
function bakeYarnVisibility(renderer,source){
 const state={target:renderer.getRenderTarget(),clear:renderer.getClearColor(new T.Color()),alpha:renderer.getClearAlpha(),tone:renderer.toneMapping,enabled:renderer.shadowMap.enabled,type:renderer.shadowMap.type,auto:renderer.shadowMap.autoUpdate};
 const scene=new T.Scene(),camera=new T.OrthographicCamera(-.008,.120,.120,-.008,.01,2);camera.position.z=.4;camera.lookAt(0,0,0);
 const material=new T.ShadowMaterial({color:0xffffff,side:T.DoubleSide,opacity:1});
 for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++)for(const item of source.children){if(!item.isMesh)continue;const m=new T.Mesh(item.geometry,material);m.position.set(x*.128,y*.128,0);m.castShadow=m.receiveShadow=true;scene.add(m);}
 const key=new T.DirectionalLight(0xffffff,1);key.position.set(-.7,.9,.65);key.target.position.set(.056,.056,0);key.castShadow=true;Object.assign(key.shadow.camera,{left:-.25,right:.25,top:.25,bottom:-.25,near:.1,far:3});key.shadow.mapSize.set(2048,2048);key.shadow.bias=-.000002;key.shadow.normalBias=.00008;scene.add(key,key.target);
 const target=new T.WebGLRenderTarget(1024,1024);target.texture.wrapS=target.texture.wrapT=T.RepeatWrapping;target.texture.generateMipmaps=true;target.texture.minFilter=T.LinearMipmapLinearFilter;target.texture.colorSpace=T.NoColorSpace;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=true;renderer.shadowMap.needsUpdate=true;renderer.toneMapping=T.NoToneMapping;renderer.setClearColor(0,0);renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,camera);
 renderer.setRenderTarget(state.target);renderer.setClearColor(state.clear,state.alpha);renderer.toneMapping=state.tone;renderer.shadowMap.enabled=state.enabled;renderer.shadowMap.type=state.type;renderer.shadowMap.autoUpdate=state.auto;renderer.shadowMap.needsUpdate=true;
 key.shadow.map?.dispose();material.dispose();return target;
}

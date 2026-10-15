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
 return {normal:normal.texture,role:role.texture,ao:occlusion.texture,targets:[normal,role,occlusion]};
}

import * as T from 'three';
import { applySurfaceRelief } from './surface-relief.js?v=28';
// Existing CC0 surfaces, with source URLs and verified hashes in the manifest.
// The local wall bake derives from the same CC0 scan; see assets/room/provenance.json.
// Textile diffuse maps are deliberately excluded: the photo supplies dye only.
export async function loadSurfaceMaterials(renderer){
 const response=await fetch('./assets/materials-provenance.json?v=27');
 if(!response.ok)throw Error('Material manifest could not load');
 const manifest=await response.json(),loader=new T.TextureLoader(),anisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());
 async function set(name,repeat){
  const result={};await Promise.all(Object.entries(manifest[name].maps).map(async([role,entry])=>{
   let tex;for(let attempt=0;attempt<3;attempt++){try{const url=name==='painted_plaster_wall'&&role==='Diffuse'?'./assets/room/wall-patina.jpg?v=33':entry.url;tex=await loader.loadAsync(url+(attempt?(url.includes('?')?'&':'?')+'strand-retry='+attempt:''));break;}catch(error){if(attempt===2)throw error;await new Promise(resolve=>setTimeout(resolve,250*(attempt+1)));}}tex.name=`${name}:${role}`;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(...repeat);tex.anisotropy=anisotropy;tex.colorSpace=role==='Diffuse'?T.SRGBColorSpace:T.NoColorSpace;if(name==='painted_plaster_wall'&&role==='Diffuse'){tex.wrapS=tex.wrapT=T.ClampToEdgeWrapping;tex.repeat.set(1,1);}result[role]=tex;
  }));return result;
 }
 const [timber,floor,wall,cotton,wool]=await Promise.all([set('wood_table_worn',[1,1]),set('wood_floor',[3,2]),set('painted_plaster_wall',[2,1.35]),set('cotton_jersey',[.5,.08]),set('wool_boucle',[.5,.08])]);
 const standard=(maps,normalScale,colour=0xffffff)=>new T.MeshStandardMaterial({color:colour,map:maps.Diffuse,normalMap:maps.nor_gl,normalScale:new T.Vector2(normalScale,normalScale),roughnessMap:maps.Rough,roughness:1});
 for(const tex of Object.values(floor)){tex.rotation=Math.PI/2;tex.center.set(.5,.5);tex.repeat.set(2,3);}
 const wood=standard(timber,2.0),oak=standard(floor,5.0,'#be8b54');applySurfaceRelief(wood,timber.Displacement,.0012);applySurfaceRelief(oak,floor.Displacement,.0045);
 // Height-derived cavity shading is static: no extra geometry or render pass.
 for(const [material,maps] of [[wood,timber],[oak,floor]]){
  const previous=material.onBeforeCompile,key=material.customProgramCacheKey.bind(material);
  material.onBeforeCompile=function(shader,renderer){previous.call(this,shader,renderer);shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`float woodCavity=texture2D(surfaceHeight,vNormalMapUv).r;
   outgoingLight*=mix(.72,1.035,smoothstep(.12,.7,woodCavity));
   #include <opaque_fragment>`);};material.customProgramCacheKey=()=>key()+'-wood-cavities-v29';
 }
 wood.roughness=.83;oak.roughness=.86;wood.envMapIntensity=.8;
 return {wood,floor:oak,wall:standard(wall,.3,'#fff5e5'),cotton,wool};
}

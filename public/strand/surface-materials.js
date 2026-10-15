import * as T from 'three';
import { applySurfaceRelief } from './surface-relief.js?v=28';
// Only the live textile and its attachment rail need physical materials.
// The empty wall and floor are in the shared-lighting HDR bake.
export async function loadSurfaceMaterials(renderer){
 const response=await fetch('./assets/materials-provenance.json?v=27');
 if(!response.ok)throw Error('Material manifest could not load');
 const manifest=await response.json(),loader=new T.TextureLoader(),anisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());
 async function set(name,repeat){
  const result={};await Promise.all(Object.entries(manifest[name].maps).map(async([role,entry])=>{
   let tex;for(let attempt=0;attempt<3;attempt++){try{tex=await loader.loadAsync(entry.url+(attempt?'?strand-retry='+attempt:''));break;}catch(error){if(attempt===2)throw error;await new Promise(resolve=>setTimeout(resolve,250*(attempt+1)));}}
   tex.name=`${name}:${role}`;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(...repeat);tex.anisotropy=anisotropy;tex.colorSpace=role==='Diffuse'?T.SRGBColorSpace:T.NoColorSpace;result[role]=tex;
  }));return result;
 }
 const [timber,cotton,wool]=await Promise.all([set('wood_table_worn',[1,1]),set('cotton_jersey',[.5,.08]),set('wool_boucle',[.5,.08])]);
 const wood=new T.MeshStandardMaterial({map:timber.Diffuse,normalMap:timber.nor_gl,normalScale:new T.Vector2(2,2),roughnessMap:timber.Rough,roughness:.83,envMapIntensity:.8});
 applySurfaceRelief(wood,timber.Displacement,.0012);
 return {wood,cotton,wool};
}

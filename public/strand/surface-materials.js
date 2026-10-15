import * as T from 'three';
import { applySurfaceRelief } from './surface-relief.js?v=27';
// Existing CC0 surfaces, with source URLs and verified hashes in the manifest.
// Textile diffuse maps are deliberately excluded: the photo supplies dye only.
export async function loadSurfaceMaterials(renderer){
 const response=await fetch('./assets/materials-provenance.json?v=27');
 if(!response.ok)throw Error('Material manifest could not load');
 const manifest=await response.json(),loader=new T.TextureLoader(),anisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());
 async function set(name,repeat){
  const result={};await Promise.all(Object.entries(manifest[name].maps).map(async([role,entry])=>{
   let tex;for(let attempt=0;attempt<3;attempt++){try{tex=await loader.loadAsync(entry.url+(attempt?'?strand-retry='+attempt:''));break;}catch(error){if(attempt===2)throw error;await new Promise(resolve=>setTimeout(resolve,250*(attempt+1)));}}tex.name=`${name}:${role}`;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(...repeat);tex.anisotropy=anisotropy;tex.colorSpace=role==='Diffuse'?T.SRGBColorSpace:T.NoColorSpace;result[role]=tex;
  }));return result;
 }
 const [timber,floor,wall,cotton,wool,hessian]=await Promise.all([set('wood_table_worn',[1,1]),set('wood_floor',[3,2]),set('painted_plaster_wall',[4,2.3]),set('cotton_jersey',[.5,.08]),set('wool_boucle',[.5,.08]),set('hessian_230',[1,.5])]);
 const standard=(maps,normalScale,colour=0xffffff)=>new T.MeshStandardMaterial({color:colour,map:maps.Diffuse,normalMap:maps.nor_gl,normalScale:new T.Vector2(normalScale,normalScale),roughnessMap:maps.Rough,roughness:1});
 for(const tex of Object.values(floor)){tex.rotation=Math.PI/2;tex.center.set(.5,.5);tex.repeat.set(2,3);}
 const wood=standard(timber,2.0),oak=standard(floor,5.0,'#be8b54');applySurfaceRelief(wood,timber.Displacement,.0012);applySurfaceRelief(oak,floor.Displacement,.0045);
 return {rug:standard(hessian,.65,'#e1c59b'),wood,floor:oak,wall:standard(wall,.3,'#fff5e5'),cotton,wool};
}

import * as T from 'three';
// Existing CC0 surfaces, with source URLs and verified hashes in the manifest.
// Textile diffuse maps are deliberately excluded: the photo supplies dye only.
export async function loadSurfaceMaterials(renderer){
 const response=await fetch('./assets/materials-provenance.json?v=20');
 if(!response.ok)throw Error('Material manifest could not load');
 const manifest=await response.json(),loader=new T.TextureLoader(),anisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());
 async function set(name,repeat){
  const result={};await Promise.all(Object.entries(manifest[name].maps).map(async([role,entry])=>{
   const tex=await loader.loadAsync(entry.url);tex.name=`${name}:${role}`;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(...repeat);tex.anisotropy=anisotropy;tex.colorSpace=role==='Diffuse'?T.SRGBColorSpace:T.NoColorSpace;result[role]=tex;
  }));return result;
 }
 const [timber,floor,wall,cotton,wool]=await Promise.all([set('wood_table_worn',[1,.18]),set('wood_floor',[3,2]),set('painted_plaster_wall',[4,2.3]),set('cotton_jersey',[2,1]),set('wool_boucle',[2,1])]);
 const standard=(maps,normalScale,colour=0xffffff)=>new T.MeshStandardMaterial({color:colour,map:maps.Diffuse,normalMap:maps.nor_gl,normalScale:new T.Vector2(normalScale,normalScale),roughnessMap:maps.Rough,roughness:1});
 return {wood:standard(timber,.25),floor:standard(floor,.45),wall:standard(wall,.18,'#fff5e5'),cotton,wool};
}

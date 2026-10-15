import {applyRoomAmbientOcclusion} from './textile-ambient-occlusion.js?v=60';
import * as T from 'three';
import { applySurfaceRelief } from './surface-relief.js?v=28';
import { applyRoomDaylight } from './room-daylight.js?v=60';
export async function addStreamRoom(scene,renderer){
 const manifest=await(await fetch('./assets/materials-provenance.json?v=27')).json(),loader=new T.TextureLoader();
 async function surface(name,repeat){const maps={};await Promise.all(Object.entries(manifest[name].maps).map(async([role,entry])=>{const t=await loader.loadAsync(entry.url);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(...repeat);t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());t.colorSpace=role==='Diffuse'?T.SRGBColorSpace:T.NoColorSpace;maps[role]=t}));return maps;}
 const [plaster,oak]=await Promise.all([surface('painted_plaster_wall',[3,2]),surface('wood_floor',[3,3])]);
 const wallMat=new T.MeshStandardMaterial({color:'#f3e9d9',map:plaster.Diffuse,roughness:1,normalMap:plaster.nor_gl,normalScale:new T.Vector2(.85,.85),roughnessMap:plaster.Rough});
 applyRoomDaylight(wallMat);applyRoomAmbientOcclusion(wallMat,'wall');const wall=new T.Mesh(new T.BoxGeometry(12,.16,8),wallMat);wall.position.set(0,.12,4);wall.receiveShadow=true;wall.name='Restored 3D lime plaster wall';scene.add(wall);
 const floorMat=new T.MeshStandardMaterial({map:oak.Diffuse,normalMap:oak.nor_gl,normalScale:new T.Vector2(1,1),roughnessMap:oak.Rough,roughness:.96});applySurfaceRelief(floorMat,oak.Displacement,.001);applyRoomDaylight(floorMat);applyRoomAmbientOcclusion(floorMat,'floor');const floor=new T.Mesh(new T.BoxGeometry(12,12,.1),floorMat);floor.position.set(0,-5.8,-.05);floor.receiveShadow=true;floor.name='Restored 3D oak floor and collision plane';scene.add(floor);
 // A shallow timber skirting floats clear of plaster and floor. Reuse the
 // scanned oak images, with independent UV repeats for long horizontal grain.
 const trimMaps={};for(const role of ['Diffuse','nor_gl','Rough','Displacement']){trimMaps[role]=oak[role].clone();trimMaps[role].repeat.set(3,.12);trimMaps[role].needsUpdate=true;}
 const trimMat=new T.MeshStandardMaterial({color:'#aa7651',map:trimMaps.Diffuse,normalMap:trimMaps.nor_gl,normalScale:new T.Vector2(.65,.65),roughnessMap:trimMaps.Rough,roughness:.9});applySurfaceRelief(trimMat,trimMaps.Displacement,.0007);applyRoomDaylight(trimMat);applyRoomAmbientOcclusion(trimMat,'trim');
 const skirting=new T.Mesh(new T.BoxGeometry(12,.06,.16),trimMat);skirting.position.set(0,-.005,.10);skirting.castShadow=true;skirting.receiveShadow=true;skirting.name='Oak skirting with recessed shadow gap';scene.add(skirting);
 const lip=new T.Mesh(new T.BoxGeometry(12,.068,.012),trimMat);lip.position.set(0,-.009,.182);lip.castShadow=true;lip.receiveShadow=true;lip.name='Skirting top edge';scene.add(lip);
 return {wall,floor,skirting};
}

// The continuous strip only needs these two yarn maps; no unused rail/cotton sets.
export async function loadStreamYarn(renderer){const map=await new T.TextureLoader().loadAsync('./assets/yarn/wool-normal-256.png?v=36');map.wrapS=map.wrapT=T.RepeatWrapping;map.repeat.set(.5,.08);map.anisotropy=Math.min(2,renderer.capabilities.getMaxAnisotropy());return {wool:{nor_gl:map}};}

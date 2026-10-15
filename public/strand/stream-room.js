import * as T from 'three';
import { applySurfaceRelief } from './surface-relief.js?v=28';
import { applyRoomDaylight } from './room-daylight.js?v=29';
export async function addStreamRoom(scene,renderer){
 const manifest=await(await fetch('./assets/materials-provenance.json?v=27')).json(),loader=new T.TextureLoader();
 async function surface(name,repeat){const maps={};await Promise.all(Object.entries(manifest[name].maps).map(async([role,entry])=>{const t=await loader.loadAsync(entry.url);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(...repeat);t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());t.colorSpace=role==='Diffuse'?T.SRGBColorSpace:T.NoColorSpace;maps[role]=t}));return maps;}
 const [plaster,oak]=await Promise.all([surface('painted_plaster_wall',[3,2]),surface('wood_floor',[3,3])]);
 const wallMat=new T.MeshStandardMaterial({color:'#cdbfa7',roughness:1,normalMap:plaster.nor_gl,normalScale:new T.Vector2(.35,.35),roughnessMap:plaster.Rough});
 applyRoomDaylight(wallMat);const wall=new T.Mesh(new T.BoxGeometry(12,.16,8),wallMat);wall.position.set(0,.12,4);wall.receiveShadow=true;wall.name='Restored 3D lime plaster wall';scene.add(wall);
 const floorMat=new T.MeshStandardMaterial({map:oak.Diffuse,normalMap:oak.nor_gl,normalScale:new T.Vector2(1,1),roughnessMap:oak.Rough,roughness:.96});applySurfaceRelief(floorMat,oak.Displacement,.001);applyRoomDaylight(floorMat);const floor=new T.Mesh(new T.BoxGeometry(12,12,.1),floorMat);floor.position.set(0,-5.8,-.05);floor.receiveShadow=true;floor.name='Restored 3D oak floor and collision plane';scene.add(floor);
 return {wall,floor};
}

// The continuous strip only needs these two yarn maps; no unused rail/cotton sets.
export async function loadStreamYarn(renderer){const map=await new T.TextureLoader().loadAsync('./assets/yarn/wool-normal-256.png?v=36');map.wrapS=map.wrapT=T.RepeatWrapping;map.repeat.set(.5,.08);map.anisotropy=Math.min(2,renderer.capabilities.getMaxAnisotropy());return {wool:{nor_gl:map}};}

import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
// One original low-poly mesh, one baked colour/AO atlas. No runtime furniture PBR.
export async function addHeritageRoom(scene,renderer){
 const {scene:props}=await new GLTFLoader().loadAsync('./assets/room/heritage-room.glb?v=33');
 props.name='Heritage room furnishings';props.rotation.x=Math.PI/2;
 let triangles=0,meshes=0;
 props.traverse(mesh=>{if(!mesh.isMesh)return;const source=mesh.material,map=source.map||source.emissiveMap;if(!map)throw Error('The baked room atlas is missing');map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());mesh.material=new T.MeshBasicMaterial({map,color:0xffffff,side:T.DoubleSide});source.dispose();mesh.castShadow=true;triangles+=(mesh.geometry.index?.count||mesh.geometry.attributes.position.count)/3;meshes++;});
 scene.add(props);renderer.shadowMap.needsUpdate=true;return {props,triangles,meshes};
}

import {FIRST_PRINT_LENGTH} from './print-sections.js?v=156';
import * as T from 'three';
// Reuse the existing WebGL context for one export. All view/simulation state is
// restored synchronously before the browser can paint the live canvas again.
export function preserveMemoryView({renderer,pipeline,camera,cloth}){
 const size=renderer.getSize(new T.Vector2()),position=camera.position.clone(),rotation=camera.quaternion.clone(),aspect=camera.aspect,shadows=renderer.shadowMap.enabled;
 const state={archive:cloth.archive,groupPosition:cloth.group.position.clone(),groupScale:cloth.group.scale.clone(),groupRotation:cloth.group.rotation.clone(),top:cloth.sim.top,length:cloth.sim.length,scroll:cloth.scrollOffset,head:cloth.story.streamHead.value,remaining:cloth.story.streamRemaining.value,positions:cloth.sim.positions.slice(),offset:cloth.sim.offset?.slice(),velocity:cloth.sim.velocity?.slice(),mask:cloth.viewportMask.slice(),tick:cloth.viewportTick,turning:cloth.uniforms?.streamTurning?.value,backSide:cloth.backSide,turnTwist:cloth.turnTwist};
 return()=>{
  renderer.shadowMap.enabled=shadows;camera.aspect=aspect;camera.position.copy(position);camera.quaternion.copy(rotation);camera.updateProjectionMatrix();camera.updateMatrixWorld();renderer.setSize(size.x,size.y,false);pipeline.resize(size.x,size.y);
  cloth.setBack(state.backSide);if(cloth.uniforms?.streamTurning)cloth.uniforms.streamTurning.value=state.turning;cloth.turnTwist=state.turnTwist;cloth.archive=state.archive;cloth.paletteKey=null;cloth.group.position.copy(state.groupPosition);cloth.group.scale.copy(state.groupScale);cloth.group.rotation.copy(state.groupRotation);cloth.scrollOffset=state.scroll;cloth.story.streamHead.value=state.head;cloth.story.streamRemaining.value=state.remaining;cloth.sim.top=state.top;if(state.offset)cloth.sim.offset.set(state.offset);if(state.velocity)cloth.sim.velocity.set(state.velocity);cloth.rebuildPalette();cloth.setLength(state.length,false);cloth.viewportMask.set(state.mask);cloth.viewportTick=state.tick;cloth.sim.positions.set(state.positions);cloth.display=cloth.sim.positions;cloth.upload();renderer.shadowMap.needsUpdate=true;pipeline.render();
 };
}
export function captureMemoryThumbnail({renderer,pipeline,camera,cloth,entry,rugHeight=1100,archive=null,gallery=false}){
 const restore=preserveMemoryView({renderer,pipeline,camera,cloth});
 const image=document.createElement('canvas');image.width=gallery?160:1080;image.height=gallery?396:1920;
 try{
  cloth.setBack(false);cloth.setTurn(0);cloth.group.scale.set(1,1,1);renderer.shadowMap.enabled=false;renderer.setSize(image.width,image.height,false);pipeline.resize(image.width,image.height);camera.aspect=1080/1920;const height=Math.max(entry.length*1920/rugHeight,cloth.sim.width/camera.aspect*1.3),centre=entry.length/2-height*(.5-170/1920),postcardWidth=704;camera.aspect=cloth.sim.width/height*1920/postcardWidth*(1080/1920);let viewHeight=height,viewCentre=centre;if(gallery){viewHeight=Math.max(FIRST_PRINT_LENGTH,cloth.sim.width/(image.width/image.height))*1.015;cloth.group.scale.set(1,1,FIRST_PRINT_LENGTH/entry.length);viewCentre=0;camera.aspect=image.width/image.height;cloth.group.rotation.set(0,0,0);cloth.group.position.set(0,0,0);}camera.position.set(0,-.19-viewHeight/(2*Math.tan(camera.fov*Math.PI/360)),viewCentre);camera.lookAt(0,-.19,viewCentre);camera.updateProjectionMatrix();camera.updateMatrixWorld();
  if(archive)cloth.archive=archive;cloth.paletteKey=null;cloth.scrollOffset=cloth.archive.length-entry.end;cloth.story.streamRemaining.value=0;cloth.story.streamHead.value=entry.end;cloth.sim.top=entry.length/2;cloth.sim.offset?.fill(0);cloth.sim.velocity?.fill(0);cloth.rebuildPalette();cloth.setLength(entry.length);renderer.shadowMap.needsUpdate=true;pipeline.render();image.rugBounds={left:(1080-postcardWidth)/2,right:(1080+postcardWidth)/2,top:170,bottom:170+entry.length/height*1920};image.getContext('2d').drawImage(renderer.domElement,0,0,image.width,image.height);return image;
 }finally{
  restore();
 }
}

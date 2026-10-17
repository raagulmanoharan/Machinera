import * as T from 'three';
// Reuse the existing WebGL context for one export. All view/simulation state is
// restored synchronously before the browser can paint the live canvas again.
export function captureMemoryThumbnail({renderer,pipeline,camera,cloth,entry}){
 const size=renderer.getSize(new T.Vector2()),position=camera.position.clone(),rotation=camera.quaternion.clone(),aspect=camera.aspect;
 const state={top:cloth.sim.top,length:cloth.sim.length,scroll:cloth.scrollOffset,head:cloth.story.streamHead.value,remaining:cloth.story.streamRemaining.value,positions:cloth.sim.positions.slice(),offset:cloth.sim.offset?.slice(),velocity:cloth.sim.velocity?.slice(),mask:cloth.viewportMask.slice(),tick:cloth.viewportTick};
 const image=document.createElement('canvas');image.width=972;image.height=900;
 try{
  renderer.setSize(972,900,false);pipeline.resize(972,900);camera.aspect=972/900;const height=Math.max(entry.length*1.08,cloth.sim.width/camera.aspect*1.15);camera.position.set(0,-.19-height/(2*Math.tan(camera.fov*Math.PI/360)),0);camera.lookAt(0,-.19,0);camera.updateProjectionMatrix();camera.updateMatrixWorld();
  cloth.scrollOffset=cloth.archive.length-entry.end;cloth.story.streamRemaining.value=0;cloth.story.streamHead.value=entry.end;cloth.sim.top=entry.length/2;cloth.sim.offset?.fill(0);cloth.sim.velocity?.fill(0);cloth.rebuildPalette();cloth.setLength(entry.length);renderer.shadowMap.needsUpdate=true;pipeline.render();image.getContext('2d').drawImage(renderer.domElement,0,0,972,900);return image;
 }finally{
  camera.aspect=aspect;camera.position.copy(position);camera.quaternion.copy(rotation);camera.updateProjectionMatrix();camera.updateMatrixWorld();renderer.setSize(size.x,size.y,false);pipeline.resize(size.x,size.y);
  cloth.scrollOffset=state.scroll;cloth.story.streamHead.value=state.head;cloth.story.streamRemaining.value=state.remaining;cloth.sim.top=state.top;if(state.offset)cloth.sim.offset.set(state.offset);if(state.velocity)cloth.sim.velocity.set(state.velocity);cloth.rebuildPalette();cloth.setLength(state.length,false);cloth.viewportMask.set(state.mask);cloth.viewportTick=state.tick;cloth.sim.positions.set(state.positions);cloth.display=cloth.sim.positions;cloth.upload();renderer.shadowMap.needsUpdate=true;pipeline.render();
 }
}

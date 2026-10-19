import * as T from 'three';
// Reuse the existing WebGL context for one export. All view/simulation state is
// restored synchronously before the browser can paint the live canvas again.
export function captureMemoryThumbnail({renderer,pipeline,camera,cloth,entry,rugHeight=1100}){
 const size=renderer.getSize(new T.Vector2()),position=camera.position.clone(),rotation=camera.quaternion.clone(),aspect=camera.aspect,shadows=renderer.shadowMap.enabled;
 const state={top:cloth.sim.top,length:cloth.sim.length,scroll:cloth.scrollOffset,head:cloth.story.streamHead.value,remaining:cloth.story.streamRemaining.value,positions:cloth.sim.positions.slice(),offset:cloth.sim.offset?.slice(),velocity:cloth.sim.velocity?.slice(),mask:cloth.viewportMask.slice(),tick:cloth.viewportTick};
 const image=document.createElement('canvas');image.width=1080;image.height=1920;
 try{
  renderer.shadowMap.enabled=false;renderer.setSize(1080,1920,false);pipeline.resize(1080,1920);camera.aspect=1080/1920;const height=Math.max(entry.length*1920/rugHeight,cloth.sim.width/camera.aspect*1.3),centre=entry.length/2-height*(.5-170/1920),postcardWidth=704;camera.aspect=cloth.sim.width/height*1920/postcardWidth*(1080/1920);camera.position.set(0,-.19-height/(2*Math.tan(camera.fov*Math.PI/360)),centre);camera.lookAt(0,-.19,centre);camera.updateProjectionMatrix();camera.updateMatrixWorld();
  cloth.scrollOffset=cloth.archive.length-entry.end;cloth.story.streamRemaining.value=0;cloth.story.streamHead.value=entry.end;cloth.sim.top=entry.length/2;cloth.sim.offset?.fill(0);cloth.sim.velocity?.fill(0);cloth.rebuildPalette();cloth.setLength(entry.length);renderer.shadowMap.needsUpdate=true;pipeline.render();image.rugBounds={left:(1080-postcardWidth)/2,right:(1080+postcardWidth)/2,top:170,bottom:170+entry.length/height*1920};image.getContext('2d').drawImage(renderer.domElement,0,0,1080,1920);return image;
 }finally{
  renderer.shadowMap.enabled=shadows;camera.aspect=aspect;camera.position.copy(position);camera.quaternion.copy(rotation);camera.updateProjectionMatrix();camera.updateMatrixWorld();renderer.setSize(size.x,size.y,false);pipeline.resize(size.x,size.y);
  cloth.scrollOffset=state.scroll;cloth.story.streamHead.value=state.head;cloth.story.streamRemaining.value=state.remaining;cloth.sim.top=state.top;if(state.offset)cloth.sim.offset.set(state.offset);if(state.velocity)cloth.sim.velocity.set(state.velocity);cloth.rebuildPalette();cloth.setLength(state.length,false);cloth.viewportMask.set(state.mask);cloth.viewportTick=state.tick;cloth.sim.positions.set(state.positions);cloth.display=cloth.sim.positions;cloth.upload();renderer.shadowMap.needsUpdate=true;pipeline.render();
 }
}

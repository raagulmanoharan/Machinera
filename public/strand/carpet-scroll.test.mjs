import assert from 'node:assert/strict';
import {CarpetScroll,clothFeedTop} from './carpet-scroll.js';
globalThis.innerHeight=844;
for(const aspect of [390/844,430/932,1440/900]){
 const camera={fov:32,position:{y:-7.4*Math.max(1,.48/aspect),z:1.5}};
 const viewHeight=2*Math.abs(camera.position.y+.19)*Math.tan(camera.fov*Math.PI/360);
 assert.ok(Math.abs(clothFeedTop(camera)-(camera.position.z+viewHeight/2))<.021,'Only a tiny feeder margin is above the viewport');
 let resized=0;const cloth={sim:{top:4.35,length:3.8},archive:{entries:[{length:3.8}]},visibleLength:3.8,totalLength:11,setLength(length){resized++;assert.equal(length,3.8);},setScrollOffset(offset){this.offset=offset;return false;}};
 const root={scrollTop:0,addEventListener(){},removeEventListener(){}},spacer={style:{}};
 const scroll=new CarpetScroll(root,spacer,cloth,camera,()=>{});
 assert.equal(resized,1);assert.equal(cloth.sim.top,camera.position.z+1.9);scroll.refresh();assert.equal(resized,1,'Unchanged framing does not repack geometry');
 root.scrollTop=parseFloat(spacer.style.height)-innerHeight;scroll.sync();
 assert.equal(cloth.offset,0,'The loom shows only the current individual rug');
 assert.equal(parseFloat(spacer.style.height),innerHeight,'No continuous cloth scroll extent');
 cloth.print={section:3.8};cloth.story={streamRemaining:{value:3.8}};scroll.refresh();
 assert.ok(Math.abs(cloth.sim.top-(camera.position.z+viewHeight/2))<1e-6,'Print starts at the top edge');
 const start=cloth.sim.top;cloth.story.streamRemaining.value=1.9;scroll.refresh();assert.equal(cloth.sim.top,start,'Rug stays at feed while the camera carries the photo away');cloth.story.streamRemaining.value=.38;scroll.refresh();
 assert.ok(cloth.sim.top<start&&cloth.sim.top>camera.position.z+1.9,'Print moves towards the centre');
 cloth.print=null;scroll.refresh();assert.equal(cloth.sim.top,camera.position.z+1.9,'Complete rug lands in the centre');
 scroll.dispose();
}

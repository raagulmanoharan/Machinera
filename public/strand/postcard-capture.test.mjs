import assert from 'node:assert/strict';
import * as T from 'three';
import {captureMemoryThumbnail} from './postcard-capture.js';
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({drawImage(){}})})};
for(const length of [2.4,3.8])for(const fail of [false,true]){
 const original={length:7.6},archive={length:11.4},group=new T.Group();group.rotation.z=Math.PI;group.position.y=-.38;
 const cloth={archive:original,group,backSide:true,turnTwist:false,sim:{top:3.4,length:3.8,positions:new Float32Array([1,2,3])},scrollOffset:0,story:{streamHead:{value:7.6},streamRemaining:{value:0}},viewportMask:new Uint8Array([1]),viewportTick:4,
 setBack(back){this.backSide=back;},setTurn(angle){this.group.rotation.z=angle;},rebuildPalette(){},setLength(length){this.sim.length=length;this.sim.positions.fill(8);},upload(){}};
 const camera=new T.PerspectiveCamera(32,390/844,.03,40);camera.position.set(0,-10,1.5);const position=camera.position.clone(),rotation=camera.quaternion.clone();
 const size=new T.Vector2(390,844),renderer={shadowMap:{enabled:true},domElement:{},getSize:target=>target.copy(size),setSize:(x,y)=>size.set(x,y)};
 let renders=0;const pipeline={resize(){},render(){if(++renders===1){assert.equal(cloth.archive,archive);assert.equal(cloth.group.rotation.z,0);assert.equal(group.scale.z,3.8/length);cloth.backSide=false;cloth.turnTwist=true;if(fail)throw new Error('Capture failed');}}};
 const run=()=>captureMemoryThumbnail({renderer,pipeline,camera,cloth,archive,entry:{length,end:length},gallery:true});
 if(fail)assert.throws(run,/Capture failed/);else{const image=run();assert.equal(image.width,160);assert.equal(image.height,396);}
 assert.equal(cloth.archive,original);assert.equal(cloth.backSide,true);assert.equal(cloth.turnTwist,false);assert.equal(group.rotation.z,Math.PI);assert.equal(group.position.y,-.38);assert.deepEqual(group.scale.toArray(),[1,1,1]);
 assert.equal(cloth.sim.top,3.4);assert.equal(cloth.sim.length,3.8);assert.deepEqual([...cloth.sim.positions],[1,2,3]);
 assert.equal(cloth.story.streamHead.value,7.6);assert.deepEqual(size.toArray(),[390,844]);assert.ok(camera.position.equals(position));assert.ok(camera.quaternion.equals(rotation));assert.equal(renderer.shadowMap.enabled,true);
}
console.log('Gallery captures restore the loom, camera, archive and renderer even on failure');

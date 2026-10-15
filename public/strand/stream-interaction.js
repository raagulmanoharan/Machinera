import * as T from 'three';
// Carpet-only gestures: background drags, wheels and additional touches never move the room.
export function installClothInteraction({canvas,camera,cloth,render,onInteraction}){
 const ray=new T.Raycaster(),pointer=new T.Vector2(),plane=new T.Plane(),target=new T.Vector3(),direction=new T.Vector3();let drag=null;
 function cast(e){const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);ray.setFromCamera(pointer,camera);}
 canvas.addEventListener('pointerdown',e=>{if(drag||e.button>0)return;cast(e);const hit=ray.intersectObject(cloth.hit,false)[0];if(!hit)return;e.preventDefault();drag={id:e.pointerId,y:hit.point.y,x:e.clientX,screenY:e.clientY,uv:hit.uv.clone(),travel:0,time:performance.now()};plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(direction),hit.point);cloth.sim.hold(hit.uv.x,hit.uv.y,hit.point.toArray());canvas.setPointerCapture(e.pointerId);onInteraction?.('grab');render();});
 canvas.addEventListener('pointermove',e=>{if(drag?.id!==e.pointerId)return;e.preventDefault();cast(e);if(!ray.ray.intersectPlane(plane,target))return;const d=Math.hypot(e.clientX-drag.x,e.clientY-drag.screenY);drag.travel=Math.max(drag.travel,d);target.y=drag.y-.04-Math.min(.18,d*.0005);cloth.sim.move(target.toArray());render();});
 function finish(e){if(!drag||e&&e.pointerId!==drag.id)return;const id=drag.id;cloth.sim.release();if(e?.type==='pointerup'&&drag.travel<6&&performance.now()-drag.time<180)cloth.sim.impulse(drag.uv.x,drag.uv.y);drag=null;if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);onInteraction?.('release');render();}
 for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,finish);
 canvas.addEventListener('wheel',e=>e.preventDefault(),{passive:false});window.addEventListener('blur',()=>finish());document.addEventListener('visibilitychange',()=>{if(document.hidden)finish();});
}

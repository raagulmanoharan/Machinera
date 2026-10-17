// Native scroll extent with a fixed-size, interactive 3D material window.
// Keep the feeder just beyond the visible top, independent of screen aspect.
export function clothFeedTop(camera){const viewHeight=2*Math.abs(camera.position.y+.19)*Math.tan(camera.fov*Math.PI/360);return camera.position.z+viewHeight/2+.02;}
export class CarpetScroll{
 constructor(root,spacer,cloth,camera,onChange){Object.assign(this,{root,spacer,cloth,camera,onChange});this.pixelsPerMetre=180;this.signature='';this.frame=null;this.scroll=()=>this.sync();root.addEventListener('scroll',this.scroll,{passive:true});this.refresh();}
 refresh(){const top=clothFeedTop(this.camera);if(Math.abs(this.cloth.sim.top-top)>1e-6){this.cloth.sim.top=top;this.cloth.setLength(this.cloth.sim.length);}const height=innerHeight,viewHeight=2*Math.abs(this.camera.position.y+.19)*Math.tan(this.camera.fov*Math.PI/360),bottomDistance=this.cloth.sim.top-this.camera.position.z+viewHeight/2;this.pixelsPerMetre=height/viewHeight;const max=Math.max(0,this.cloth.totalLength-bottomDistance+viewHeight*.12),size=Math.ceil(height+max*this.pixelsPerMetre),key=size+':'+height;if(key!==this.signature){this.signature=key;this.spacer.style.height=size+'px';this.sync();}}
 sync(){if(this.cloth.setScrollOffset(this.root.scrollTop/this.pixelsPerMetre))this.onChange();}
 move(pixels){this.stop();this.root.scrollTop+=pixels;this.sync();}
 release(velocity){this.stop();if(Math.abs(velocity)<.05)return;let previous=null;const tick=time=>{const dt=previous===null?16:Math.min(40,time-previous);previous=time;const before=this.root.scrollTop;this.root.scrollTop+=velocity*dt;this.sync();velocity*=Math.exp(-dt/180);if(Math.abs(velocity)>.015&&Math.abs(this.root.scrollTop-before)>.1)this.frame=requestAnimationFrame(tick);else this.frame=null;};this.frame=requestAnimationFrame(tick);}
 stop(){if(this.frame!==null)cancelAnimationFrame(this.frame);this.frame=null;}
 reset(){this.stop();this.root.scrollTop=0;this.sync();}
 dispose(){this.stop();this.root.removeEventListener('scroll',this.scroll);}
}

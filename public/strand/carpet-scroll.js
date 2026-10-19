export function rugLandingProgress(progress){const t=Math.max(0,Math.min(1,(progress-.8)/.2));return t*t*t*(t*(t*6-15)+10);}
// Native scroll extent with a fixed-size, interactive 3D material window.
// Keep the feeder just beyond the visible top, independent of screen aspect.
export function clothFeedTop(camera){const viewHeight=2*Math.abs(camera.position.y+.19)*Math.tan(camera.fov*Math.PI/360);return camera.position.z+viewHeight/2+.02;}
export class CarpetScroll{
 constructor(root,spacer,cloth,camera,onChange){Object.assign(this,{root,spacer,cloth,camera,onChange});this.pixelsPerMetre=180;this.signature='';this.frame=null;this.scroll=()=>this.sync();root.addEventListener('scroll',this.scroll,{passive:true});this.refresh();}
 refresh(){const entry=this.cloth.archive.entries.at(-1),length=entry?.length??0,viewHeight=2*Math.abs(this.camera.position.y+.19)*Math.tan(this.camera.fov*Math.PI/360),progress=this.cloth.print?1-this.cloth.story.streamRemaining.value/this.cloth.print.section:1,top=this.camera.position.z+length/2+(viewHeight-length)/2*(this.cloth.print?.handoff?0:1-(this.cloth.print?.regenerating?progress:rugLandingProgress(progress)));if(Math.abs(this.cloth.sim.top-top)>1e-6){this.cloth.sim.top=top;this.cloth.setLength(this.cloth.visibleLength);}if(globalThis.document)document.documentElement.style.setProperty('--rug-bottom',(innerHeight*(.5+length/viewHeight/2))+'px');this.spacer.style.height=innerHeight+'px';this.root.scrollTop=0;}

 sync(){if(this.cloth.setScrollOffset(this.root.scrollTop/this.pixelsPerMetre))this.onChange();}
 move(pixels){this.stop();this.root.scrollTop+=pixels;this.sync();}
 release(velocity){this.stop();if(Math.abs(velocity)<.05)return;let previous=null;const tick=time=>{const dt=previous===null?16:Math.min(40,time-previous);previous=time;const before=this.root.scrollTop;this.root.scrollTop+=velocity*dt;this.sync();velocity*=Math.exp(-dt/180);if(Math.abs(velocity)>.015&&Math.abs(this.root.scrollTop-before)>.1)this.frame=requestAnimationFrame(tick);else this.frame=null;};this.frame=requestAnimationFrame(tick);}
 stop(){if(this.frame!==null)cancelAnimationFrame(this.frame);this.frame=null;}
 reset(){this.stop();this.root.scrollTop=0;this.sync();}
 dispose(){this.stop();this.root.removeEventListener('scroll',this.scroll);}
}

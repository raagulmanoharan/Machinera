// One wall-clock timeline moves both floors, independently of cloth frame pacing.
// Quintic easing has zero velocity and acceleration at both ends.
const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*t*(t*(t*6-15)+10);};
// Both floors and the photograph occupy one vertical coordinate system.
// Photo travel includes the same camera displacement as the floor pan, so
// its screen position advances at exactly the same normalized pace.
export function bridgePose(t,height,photoHeight,feed=true){
 const progress=ease(t),pan=progress*height;
 return {progress,pan,roomY:height-pan,photoY:feed?progress*(height+photoHeight):0,screenPhotoY:feed?progress*photoHeight:-pan};
}
export class PhotoRugBridge{
 constructor(stage){this.stage=stage;this.active=false;this.frame=null;}
 begin(preview,lens,section,{feed=true,onFrame=()=>{},prepared=Promise.resolve(),onPrepared=()=>{}}={}){
  this.dispose();this.section=section;this.capture=lens.closest('#capture');this.height=innerHeight;this.feedHeight=lens.clientHeight;
  if(!preview.hidden&&preview.width&&preview.height){const canvas=document.createElement('canvas');canvas.width=Math.min(768,preview.width);canvas.height=Math.round(canvas.width*preview.height/preview.width);canvas.getContext('2d').drawImage(preview,0,0,canvas.width,canvas.height);canvas.className='photo-feed-frame';canvas.setAttribute('aria-hidden','true');lens.append(canvas);this.canvas=canvas;
   if(feed){const dither=document.createElement('canvas');dither.width=canvas.width;dither.height=canvas.height;const ctx=dither.getContext('2d',{willReadFrequently:true});ctx.drawImage(canvas,0,0);const pixels=ctx.getImageData(0,0,dither.width,dither.height),bayer=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];for(let y=0;y<dither.height;y++)for(let x=0;x<dither.width;x++){const i=(y*dither.width+x)*4,threshold=(bayer[(y%4)*4+x%4]+.5)/16;for(let c=0;c<3;c++){const v=pixels.data[i+c]/255*7;pixels.data[i+c]=Math.min(7,Math.floor(v)+(v%1>threshold?1:0))*255/7;}}ctx.putImageData(pixels,0,0);dither.className='photo-dither';canvas.after(dither);canvas.remove();const holder=document.createElement('div');holder.className='photo-feed-frame';holder.append(canvas,dither);lens.append(holder);canvas.className='photo-feed-source';this.canvas=holder;this.dither=dither;}
}
  this.feed=feed;this.preparedDelivered=false;this.active=true;let preparedReady=!feed;prepared.then(()=>{if(this.active){preparedReady=true;}}).catch(()=>this.finish());this.capture.classList.add('capture-feeding');this.stage.classList.add('floor-travelling');this.stage.style.pointerEvents='none';this.stage.style.opacity='1';this.update(0);
  const promise=new Promise(resolve=>{this.resolve=resolve;});const duration=feed?5200:1500;const started=document.timeline.currentTime;let waiting=false;
  // Native compositor animations keep the floor pan moving even while the main
  // thread submits a textile frame. Every layer uses the same document clock.
  this.animations=[];
  if(this.capture.animate){const origin=started,frames=fn=>Array.from({length:61},(_,i)=>({...fn(i/60),offset:i/60})),animate=(element,fn)=>{const animation=element.animate(frames(fn),{duration,fill:'both',easing:'linear'});animation.startTime=origin;this.animations.push(animation);};
   animate(this.capture,t=>({transform:`translate3d(0,${-ease(t)*this.height}px,0)`}));
   animate(this.stage,t=>({transform:`translate3d(0,${(1-ease(t))*this.height}px,0)`}));
   if(this.dither)animate(this.dither,t=>({clipPath:`inset(0 0 ${100*(1-ease(t/.68))}% 0)`}));
   if(this.canvas)animate(this.canvas,t=>({transform:`translate3d(0,${bridgePose(t,this.height,this.feedHeight,this.feed).photoY}px,0)`}));
   animate(this.capture.querySelector('.camera-heading'),t=>({opacity:1-ease(t/.45)}));
   animate(this.capture.querySelector('.finder-markers'),t=>({opacity:.36*(1-ease(t/.6))}));
  }
  const master=this.animations[0];
  const tick=()=>{if(!this.active)return;
   // Read the compositor's clock instead of racing a second RAF clock.
   let elapsed=master?.currentTime??(document.timeline.currentTime-started);
   if(feed&&!preparedReady&&elapsed>=1900&&!waiting){waiting=true;for(const a of this.animations){a.pause();a.currentTime=1900;}elapsed=1900;}
   if(waiting&&preparedReady){waiting=false;for(const a of this.animations)a.play();}
   const t=Math.min(1,elapsed/duration);
   if(preparedReady&&!this.preparedDelivered&&(!feed||t>=.4)){this.preparedDelivered=true;onPrepared();}
   this.update(t,!master);onFrame();if(this.active)this.frame=requestAnimationFrame(tick);
  };this.frame=requestAnimationFrame(tick);return promise;
 }
 update(t,writeStyles=true){if(!this.active)return;const pose=bridgePose(t,this.height,this.feedHeight,this.feed);
  if(writeStyles){if(this.canvas)this.canvas.style.transform=`translate3d(0,${pose.photoY}px,0)`;
   this.capture.style.setProperty('--floor-pan',-pose.pan+'px');this.capture.style.setProperty('--heading-opacity',String(1-ease(t/.45)));this.capture.style.setProperty('--finder-reticle',String(.36*(1-ease(t/.6))));this.stage.style.transform=`translate3d(0,${pose.roomY}px,0)`;
  }
  this.stage.dataset.bridgeDither=ease(t/.68).toFixed(3);this.stage.dataset.bridgePhotoY=pose.screenPhotoY.toFixed(1);this.stage.dataset.bridgeProgress=t.toFixed(3);this.stage.dataset.bridgeFloorPan=pose.pan.toFixed(1);this.stage.dataset.bridgePhotoVisible=String(!!this.canvas&&pose.photoY<this.feedHeight&&t<1);if(t>=1)this.finish();
 }

 finish(){const done=this.resolve;this.resolve=null;this.dispose();done?.();}
 dispose(){for(const animation of this.animations??[])animation.cancel();this.animations=[];if(this.frame!==null)cancelAnimationFrame(this.frame);this.frame=null;const done=this.resolve;this.resolve=null;if(this.canvas){for(const c of this.canvas.querySelectorAll?.("canvas")??[]){c.width=c.height=0;}this.canvas.remove();this.canvas=null;}this.dither=null;if(this.capture){for(const p of ['--floor-pan','--heading-opacity','--finder-reticle'])this.capture.style.removeProperty(p);this.capture.classList.remove('capture-feeding');this.capture=null;}for(const p of ['transform','opacity','pointer-events'])this.stage.style.removeProperty(p);this.stage.classList.remove('floor-travelling');this.active=false;done?.();}
}

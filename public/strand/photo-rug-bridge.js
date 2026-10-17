// Shared transforms follow rendered print progress; navigation uses wall time.
// Quintic easing has zero velocity and acceleration at both ends.
const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*t*(t*(t*6-15)+10);};
// Both floors and the photograph occupy one vertical coordinate system.
// Photo travel includes the same camera displacement as the floor pan, so
// its screen position advances at exactly the same normalized pace.
export function bridgePose(t,height,photoHeight,feed=true){
 const progress=ease(t),pan=progress*height;
 return {progress,pan,roomY:height-pan,photoY:feed?2*pan:0,screenPhotoY:feed?pan:-pan};
}
// Stretch only the remaining feed; retain exactly the length already shown.
export function createPrintProgressReader(getPrint,remainingSeconds=6.4){
 let state=null;
 return()=>{
  if(!state){const print=getPrint();if(!print)return 1;const fraction=Math.min(.99,print.time/print.duration);
   print.duration=remainingSeconds/(1-fraction);print.time=fraction*print.duration;
   print.hold=false;
   // Arrive while the feed is still in progress, then finish printing in view.
   state={print,start:print.time,span:(print.duration-print.time)*.45};
  }
  return Math.max(0,Math.min(1,(state.print.time-state.start)/state.span));
 };
}
export class PhotoRugBridge{
 constructor(stage){this.stage=stage;this.active=false;this.frame=null;}
 begin(preview,lens,section,{feed=true,prepared=Promise.resolve(),onPrepared=()=>{},readPrintProgress=null}={}){
  this.dispose();this.section=section;this.capture=lens.closest('#capture');this.height=innerHeight;this.feedHeight=lens.clientHeight;
  if(!preview.hidden&&preview.width&&preview.height){const canvas=document.createElement('canvas');canvas.width=Math.min(768,preview.width);canvas.height=Math.round(canvas.width*preview.height/preview.width);canvas.getContext('2d').drawImage(preview,0,0,canvas.width,canvas.height);canvas.className='photo-feed-frame';canvas.setAttribute('aria-hidden','true');lens.append(canvas);this.canvas=canvas;
   if(feed){const dither=document.createElement('canvas');dither.width=canvas.width;dither.height=canvas.height;const ctx=dither.getContext('2d',{willReadFrequently:true});ctx.drawImage(canvas,0,0);const pixels=ctx.getImageData(0,0,dither.width,dither.height),bayer=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];for(let y=0;y<dither.height;y++)for(let x=0;x<dither.width;x++){const i=(y*dither.width+x)*4,threshold=(bayer[(y%4)*4+x%4]+.5)/16;for(let c=0;c<3;c++){const v=pixels.data[i+c]/255*3;pixels.data[i+c]=Math.min(3,Math.floor(v)+(v%1>threshold?1:0))*255/3;}}ctx.putImageData(pixels,0,0);dither.className='photo-dither';canvas.after(dither);canvas.remove();const holder=document.createElement('div');holder.className='photo-feed-frame';holder.append(canvas,dither);lens.append(holder);canvas.className='photo-feed-source';this.canvas=holder;this.dither=dither;}
}
  this.feed=feed;this.active=true;const token={};this.token=token;
  this.capture.classList.add('capture-feeding');if(feed)this.capture.classList.add('capture-processing');this.stage.classList.add('floor-travelling');this.stage.style.pointerEvents='none';this.stage.style.opacity='1';this.update(0);
  this.stage.dataset.bridgePhase=feed?'processing':'panning';
  const promise=new Promise(resolve=>{this.resolve=resolve;});this.animations=[];
  const animate=(element,frames,duration)=>{if(!element?.animate)return null;const animation=element.animate(frames,{duration,fill:'both',easing:'linear'});this.animations.push(animation);return animation;};
  // Keep the entire frozen photograph stationary until a visible carpet frame
  // has actually been submitted. The dither is the only moving layer here.
  const dither=feed&&this.dither?animate(this.dither,[{clipPath:'inset(0 0 100% 0)'},{clipPath:'inset(0 0 0% 0)'}],2200):null;
  const startPan=()=>{if(!this.active||this.token!==token)return;
   this.capture.classList.remove('capture-processing');this.stage.dataset.bridgePhase='panning';const duration=feed?2800:1500,origin=document.timeline.currentTime;
   const frames=fn=>Array.from({length:61},(_,i)=>({...fn(i/60),offset:i/60}));
   const pan=(element,fn)=>{const animation=animate(element,frames(fn),duration);if(animation){if(feed&&readPrintProgress){animation.pause();animation.currentTime=0;}else animation.startTime=origin;}return animation;};
   const master=pan(this.capture,t=>({transform:`translate3d(0,${-ease(t)*this.height}px,0)`}));
   pan(this.stage,t=>({transform:`translate3d(0,${(1-ease(t))*this.height}px,0)`}));
   if(this.canvas)pan(this.canvas,t=>({transform:`translate3d(0,${bridgePose(t,this.height,this.feedHeight,this.feed).photoY}px,0)`}));
   pan(this.capture.querySelector('.camera-heading'),t=>({opacity:1-ease(t/.45)}));
   pan(this.capture.querySelector('.finder-markers'),t=>({opacity:.7*(1-ease(t/.6))}));
   // A print reveal follows submitted cloth progress, never a faster wall clock.
   // Ordinary floor navigation keeps the independent compositor animation.
   const tick=()=>{if(!this.active||this.token!==token)return;let progress;
    if(feed&&readPrintProgress){progress=Math.max(0,Math.min(1,readPrintProgress()));for(const animation of this.animations)if(animation!==dither)animation.currentTime=progress*duration;}
    else{const elapsed=master?.currentTime??(document.timeline.currentTime-origin);progress=Math.min(1,elapsed/duration);}
    this.update(progress,!master);if(this.active)this.frame=requestAnimationFrame(tick);
   };this.frame=requestAnimationFrame(tick);
  };
  const minimumDither=dither?dither.finished.catch(()=>{}):Promise.resolve();
  Promise.all([Promise.resolve(prepared),minimumDither]).then(()=>{if(this.active&&this.token===token)return onPrepared();}).then(startPan).catch(()=>{if(this.token===token)this.finish();});
  return promise;
 }

 update(t,writeStyles=true){if(!this.active)return;const pose=bridgePose(t,this.height,this.feedHeight,this.feed);
  if(writeStyles){if(this.canvas)this.canvas.style.transform=`translate3d(0,${pose.photoY}px,0)`;
   this.capture.style.setProperty('--floor-pan',-pose.pan+'px');this.capture.style.setProperty('--heading-opacity',String(1-ease(t/.45)));this.capture.style.setProperty('--finder-reticle',String(.36*(1-ease(t/.6))));this.stage.style.transform=`translate3d(0,${pose.roomY}px,0)`;
  }
  this.stage.dataset.bridgeDither=this.stage.dataset.bridgePhase==='panning'?'1.000':'0.000';this.stage.dataset.bridgePhotoY=pose.screenPhotoY.toFixed(1);this.stage.dataset.bridgeProgress=t.toFixed(3);this.stage.dataset.bridgeFloorPan=pose.pan.toFixed(1);this.stage.dataset.bridgePhotoVisible=String(!!this.canvas&&pose.photoY<this.feedHeight&&t<1);if(t>=1)this.finish();
 }

 finish(){const done=this.resolve;this.resolve=null;this.dispose();done?.();}
 dispose(){this.token=null;for(const animation of this.animations??[])animation.cancel();this.animations=[];if(this.frame!==null)cancelAnimationFrame(this.frame);this.frame=null;const done=this.resolve;this.resolve=null;if(this.canvas){for(const c of this.canvas.querySelectorAll?.("canvas")??[]){c.width=c.height=0;}this.canvas.remove();this.canvas=null;}this.dither=null;if(this.capture){for(const p of ['--floor-pan','--heading-opacity','--finder-reticle'])this.capture.style.removeProperty(p);this.capture.classList.remove('capture-feeding','capture-processing');this.capture=null;}for(const p of ['transform','opacity','pointer-events'])this.stage.style.removeProperty(p);this.stage.classList.remove('floor-travelling');this.active=false;done?.();}
}

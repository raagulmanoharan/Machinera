// One wall-clock timeline moves both floors, independently of cloth frame pacing.
// Quintic easing has zero velocity and acceleration at both ends.
const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*t*(t*(t*6-15)+10);};
export class PhotoRugBridge{
 constructor(stage){this.stage=stage;this.active=false;this.frame=null;}
 begin(preview,lens,section,{feed=true,onFrame=()=>{}}={}){
  this.dispose();this.section=section;this.capture=lens.closest('#capture');this.height=innerHeight;this.feedHeight=lens.clientHeight;
  if(!preview.hidden&&preview.width&&preview.height){const canvas=document.createElement('canvas');canvas.width=Math.min(768,preview.width);canvas.height=Math.round(canvas.width*preview.height/preview.width);canvas.getContext('2d').drawImage(preview,0,0,canvas.width,canvas.height);canvas.className='photo-feed-frame';canvas.setAttribute('aria-hidden','true');lens.append(canvas);this.canvas=canvas;}
  this.feed=feed;this.active=true;this.capture.classList.add('capture-feeding');this.stage.classList.add('floor-travelling');this.stage.style.pointerEvents='none';this.stage.style.opacity='1';this.update(0);
  const promise=new Promise(resolve=>{this.resolve=resolve;});const duration=feed?2100:1500;let started=null;
  // Native compositor animations keep the floor pan moving even while the main
  // thread submits a textile frame. Every layer uses the same document clock.
  this.animations=[];
  if(this.capture.animate){const origin=document.timeline.currentTime,frames=fn=>Array.from({length:61},(_,i)=>({...fn(i/60),offset:i/60})),animate=(element,fn)=>{const animation=element.animate(frames(fn),{duration,fill:'both',easing:'linear'});animation.startTime=origin;this.animations.push(animation);};
   animate(this.capture,t=>({transform:`translate3d(0,${-ease(t)*this.height}px,0)`}));
   animate(this.stage,t=>({transform:`translate3d(0,${(1-ease(t))*this.height}px,0)`}));
   if(this.canvas)animate(this.canvas,t=>({transform:`translate3d(0,${(this.feed?ease(t/.78):0)*this.feedHeight}px,0)`}));
   animate(this.capture.querySelector('.camera-heading'),t=>({opacity:1-ease(t/.45)}));
   animate(this.capture.querySelector('.finder-markers'),t=>({opacity:.36*(1-ease(t/.6))}));
  }
  const tick=time=>{if(!this.active)return;started??=time;const t=Math.min(1,(time-started)/duration);this.update(t);onFrame();if(this.active)this.frame=requestAnimationFrame(tick);};this.frame=requestAnimationFrame(tick);return promise;
 }
 update(t){if(!this.active)return;const pan=ease(t)*this.height,feed=this.feed?ease(t/.78):0;
  if(this.canvas)this.canvas.style.transform=`translate3d(0,${feed*this.feedHeight}px,0)`;
  this.capture.style.setProperty('--floor-pan',-pan+'px');this.capture.style.setProperty('--heading-opacity',String(1-ease(t/.45)));this.capture.style.setProperty('--finder-reticle',String(.36*(1-ease(t/.6))));this.stage.style.transform=`translate3d(0,${this.height-pan}px,0)`;
  this.stage.dataset.bridgeProgress=t.toFixed(3);this.stage.dataset.bridgeFloorPan=pan.toFixed(1);this.stage.dataset.bridgePhotoVisible=String(!!this.canvas&&feed<1&&t<1);if(t>=1)this.finish();
 }
 finish(){const done=this.resolve;this.resolve=null;this.dispose();done?.();}
 dispose(){for(const animation of this.animations??[])animation.cancel();this.animations=[];if(this.frame!==null)cancelAnimationFrame(this.frame);this.frame=null;const done=this.resolve;this.resolve=null;if(this.canvas){this.canvas.remove();this.canvas.width=this.canvas.height=0;this.canvas=null;}if(this.capture){for(const p of ['--floor-pan','--heading-opacity','--finder-reticle'])this.capture.style.removeProperty(p);this.capture.classList.remove('capture-feeding');this.capture=null;}for(const p of ['transform','opacity','pointer-events'])this.stage.style.removeProperty(p);this.stage.classList.remove('floor-travelling');this.active=false;done?.();}
}

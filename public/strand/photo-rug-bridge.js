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
export function createPrintProgressReader(getPrint,remainingSeconds=8){
 let state=null;const feed=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
 return()=>{
  if(!state){const print=getPrint();if(!print)return 1;const fraction=Math.min(.99,print.time/print.duration);
   print.duration=remainingSeconds/(1-fraction);print.time=fraction*print.duration;print.hold=false;
   state={print,start:feed(fraction),end:feed(fraction+(1-fraction)*.68)};
  }
  // Match submitted material displacement, including its acceleration, rather
  // than applying a second, unrelated ease to the simulation clock.
  const distance=Math.max(0,Math.min(1,(feed(state.print.time/state.print.duration)-state.start)/(state.end-state.start)));
  if(distance===0||distance===1)return distance;
  let lo=0,hi=1;for(let i=0;i<24;i++){const mid=(lo+hi)/2;if(ease(mid)<distance)lo=mid;else hi=mid;}return(lo+hi)/2;
 };
}
export class PhotoRugBridge{
 constructor(stage){this.stage=stage;this.active=false;this.frame=null;}
 begin(preview,lens,section,{feed=true,prepared=Promise.resolve(),onPrepared=()=>{},readPrintProgress=null,onScanStart=()=>()=>{}}={}){
  this.dispose();this.section=section;this.capture=lens.closest('#capture');this.height=innerHeight;this.feedHeight=lens.clientHeight;
  if(!preview.hidden&&preview.width&&preview.height){const canvas=document.createElement('canvas');canvas.width=Math.min(768,preview.width);canvas.height=Math.round(canvas.width*preview.height/preview.width);canvas.getContext('2d').drawImage(preview,0,0,canvas.width,canvas.height);canvas.className='photo-feed-frame';canvas.setAttribute('aria-hidden','true');lens.append(canvas);this.canvas=canvas;
   if(feed){const holder=document.createElement('div');holder.className='photo-feed-frame';canvas.after(holder);holder.append(canvas);canvas.className='photo-feed-source';shadeScanPhoto(canvas);this.canvas=holder;this.scan=createPhotoScan(holder,lens,prepared,onScanStart);}

}
  this.feed=feed;this.active=true;const token={};this.token=token;
  this.capture.classList.add('capture-feeding');if(feed)this.capture.classList.add('capture-processing');this.stage.classList.add('floor-travelling');this.stage.style.pointerEvents='none';this.stage.style.opacity='1';this.update(0);
  this.stage.dataset.bridgePhase=feed?'processing':'panning';
  const promise=new Promise(resolve=>{this.resolve=resolve;});this.animations=[];
  const animate=(element,frames,duration)=>{if(!element?.animate)return null;const animation=element.animate(frames,{duration,fill:'both',easing:'linear'});this.animations.push(animation);return animation;};
  // Keep the entire frozen photograph stationary until a visible carpet frame
  // has actually been submitted and the full-height scan has finished.
  const panAnimations=[];
  const startPan=()=>{if(!this.active||this.token!==token)return;
   this.capture.classList.remove('capture-processing');this.stage.dataset.bridgePhase='panning';const duration=feed?2800:1500,origin=document.timeline.currentTime;
   const frames=fn=>Array.from({length:61},(_,i)=>({...fn(i/60),offset:i/60}));
   const pan=(element,fn)=>{const animation=animate(element,frames(fn),duration);if(animation){panAnimations.push(animation);if(feed&&readPrintProgress){animation.pause();animation.currentTime=0;}else animation.startTime=origin;}return animation;};
   const master=pan(this.capture,t=>({transform:`translate3d(0,${-ease(t)*this.height}px,0)`}));
   pan(this.stage,t=>({transform:`translate3d(0,${(1-ease(t))*this.height}px,0)`}));
   if(this.canvas)pan(this.canvas,t=>({transform:`translate3d(0,${bridgePose(t,this.height,this.feedHeight,this.feed).photoY}px,0)`}));
   pan(this.capture.querySelector('.camera-heading'),t=>({opacity:1-ease(t/.45)}));
   pan(this.capture.querySelector('.finder-markers'),t=>({opacity:.7*(1-ease(t/.6))}));
   // A print reveal follows submitted cloth progress, never a faster wall clock.
   // Ordinary floor navigation keeps the independent compositor animation.
   const tick=()=>{if(!this.active||this.token!==token)return;let progress;
    if(feed&&readPrintProgress){progress=Math.max(0,Math.min(1,readPrintProgress()));for(const animation of panAnimations)animation.currentTime=progress*duration;}
    else{const elapsed=master?.currentTime??(document.timeline.currentTime-origin);progress=Math.min(1,elapsed/duration);}
    this.update(progress,!master);if(this.active)this.frame=requestAnimationFrame(tick);
   };this.frame=requestAnimationFrame(tick);
  };
  const minimumScan=this.scan?.finished??Promise.resolve();
  Promise.all([Promise.resolve(prepared),minimumScan]).then(()=>{if(this.active&&this.token===token)return onPrepared();}).then(startPan).catch(()=>{if(this.token===token)this.finish();});
  return promise;
 }

 update(t,writeStyles=true){if(!this.active)return;const pose=bridgePose(t,this.height,this.feedHeight,this.feed);
  if(writeStyles){if(this.canvas)this.canvas.style.transform=`translate3d(0,${pose.photoY}px,0)`;
   this.capture.style.setProperty('--floor-pan',-pose.pan+'px');this.capture.style.setProperty('--heading-opacity',String(1-ease(t/.45)));this.capture.style.setProperty('--finder-reticle',String(.36*(1-ease(t/.6))));this.stage.style.transform=`translate3d(0,${pose.roomY}px,0)`;
  }
  this.stage.dataset.bridgePhotoY=pose.screenPhotoY.toFixed(1);this.stage.dataset.bridgeProgress=t.toFixed(3);this.stage.dataset.bridgeFloorPan=pose.pan.toFixed(1);this.stage.dataset.bridgePhotoVisible=String(!!this.canvas&&pose.photoY<this.feedHeight&&t<1);if(t>=1)this.finish();
 }

 finish(){const done=this.resolve;this.resolve=null;this.dispose();done?.();}
 dispose(){this.token=null;for(const animation of this.animations??[])animation.cancel();this.animations=[];if(this.frame!==null)cancelAnimationFrame(this.frame);this.frame=null;const done=this.resolve;this.resolve=null;if(this.canvas){for(const c of this.canvas.querySelectorAll?.("canvas")??[]){c.width=c.height=0;}this.canvas.remove();this.canvas=null;}this.scan?.cancel();this.scan=null;if(this.capture){for(const p of ['--floor-pan','--heading-opacity','--finder-reticle'])this.capture.style.removeProperty(p);this.capture.classList.remove('capture-feeding','capture-processing');this.capture=null;}for(const p of ['transform','opacity','pointer-events'])this.stage.style.removeProperty(p);this.stage.classList.remove('floor-travelling');this.active=false;done?.();}
}

// Screen-space geometry keeps every dot the same 11px diameter as the reticle.
export function photoScanRows(width,height,random=Math.random){
 const count=Math.max(1,Math.floor(height/11)),gap=11,top=(height-(count-1)*gap)/2;
 return Array.from({length:count},(_,i)=>{const clusters=width>=280?2+Math.floor(random()*2):1,segment=width/clusters,dots=[];for(let c=0;c<clusters;c++){const total=3+Math.floor(random()*3),span=(total-1)*11,start=c*segment+5.5+random()*Math.max(0,segment-11-span);for(let k=0;k<total;k++)dots.push(start+k*11);}return{y:top+i*gap,reverse:i%2===1,dots};});
}
// Reuse the bounded spatial grid already collected during the full pixel scan.
// Major contiguous colour runs position clusters; no extra image readbacks.
export function colourScanRows(width,height,map,palette,random=Math.random){
 const rows=photoScanRows(width,height,random);if(!map||!palette?.length)return rows;
 const aspect=width/height,cropW=Math.min(1,aspect/map.aspect),cropH=Math.min(1,map.aspect/aspect);
 for(const row of rows){const my=Math.min(map.height-1,Math.floor(((1-cropH)/2+row.y/height*cropH)*map.height)),runs=[];let start=0,last=-1;
  for(let x=0;x<=map.width;x++){const sx=Math.min(map.width-1,Math.floor(((1-cropW)/2+x/map.width*cropW)*map.width)),label=x===map.width?-1:map.labels[my*map.width+sx];if(label!==last){if(last>=0)runs.push({start,end:x,label:last});start=x;last=label;}}
  const major=runs.filter(r=>(r.end-r.start)/map.width*width>=34).sort((a,b)=>(b.end-b.start)-(a.end-a.start)).slice(0,3).sort((a,b)=>a.start-b.start);if(!major.length)continue;
  row.dots=[];row.colours=[];for(const run of major){const left=run.start/map.width*width,right=run.end/map.width*width,total=Math.max(3,Math.min(5,Math.floor((right-left-11)/11)+1)),span=(total-1)*11,first=left+5.5+random()*Math.max(0,right-left-11-span);for(let k=0;k<total;k++){row.dots.push(first+k*11);row.colours.push(palette[run.label].rgb);}}
 }
 return rows;
}
function createPhotoScan(holder,lens,prepared,onScanStart){
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),width=lens.clientWidth,height=lens.clientHeight,animations=[];let cancelled=false,stopSound=()=>{};
 svg.classList.add('photo-scan');svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.setAttribute('aria-hidden','true');holder.append(svg);const maskId=addDotGrain(svg,ns);
 const finished=Promise.resolve(prepared).then(data=>{if(cancelled)return;stopSound=onScanStart()??(()=>{});const rows=colourScanRows(width,height,data?.scanMap,data?.palette),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,duration=reduced?0:19200/(rows.length+1);
  for(const [i,row] of rows.entries()){
   const group=document.createElementNS(ns,'g'),line=document.createElementNS(ns,'path');line.setAttribute('d',`M0 ${row.y}H${width}`);line.setAttribute('fill','none');line.setAttribute('stroke','white');line.setAttribute('stroke-width','.75');line.setAttribute('stroke-opacity','.24');group.append(line);
   for(const [k,x] of row.dots.entries()){const dot=document.createElementNS(ns,'circle');dot.setAttribute('cx',x);dot.setAttribute('cy',row.y);dot.setAttribute('r','5.5');dot.setAttribute('mask',`url(#${maskId})`);dot.setAttribute('fill',row.colours?.[k]?`rgb(${row.colours[k].join(',')})`:'white');group.append(dot);}
   svg.append(group);const hidden=row.reverse?'inset(0 0 0 100%)':'inset(0 100% 0 0)';animations.push(group.animate([{clipPath:hidden},{clipPath:'inset(0 0 0 0)'}],{duration,delay:i*duration/2,easing:'cubic-bezier(.4,0,.2,1)',fill:'both'}));
  }
  return Promise.all(animations.map(a=>a.finished.catch(()=>{}))).finally(()=>stopSound());
 });
 return{finished,cancel(){cancelled=true;stopSound();for(const animation of animations)animation.cancel();}};
}

let scanGrain=null;
function shadeScanPhoto(canvas){
 if(!scanGrain){scanGrain=document.createElement('canvas');scanGrain.width=scanGrain.height=96;const ctx=scanGrain.getContext('2d'),pixels=ctx.createImageData(96,96);for(let i=0;i<pixels.data.length;i+=4){const value=90+Math.random()*76;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=value;pixels.data[i+3]=255;}ctx.putImageData(pixels,0,0);}
 const ctx=canvas.getContext('2d');ctx.fillStyle='rgba(0,0,0,.26)';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.save();ctx.globalCompositeOperation='soft-light';ctx.globalAlpha=.35;ctx.fillStyle=ctx.createPattern(scanGrain,'repeat');ctx.fillRect(0,0,canvas.width,canvas.height);ctx.restore();
}
function addDotGrain(svg,ns){
 const id='dot-grain-'+Math.random().toString(36).slice(2),defs=document.createElementNS(ns,'defs'),pattern=document.createElementNS(ns,'pattern'),mask=document.createElementNS(ns,'mask');pattern.id=id+'-tile';pattern.setAttribute('patternUnits','userSpaceOnUse');pattern.setAttribute('width','16');pattern.setAttribute('height','16');
 for(let y=0;y<16;y++)for(let x=0;x<16;x++){const pixel=document.createElementNS(ns,'rect'),v=Math.round(185+Math.random()*70);for(const [key,value]of Object.entries({x,y,width:1,height:1,fill:`rgb(${v},${v},${v})`}))pixel.setAttribute(key,value);pattern.append(pixel);}
 mask.id=id;mask.setAttribute('maskUnits','userSpaceOnUse');mask.setAttribute('x','0');mask.setAttribute('y','0');mask.setAttribute('width','100%');mask.setAttribute('height','100%');const rect=document.createElementNS(ns,'rect');rect.setAttribute('width','100%');rect.setAttribute('height','100%');rect.setAttribute('fill',`url(#${pattern.id})`);mask.append(rect);defs.append(pattern,mask);svg.append(defs);return id;
}

import {oklab,dyeDistance} from './yarn-palette.js?v=196';
const clamp=t=>Math.max(0,Math.min(1,t));
const ease=t=>{t=clamp(t);return t*t*t*(t*(t*6-15)+10);};
// Actual area means, independent of the rug palette or any optical preview effect.
export function mosaicCells(rgba,width,height,viewWidth,viewHeight){
 const columns=Math.max(1,Math.round(viewWidth/32)),size=viewWidth/columns,rows=Math.max(1,Math.round(viewHeight/size)),rowHeight=viewHeight/rows;
 const cells=Array.from({length:columns*rows},(_,i)=>({x:i%columns*size,y:Math.floor(i/columns)*rowHeight,width:size,height:rowHeight,rgb:[0,0,0],weight:0}));
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const at=(y*width+x)*4,a=rgba[at+3]/255,cell=cells[Math.min(rows-1,Math.floor((y+.5)/height*rows))*columns+Math.min(columns-1,Math.floor((x+.5)/width*columns))];
  for(let k=0;k<3;k++)cell.rgb[k]+=rgba[at+k]*a;cell.weight+=a;
 }
 for(const cell of cells){cell.rgb=cell.rgb.map(v=>Math.round(v/(cell.weight||1)));delete cell.weight;}
 return cells;
}
// Keep one source block nearest each actual yarn dye, without inventing accents.
export function mosaicSequence(cells,palette,random=Math.random){
 const chosen=new Set(),labs=cells.map(c=>oklab(c.rgb));
 for(const colour of palette){const dye=oklab(colour.rgb);let best=-1,distance=Infinity;
  for(let i=0;i<cells.length;i++)if(!chosen.has(i)){const d=dyeDistance(labs[i],dye);if(d<distance){best=i;distance=d;}}
  if(best>=0)chosen.add(best);
 }
 const order=cells.map((_,i)=>i);for(let i=order.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
 const ranks=[];order.forEach((i,rank)=>ranks[i]=rank);
 return cells.map((_,i)=>({chosen:chosen.has(i),reveal:(Math.sqrt(1+3*ranks[i]/Math.max(1,cells.length-1))-1)*4800,exit:(chosen.has(i)?6900:5300)+random()*(chosen.has(i)?350:650),duration:350+random()*200}));
}
export function revealPose(t,distance){
 t=clamp(t);const ramp=.18,integral=x=>x*x*x-.5*x*x*x*x;
 const feed=t<ramp?ramp*integral(t/ramp)/(1-ramp):t>1-ramp?1-ramp*integral((1-t)/ramp)/(1-ramp):(t-ramp/2)/(1-ramp);
 return{photoY:0,rugY:-(1-feed)*distance,uiOpacity:0};
}
export class PhotoRugBridge{
 constructor(stage){this.stage=stage;this.frame=null;this.active=false;}
 begin(preview,lens,{source=preview,prepared=Promise.resolve(),onPrepared=()=>{},getRugBounds=()=>null,onScanStart=()=>()=>{}}={}){
  this.dispose();this.active=true;const token=this.token={};this.capture=lens.closest('#capture');this.height=innerHeight;this.photoHeight=lens.clientHeight;
  const holder=this.holder=document.createElement('div');holder.className='colour-decode';holder.style.height=this.photoHeight+'px';holder.setAttribute('aria-hidden','true');
  const photo=document.createElement('canvas');photo.width=preview.width;photo.height=preview.height;photo.getContext('2d').drawImage(preview,0,0);holder.append(photo);this.capture.append(holder);
  this.capture.classList.add('capture-decoding');this.stage.classList.add('memory-transition');this.stage.style.pointerEvents='none';this.stage.dataset.bridgePhase='decoding';this.stage.style.transform=`translate3d(0,${-this.height}px,0)`;
  const promise=new Promise((resolve,reject)=>{this.resolve=resolve;this.reject=reject;});
  this.scan=createMosaic(holder,source,lens,prepared,onScanStart,phase=>this.stage.dataset.bridgePhase=phase);const current=()=>this.active&&this.token===token;
  Promise.all([prepared,this.scan.finished]).then(()=>{if(current())return onPrepared();}).then(()=>{
   if(!current())return;this.scan.hideStatus();this.capture.classList.add('capture-revealing');this.stage.dataset.bridgePhase='abstracted';
   const bounds=getRugBounds();this.enterDistance=bounds?bounds.y+bounds.height+12:this.height;
   // A fixed scroll root is its own stacking context: lift it above the camera,
   // not just the canvas inside it, so the travelling rug is actually visible.
   const root=this.stage.closest('#carpetScroll');if(root){const z=root.style.zIndex,background=root.style.background;root.style.zIndex='6';root.style.background='transparent';this.restoreRoot=()=>{root.style.zIndex=z;root.style.background=background;};}
   if(bounds){this.stage.style.clipPath=`inset(${Math.max(0,bounds.y-3)}px ${Math.max(0,innerWidth-bounds.x-bounds.width-3)}px ${Math.max(0,this.height-bounds.y-bounds.height-3)}px ${Math.max(0,bounds.x-3)}px)`;this.stage.style.zIndex='6';}
   const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;let elapsed=0,last=null;
   const tick=time=>{if(!current())return;elapsed+=last===null?0:Math.min(50,time-last);last=time;const t=reduced?1:clamp(elapsed/3200),p=revealPose(t,this.enterDistance);
    holder.style.transform=`translate3d(0,${p.photoY}px,0)`;this.stage.style.transform=`translate3d(0,${p.rugY}px,0)`;
    for(const element of this.capture.querySelectorAll('.camera-panel,.finder-markers'))element.style.opacity=p.uiOpacity;
    this.stage.dataset.bridgeProgress=t.toFixed(3);if(t>0)this.stage.dataset.bridgePhase='revealing';
    if(t===1)this.finish();else this.frame=requestAnimationFrame(tick);
   };this.frame=requestAnimationFrame(tick);
  }).catch(error=>{if(!current())return;const reject=this.reject;this.resolve=null;this.dispose();reject?.(error);});
  return promise;
 }
 finish(){const done=this.resolve;this.resolve=null;this.dispose();done?.();}
 dispose(){
  this.token=null;this.restoreRoot?.();this.restoreRoot=null;if(this.frame!==null)cancelAnimationFrame(this.frame);this.frame=null;this.scan?.cancel();this.scan=null;
  if(this.holder){for(const canvas of this.holder.querySelectorAll('canvas'))canvas.width=canvas.height=0;this.holder.remove();this.holder=null;}
  if(this.capture){for(const element of this.capture.querySelectorAll('.camera-panel,.finder-markers'))element.style.removeProperty('opacity');this.capture.classList.remove('capture-decoding','capture-revealing');this.capture=null;}
  for(const property of ['transform','pointer-events','clip-path','z-index'])this.stage.style.removeProperty(property);this.stage.classList.remove('memory-transition');this.active=false;
  const done=this.resolve;this.resolve=this.reject=null;done?.();
 }
}
function createMosaic(holder,source,lens,prepared,onScanStart,setPhase){
 const width=lens.clientWidth,height=lens.clientHeight,sample=document.createElement('canvas');sample.width=Math.min(768,source.width);sample.height=Math.max(1,Math.round(sample.width*height/width));
 const context=sample.getContext('2d',{willReadFrequently:true});context.drawImage(source,0,0,sample.width,sample.height);
 const cells=mosaicCells(context.getImageData(0,0,sample.width,sample.height).data,sample.width,sample.height,width,height);sample.width=sample.height=0;
 const canvas=document.createElement('canvas'),ratio=Math.min(devicePixelRatio,2);canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);holder.append(canvas);
 const ctx=canvas.getContext('2d');ctx.scale(ratio,ratio);ctx.lineWidth=.75;ctx.strokeStyle='rgba(233,233,210,.168)';
 // Fixed, physical-pixel noise: grain and binary dissolve share no animation flicker.
 const noise=Float32Array.from({length:64*64},()=>Math.random()),patterns=[];
 const pattern=level=>{const tile=document.createElement('canvas');tile.width=tile.height=64;const tc=tile.getContext('2d'),pixels=tc.createImageData(64,64);
  for(let i=0;i<noise.length;i++){const at=i*4,v=level<0?Math.floor(noise[i]*256):255;pixels.data[at]=pixels.data[at+1]=pixels.data[at+2]=v;pixels.data[at+3]=level<0||noise[i]<level/32?255:0;}
  tc.putImageData(pixels,0,0);const fill=ctx.createPattern(tile,'repeat');fill.setTransform(new DOMMatrix().scale(1/ratio));return fill;
 };
 const grain=pattern(-1);for(let i=0;i<=32;i++)patterns.push(pattern(i));
 let sequence=mosaicSequence(cells,[]),paletteReady=false;
 Promise.resolve(prepared).then(data=>{if(cancelled)return;const dyes=mosaicSequence(cells,data?.palette??[]);sequence=sequence.map((cell,i)=>({...cell,chosen:dyes[i].chosen,exit:dyes[i].exit,duration:dyes[i].duration}));paletteReady=true;},()=>{});
 const status=document.createElement('p');status.className='scan-status';status.setAttribute('role','status');status.textContent='Extracting colours…';lens.closest('#capture').append(status);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;let frame=null,elapsed=0,last=null,cancelled=false,resolve,stopSound=()=>{},previous=-1;
 const finished=new Promise(done=>resolve=done);if(!reduced)stopSound=onScanStart()??(()=>{});
 const tick=time=>{
  if(cancelled)return;const dt=last===null?0:Math.min(50,time-last);last=time;elapsed=reduced?7900:elapsed+dt;
  if(!paletteReady)elapsed=Math.min(elapsed,5100);
  const cleared=elapsed>=5100;if(cleared)holder.firstChild.style.visibility='hidden';
  ctx.clearRect(0,0,width,height);const active=new Set();let event=false;
  for(let i=0;i<cells.length;i++){
   const c=cells[i],plan=sequence[i],age=elapsed-plan.reveal,dissolve=clamp((elapsed-plan.exit)/plan.duration);
   if((plan.reveal>previous&&plan.reveal<=elapsed)||(plan.exit>previous&&plan.exit<=elapsed))event=true;
   if(age<0||dissolve===1)continue;active.add(i);const fill=ease((age-80)/180);
   ctx.globalAlpha=fill;ctx.fillStyle=`rgb(${c.rgb.join(',')})`;ctx.fillRect(c.x,c.y,c.width,c.height);
   ctx.globalAlpha=fill*.07;ctx.globalCompositeOperation='soft-light';ctx.fillStyle=grain;ctx.fillRect(c.x,c.y,c.width,c.height);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
  }
  // Draw shared hairlines once, including isolated cells in the random reveal.
  ctx.beginPath();const columns=Math.round(width/cells[0].width);
  for(const i of active){const c=cells[i],right=c.x+c.width,bottom=c.y+c.height;ctx.moveTo(c.x,bottom);ctx.lineTo(c.x,c.y);ctx.lineTo(right,c.y);
   if((i+1)%columns===0||!active.has(i+1)){ctx.moveTo(right,c.y);ctx.lineTo(right,bottom);}
   if(!active.has(i+columns)){ctx.moveTo(c.x,bottom);ctx.lineTo(right,bottom);}
  }ctx.stroke();
  // Binary alpha removal, never a soft opacity fade; each cell has its own clock.
  ctx.globalCompositeOperation='destination-out';
  for(const i of active){const c=cells[i],p=sequence[i],level=Math.floor(clamp((elapsed-p.exit)/p.duration)*32);if(level){ctx.fillStyle=patterns[level];ctx.fillRect(c.x-.5,c.y-.5,c.width+1,c.height+1);}}
  ctx.globalCompositeOperation='source-over';
  if(event&&!reduced)stopSound.tick?.(cleared?'release':'reveal');previous=elapsed;
  if(cleared){status.textContent=elapsed<6900?'Selecting yarn colours…':'Preparing the weave…';setPhase(elapsed<6900?'selecting-yarns':'releasing-yarns');const panel=lens.closest('#capture').querySelector('.camera-panel');if(panel)panel.style.opacity=1-ease((elapsed-5100)/600);}
  if(paletteReady&&elapsed>=7900){stopSound();resolve();}else frame=requestAnimationFrame(tick);
 };
 frame=requestAnimationFrame(tick);
 return{finished,hideStatus(){status.hidden=true;},cancel(){cancelled=true;if(frame!==null)cancelAnimationFrame(frame);stopSound();status.remove();resolve();}};
}

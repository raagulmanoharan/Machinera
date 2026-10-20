const clamp=t=>Math.max(0,Math.min(1,t));
const ease=t=>{t=clamp(t);return t*t*t*(t*(t*6-15)+10);};
// Actual area means, independent of the rug palette or any optical preview effect.
export function mosaicCells(rgba,width,height,viewWidth,viewHeight){
 const columns=Math.max(1,Math.round(viewWidth/32)),size=viewWidth/columns,rows=Math.ceil(viewHeight/size);
 const cells=Array.from({length:columns*rows},(_,i)=>({x:i%columns*size,y:Math.floor(i/columns)*size,width:size,height:Math.min(size,viewHeight-Math.floor(i/columns)*size),rgb:[0,0,0],weight:0}));
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const at=(y*width+x)*4,a=rgba[at+3]/255,cell=cells[Math.min(rows-1,Math.floor((y+.5)/height*viewHeight/size))*columns+Math.min(columns-1,Math.floor((x+.5)/width*columns))];
  for(let k=0;k<3;k++)cell.rgb[k]+=rgba[at+k]*a;cell.weight+=a;
 }
 for(const cell of cells){cell.rgb=cell.rgb.map(v=>Math.round(v/(cell.weight||1)));delete cell.weight;}
 return cells;
}
export function revealPose(t,height,photoHeight){
 return{photoY:-ease(t/.5)*(photoHeight+24),rugY:(1-ease((t-.38)/.62))*height,uiOpacity:1-ease(t/.3)};
}
export class PhotoRugBridge{
 constructor(stage){this.stage=stage;this.frame=null;this.active=false;}
 begin(preview,lens,{source=preview,prepared=Promise.resolve(),onPrepared=()=>{},getRugBounds=()=>null,onScanStart=()=>()=>{}}={}){
  this.dispose();this.active=true;const token=this.token={};this.capture=lens.closest('#capture');this.height=innerHeight;this.photoHeight=lens.clientHeight;
  const holder=this.holder=document.createElement('div');holder.className='colour-decode';holder.style.height=this.photoHeight+'px';holder.setAttribute('aria-hidden','true');
  const photo=document.createElement('canvas');photo.width=preview.width;photo.height=preview.height;photo.getContext('2d').drawImage(preview,0,0);holder.append(photo);this.capture.append(holder);
  this.capture.classList.add('capture-decoding');this.stage.classList.add('memory-transition');this.stage.style.pointerEvents='none';this.stage.dataset.bridgePhase='decoding';this.stage.style.transform=`translate3d(0,${this.height}px,0)`;
  const promise=new Promise((resolve,reject)=>{this.resolve=resolve;this.reject=reject;});
  this.scan=createMosaic(holder,source,lens,onScanStart);const current=()=>this.active&&this.token===token;
  Promise.all([prepared,this.scan.finished]).then(()=>{if(current())return onPrepared();}).then(()=>{
   if(!current())return;this.scan.hideStatus();this.capture.classList.add('capture-revealing');this.stage.dataset.bridgePhase='abstracted';
   const bounds=getRugBounds();if(bounds){this.stage.style.clipPath=`inset(${Math.max(0,bounds.y-3)}px ${Math.max(0,innerWidth-bounds.x-bounds.width-3)}px ${Math.max(0,this.height-bounds.y-bounds.height-3)}px ${Math.max(0,bounds.x-3)}px)`;this.stage.style.zIndex='6';}
   const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;let elapsed=0,last=null;
   const tick=time=>{if(!current())return;elapsed+=last===null?0:Math.min(50,time-last);last=time;const t=reduced?1:clamp((elapsed-320)/2600),p=revealPose(t,this.height,this.photoHeight);
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
  this.token=null;if(this.frame!==null)cancelAnimationFrame(this.frame);this.frame=null;this.scan?.cancel();this.scan=null;
  if(this.holder){for(const canvas of this.holder.querySelectorAll('canvas'))canvas.width=canvas.height=0;this.holder.remove();this.holder=null;}
  if(this.capture){for(const element of this.capture.querySelectorAll('.camera-panel,.finder-markers'))element.style.removeProperty('opacity');this.capture.classList.remove('capture-decoding','capture-revealing');this.capture=null;}
  for(const property of ['transform','pointer-events','clip-path','z-index'])this.stage.style.removeProperty(property);this.stage.classList.remove('memory-transition');this.active=false;
  const done=this.resolve;this.resolve=this.reject=null;done?.();
 }
}
function createMosaic(holder,source,lens,onScanStart){
 const width=lens.clientWidth,height=lens.clientHeight,sample=document.createElement('canvas');sample.width=Math.min(768,source.width);sample.height=Math.max(1,Math.round(sample.width*height/width));
 const context=sample.getContext('2d',{willReadFrequently:true});context.drawImage(source,0,0,sample.width,sample.height);
 const cells=mosaicCells(context.getImageData(0,0,sample.width,sample.height).data,sample.width,sample.height,width,height);sample.width=sample.height=0;
 const canvas=document.createElement('canvas'),ratio=Math.min(devicePixelRatio,2);canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);holder.append(canvas);
 const ctx=canvas.getContext('2d');ctx.scale(ratio,ratio);ctx.lineWidth=.75;ctx.strokeStyle='rgba(236,235,229,.55)';
 const status=document.createElement('p');status.className='scan-status';status.setAttribute('role','status');status.textContent='Extracting colours…';lens.closest('#capture').append(status);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,beat=4800/cells.length;let frame=null,elapsed=0,last=null,cancelled=false,resolve,stopSound=()=>{};
 const finished=new Promise(done=>resolve=done);if(!reduced)stopSound=onScanStart()??(()=>{});
 const tick=time=>{
  if(cancelled)return;elapsed+=last===null?0:Math.min(50,time-last);last=time;const count=reduced?cells.length:Math.min(cells.length,Math.floor(elapsed/beat)+1);
  ctx.clearRect(0,0,width,height);
  for(let i=0;i<count;i++){
   const c=cells[i],fill=reduced?1:clamp((elapsed-i*beat-70)/110);ctx.globalAlpha=fill;ctx.fillStyle=`rgb(${c.rgb.join(',')})`;ctx.fillRect(c.x,c.y,c.width,c.height);ctx.globalAlpha=1;ctx.strokeRect(c.x,c.y,c.width,c.height);
  }
  if(elapsed>2400)status.textContent='Building colour blocks…';
  if(reduced||elapsed>=4800+180){stopSound();status.textContent='Preparing the weave…';resolve();}else frame=requestAnimationFrame(tick);
 };
 frame=requestAnimationFrame(tick);
 return{finished,hideStatus(){status.hidden=true;},cancel(){cancelled=true;if(frame!==null)cancelAnimationFrame(frame);stopSound();status.remove();resolve();}};
}

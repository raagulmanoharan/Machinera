// Completed-print actions. This module owns no camera, renderer or simulation.
export function setupLoomControls({getCloth,getBounds,canEdit,render,store,getRecordId,onDiscard,onStorageFailure,capture,onNotice}){
 const regenerate=document.querySelector('#regenerateMemory'),share=document.querySelector('#shareMemory'),discard=document.querySelector('#firstFloor'),download=document.querySelector('#downloadMemory'),flip=document.querySelector('#rugFlip');
 let busy=false,turnFrame=null,turnResolve=null,turnVersion=0,back=false;
 const current=()=>getCloth()?.archive.entries.at(-1);
 const available=()=>!busy&&canEdit()&&!!current();
 function sync(){const entry=current(),show=capture.hidden&&!!entry&&canEdit();for(const button of [regenerate,share,download,discard,flip]){button.hidden=!show;button.disabled=!available();}if(show&&!busy){const b=getBounds();Object.assign(flip.style,{left:b.x+'px',top:b.y+'px',width:b.width+'px',height:b.height+'px'});}flip.disabled||=!entry?.photoYarns;flip.setAttribute('aria-pressed',String(back));flip.title=entry?.photoYarns?'Flip woven memory':'Photo side unavailable for this older memory';flip.setAttribute('aria-label',back?'Show rug front':'Flip to woven photo');}
 async function persist(entry){const id=getRecordId();if(id==null)return;try{await store.changeLast(id,entry);}catch(error){onStorageFailure(error);throw error;}}
 async function discardMemory(){if(!available())return;busy=true;sync();try{const id=getRecordId();if(id!=null)await store.changeLast(id);reset();onDiscard();}catch(error){onNotice('Could not discard this memory. Please try again.');}finally{busy=false;sync();}}
 discard.onclick=discardMemory;
 regenerate.onclick=async()=>{if(!available())return;busy=true;sync();const cloth=getCloth(),entry=current();try{reset();cloth.replacePhoto({palette:entry.palette,analysis:entry.analysis,photoYarns:entry.photoYarns,caption:entry.caption});render(true);await persist(current());}catch(error){onNotice('The new weave is available in this session, but could not be saved.');}finally{busy=false;sync();render(true);}};
 flip.onclick=async()=>{if(!available()||!current().photoYarns)return;busy=true;sync();const version=++turnVersion,cloth=getCloth(),target=!back,start=back?Math.PI:0,end=target?Math.PI:0,duration=matchMedia('(prefers-reduced-motion: reduce)').matches?0:1600;let began=null,switched=false;
  await new Promise(resolve=>{turnResolve=resolve;const tick=time=>{began??=time;const t=duration?Math.min(1,(time-began)/duration):1,p=t*t*(3-2*t);if(!switched&&p>=.5){cloth.setBack(target);switched=true;}cloth.setTurn(start+(end-start)*p,t===1?0:Math.sin(Math.PI*p)*Math.PI*2*(target?1:-1));render(true);if(t<1)turnFrame=requestAnimationFrame(tick);else{turnFrame=null;turnResolve=null;resolve();}};turnFrame=requestAnimationFrame(tick);});if(version!==turnVersion)return;back=target;busy=false;sync();render(true);
 };
 function reset(){busy=false;turnVersion++;if(turnFrame!==null)cancelAnimationFrame(turnFrame);turnFrame=null;turnResolve?.();turnResolve=null;back=false;getCloth()?.setBack(false);getCloth()?.setTurn(0);flip.setAttribute('aria-pressed','false');}
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&turnFrame!==null){reset();busy=false;sync();}});
 return{sync,reset,get busy(){return busy;}};
}

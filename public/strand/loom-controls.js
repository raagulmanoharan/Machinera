// Completed-print actions. This module owns no camera, renderer or simulation.
export function setupLoomControls({getCloth,getBounds,canEdit,render,store,getRecordId,onDiscard,onStorageFailure,capture,onNotice}){
 const regenerate=document.querySelector('#regenerateMemory'),save=document.querySelector('#saveMemory'),discard=document.querySelector('#firstFloor'),download=document.querySelector('#downloadMemory'),flip=document.querySelector('#rugFlip');
 let busy=false,turn=null,back=false;
 const current=()=>getCloth()?.archive.entries.at(-1);
 const available=()=>!busy&&canEdit()&&!!current();
 function sync(){const entry=current(),show=capture.hidden&&!!entry&&canEdit();for(const button of [regenerate,save,download,discard,flip]){button.hidden=!show;button.disabled=!available();}if(show&&!busy){const b=getBounds();Object.assign(flip.style,{left:b.x+'px',top:b.y+'px',width:b.width+'px',height:b.height+'px'});}flip.disabled||=!entry?.photoYarns;flip.setAttribute('aria-pressed',String(back));flip.title=entry?.photoYarns?'Flip woven memory':'Photo side unavailable for this older memory';flip.setAttribute('aria-label',back?'Show rug front':'Flip to woven photo');}
 async function persist(entry){const id=getRecordId();if(id==null)return;try{await store.changeLast(id,entry);}catch(error){onStorageFailure(error);throw error;}}
 async function discardMemory(){if(!available())return;busy=true;sync();try{const id=getRecordId();if(id!=null)await store.changeLast(id);reset();onDiscard();}catch(error){onNotice('Could not discard this memory. Please try again.');}finally{busy=false;sync();}}
 discard.onclick=discardMemory;
 regenerate.onclick=async()=>{if(!available())return;busy=true;sync();const cloth=getCloth(),entry=current();try{reset();cloth.replacePhoto({palette:entry.palette,analysis:entry.analysis,photoYarns:entry.photoYarns,caption:entry.caption});render(true);await persist(current());}catch(error){onNotice('The new weave is available in this session, but could not be saved.');}finally{busy=false;sync();render(true);}};
 flip.onclick=()=>{if(!available()||!current().photoYarns)return;busy=true;turn={elapsed:0,target:!back,duration:matchMedia('(prefers-reduced-motion: reduce)').matches?0:1.9};sync();render(true);};
 // Advance only when the app renders, so geometry never jumps ahead of the screen.
 function update(dt){if(!turn)return false;const cloth=getCloth(),f=turn;f.elapsed+=Math.min(dt,1/30);const t=f.duration?Math.min(1,f.elapsed/f.duration):1;
  cloth.setFlipProgress(t,back);
  if(t===1){cloth.setBack(f.target);back=f.target;turn=null;busy=false;sync();}return true;
 }
 function reset(){busy=false;turn=null;back=false;getCloth()?.setBack(false);getCloth()?.setTurn(0);flip.setAttribute('aria-pressed','false');}
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&turn){reset();sync();}});
 return{sync,reset,update,get busy(){return busy;}};
}

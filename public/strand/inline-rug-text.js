import {letteringMetrics} from './woven-lettering.js?v=204';
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export function setupInlineRugText({getCloth,getBounds,render,persist,onState,onError}){
 const root=document.createElement('section');root.id='rugTextEditor';root.hidden=true;root.setAttribute('aria-label','Edit woven text');
 root.innerHTML='<div class="rug-text-box"><textarea aria-label="Text woven into the rug" maxlength="120" rows="1" wrap="off" spellcheck="false" placeholder="Type…"></textarea><button type="button" data-handle="move" aria-label="Move text. Use arrow keys."><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 3v18M3 12h18M8 7l4-4 4 4M8 17l4 4 4-4M7 8l-4 4 4 4m10-8 4 4-4 4"/></svg></button><button type="button" data-handle="stretch" aria-label="Stretch text width. Use left and right arrow keys."></button><button type="button" data-handle="resize" aria-label="Resize text. Use arrow keys."></button></div><nav class="rug-text-toolbar" aria-label="Text editing"><button type="button" data-action="cancel">Cancel</button><button type="button" data-action="done">Done</button></nav>';
 document.body.append(root);const box=root.querySelector('.rug-text-box'),input=root.querySelector('textarea'),done=root.querySelector('[data-action="done"]'),cancel=root.querySelector('[data-action="cancel"]'),measure=document.createElement('canvas').getContext('2d');
 let entry=null,side='front',draft=null,original=null,oldCaption='',saving=false,active=false,scheduled=null,drag=null;
 const api={get active(){return active;},open,close:()=>finish(false)};
 function layout(){if(!active)return;const bounds=getBounds();box.style.left=bounds.x+draft.x*bounds.width+'px';box.style.top=bounds.y+draft.y*bounds.height+'px';box.style.width=draft.w*bounds.width+'px';box.style.height=draft.h*bounds.height+'px';const m=letteringMetrics(draft,bounds.width,bounds.height,(text,size)=>{measure.font=`500 ${size}px "EB Garamond",Garamond,serif`;return measure.measureText(text).width;});input.style.fontSize=m.size+'px';input.style.width=100/m.stretch+'%';input.style.transform=`scaleX(${m.stretch})`;}
 function paint(){scheduled=null;if(!active)return;entry.lettering??={};entry.lettering[side]={...draft};getCloth().refreshLettering();render(true);}
 function update(){layout();if(scheduled===null)scheduled=requestAnimationFrame(paint);}
 function open(){if(active)return;entry=getCloth().archive.entries.at(-1);side=getCloth().backSide?'back':'front';original=entry.lettering?.[side]?{...entry.lettering[side]}:null;oldCaption=entry.caption??'';draft=original?{...original}:{text:oldCaption,x:.1,y:.43,w:.8,h:.12,stretch:1};input.value=draft.text;active=true;root.hidden=false;layout();input.focus({preventScroll:true});input.setSelectionRange(input.value.length,input.value.length);onState();update();document.fonts.load('500 32px "EB Garamond"').then(()=>{if(active)update();}).catch(()=>{});}
 async function finish(save){if(!active||saving)return;drag=null;if(save){saving=true;done.disabled=cancel.disabled=input.disabled=true;entry.caption='';paint();if(!draft.text.trim())delete entry.lettering[side];try{await persist(entry);}catch(error){saving=false;done.disabled=cancel.disabled=input.disabled=false;onError('Could not save woven text. Your edits are still open.');return;}}
  else{entry.lettering??={};if(original)entry.lettering[side]=original;else delete entry.lettering[side];entry.caption=oldCaption;}
  if(scheduled!==null)cancelAnimationFrame(scheduled);scheduled=null;active=false;saving=false;drag=null;root.hidden=true;done.disabled=cancel.disabled=input.disabled=false;getCloth().refreshLettering();render(true);onState();document.querySelector('#addMemoryText').focus({preventScroll:true});
 }
 input.addEventListener('input',()=>{draft.text=input.value;update();});done.onclick=()=>finish(true);cancel.onclick=()=>finish(false);
 root.addEventListener('keydown',event=>{event.stopPropagation();if(event.key==='Escape'){event.preventDefault();finish(false);}else if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();finish(true);}});
 const change=(kind,dx,dy,start)=>{if(kind==='move'){draft.x=clamp(start.x+dx,0,1-start.w);draft.y=clamp(start.y+dy,0,1-start.h);}else{draft.w=clamp(start.w+dx,.12,1-start.x);if(kind==='stretch')draft.stretch=clamp(start.stretch*draft.w/start.w,.2,4);else draft.h=clamp(start.h+dy,.045,1-start.y);}update();};
 for(const handle of root.querySelectorAll('[data-handle]')){
  handle.onpointerdown=event=>{if(saving)return;event.preventDefault();drag={id:event.pointerId,x:event.clientX,y:event.clientY,start:{...draft},bounds:getBounds()};handle.setPointerCapture(event.pointerId);};
  handle.onpointermove=event=>{if(saving||!drag||drag.id!==event.pointerId)return;change(handle.dataset.handle,(event.clientX-drag.x)/drag.bounds.width,(event.clientY-drag.y)/drag.bounds.height,drag.start);};
  handle.onpointerup=handle.onpointercancel=()=>{drag=null;};
  handle.onkeydown=event=>{if(saving||!event.key.startsWith('Arrow'))return;event.preventDefault();const step=event.shiftKey?.04:.01,dx=event.key==='ArrowRight'?step:event.key==='ArrowLeft'?-step:0,dy=event.key==='ArrowDown'?step:event.key==='ArrowUp'?-step:0;change(handle.dataset.handle,dx,dy,{...draft});};
 }
 window.addEventListener('resize',layout);return api;
}

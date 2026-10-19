import {FIRST_PRINT_LENGTH} from './print-sections.js?v=156';
import {preserveMemoryView} from './postcard-capture.js?v=218';
import {postcardDetails} from './memory-postcard.js?v=201';
// The modal borrows the same yarn scene; closing restores the original loom.
export function setupMemoryDetail({renderer,pipeline,camera,getCloth,render,downloadButton,onFlip=()=>()=>{}}){
 const body=document.querySelector('#memoryDetail'),button=document.querySelector('#memoryDetailFlip'),copy=document.querySelector('#memoryDetailCopy');
 let state=null;
 function resize(){if(!state)return;const rect=button.getBoundingClientRect(),cloth=getCloth(),height=Math.max(FIRST_PRINT_LENGTH,cloth.sim.width/(rect.width/rect.height))*1.035;
  renderer.setSize(Math.max(1,rect.width),Math.max(1,rect.height),false);pipeline.resize(Math.max(1,rect.width),Math.max(1,rect.height));camera.aspect=rect.width/rect.height;camera.position.set(0,-.19-height/(2*Math.tan(camera.fov*Math.PI/360)),0);camera.lookAt(0,-.19,0);camera.updateProjectionMatrix();camera.updateMatrixWorld();render(true);
 }
 function sync(){button.disabled=!!state?.turn||!state?.entry.photoYarns;button.setAttribute('aria-pressed',String(!!state?.back));button.setAttribute('aria-label',state?.back?'Show woven rug':'Flip to woven photo');downloadButton.disabled=!!state?.turn;}
 button.onclick=()=>{if(!state||state.turn||!state.entry.photoYarns)return;state.turn={elapsed:0,duration:matchMedia('(prefers-reduced-motion: reduce)').matches?0:1.9};state.last=0;state.stopFlip=onFlip();sync();render(true);};
 function close(){if(!state)return;const old=state;state=null;old.stopFlip?.();old.parent.append(renderer.domElement);old.restore();body.hidden=true;copy.replaceChildren();if(old.width!==innerWidth||old.height!==innerHeight)window.dispatchEvent(new Event('resize'));render(true);}
 return{get isOpen(){return !!state;},get selection(){return state?.selection;},resize,close,
 open(selection){close();const cloth=getCloth(),restore=preserveMemoryView({renderer,pipeline,camera,cloth});state={...selection,selection,restore,parent:renderer.domElement.parentElement,back:false,turn:null,last:0,width:innerWidth,height:innerHeight};
  const details=postcardDetails(selection.entry,selection.index);copy.replaceChildren();
  for(const text of [selection.label,details.weave,details.pattern,details.description,details.inventory]){const p=document.createElement('p');p.textContent=text;copy.append(p);}
  const footer=document.createElement('footer'),brand=document.createElement('span'),code=document.createElement('span');brand.textContent='MACHINERA';code.textContent=details.code;footer.append(brand,code);copy.append(footer);
  body.hidden=false;button.append(renderer.domElement);cloth.archive=selection.archive;cloth.scrollOffset=cloth.archive.length-selection.entry.end;cloth.story.streamRemaining.value=0;cloth.story.streamHead.value=selection.entry.end;cloth.sim.top=selection.entry.length/2;cloth.group.scale.set(1,1,FIRST_PRINT_LENGTH/selection.entry.length);cloth.setTurn(0);cloth.setBack(false);cloth.paletteKey=null;cloth.rebuildPalette();cloth.setLength(selection.entry.length);sync();resize();
 },
 frame(time){if(!state)return;const dt=state.last?Math.min(1/30,(time-state.last)/1000):1/60;state.last=time;
  if(state.turn){const f=state.turn;f.elapsed+=dt;const t=f.duration?Math.min(1,f.elapsed/f.duration):1;const travel=getCloth().setFlipProgress(t,state.back);state.stopFlip?.update?.(travel??t);if(t===1){state.stopFlip?.();state.stopFlip=null;state.back=!state.back;getCloth().setBack(state.back);state.turn=null;sync();}}
  pipeline.render();if(state.turn)render(true);
 }
 };
}

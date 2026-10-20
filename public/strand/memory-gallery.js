import {RugArchive} from './rug-archive.js?v=199';
const memoryDay=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short'}),memoryTime=new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
export function memoryDateLabel(timestamp){const date=new Date(timestamp);return typeof timestamp==='number'&&Number.isFinite(date.getTime())?memoryDay.format(date)+' · '+memoryTime.format(date):'Date unavailable';}
// Small previews share the existing renderer and are released when the page closes.
export function setupMemoryGallery({store,capture,thumbnail,render,onCamera,onSelect,canRender=()=>true,onOpen=()=>{}}){
 const dialog=document.querySelector('#galleryDialog'),grid=document.querySelector('#galleryGrid'),status=document.querySelector('#galleryStatus'),retry=document.querySelector('#galleryRetry');
 let version=0,observer=null,queue=[],drawing=false;
 function clear(){version++;observer?.disconnect();observer=null;queue=[];for(const canvas of grid.querySelectorAll('canvas'))canvas.width=canvas.height=0;grid.replaceChildren();}
 async function draw(){if(drawing)return;drawing=true;
  try{while(queue.length&&dialog.open&&canRender()){const job=queue.shift();if(job.version!==version)continue;try{const image=await thumbnail(job.entry,job.archive);if(job.version!==version){image.width=image.height=0;continue;}image.setAttribute('role','img');image.setAttribute('aria-label',job.label);job.frame.replaceChildren(image);job.frame.removeAttribute("aria-busy");}catch{if(job.version===version){job.frame.textContent='Preview unavailable';job.frame.removeAttribute('aria-busy');}}await new Promise(requestAnimationFrame);}}
  finally{drawing=false;if(queue.length&&dialog.open&&canRender())draw();}
 }
 async function load(){clear();const token=version;retry.hidden=true;status.hidden=false;status.textContent='Loading memories…';
  try{const records=await store.load();if(token!==version||!dialog.open)return;const archive=new RugArchive().restore(records.map(r=>r.archive));status.textContent=records.length?'':'No saved memories yet.';status.hidden=!!records.length;
   observer=new IntersectionObserver(entries=>{if(token!==version||!dialog.open)return;for(const item of entries)if(item.isIntersecting){observer.unobserve(item.target);queue.push(item.target.job);}draw();},{root:dialog,rootMargin:'100px'});
   for(let i=archive.entries.length-1;i>=0;i--){const entry=archive.entries[i],label=memoryDateLabel(records[i].createdAt),card=document.createElement('figure'),frame=document.createElement('button'),caption=document.createElement('figcaption');frame.className='gallery-rug';frame.textContent='Loading…';frame.setAttribute('aria-busy','true');frame.setAttribute('aria-label',label);frame.type="button";frame.onclick=()=>onSelect({entry,archive,index:i,label});caption.textContent=label;card.append(frame,caption);grid.append(card);frame.job={entry,archive,frame,label,version:token};observer.observe(frame);}
  }catch{if(token!==version)return;status.textContent='Could not load your saved memories. Please try again.';retry.hidden=false;}
 }
 document.querySelector('#galleryClose').onclick=()=>dialog.close();
 document.querySelector('#galleryCamera').onclick=()=>dialog.close();
 retry.onclick=load;
 dialog.addEventListener('keydown',event=>{if(event.key==='Escape')event.stopPropagation();});
 dialog.addEventListener('close',()=>{clear();onCamera();render(true);});
 return{get isOpen(){return dialog.open;},resume:()=>draw(),async open(){if(!dialog.open){dialog.style.setProperty('--camera-paper',capture.style.getPropertyValue('--camera-paper'));onOpen();dialog.showModal();document.querySelector('#galleryTitle').focus({preventScroll:true});}await load();}};
}

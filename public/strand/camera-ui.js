let thumbnailReady=false;
const capture=document.querySelector('#capture'),button=document.querySelector('#aboutButton'),dialog=document.querySelector('#aboutDialog'),close=document.querySelector('#aboutClose');
function announce(open){capture.classList.toggle('about-open',open);document.dispatchEvent(new CustomEvent('machinera-about',{detail:{open}}));}
button.addEventListener('click',()=>{if(capture.classList.contains('capture-frozen'))return;dialog.showModal();announce(true);if(!thumbnailReady){thumbnailReady=true;requestAnimationFrame(()=>{import('./weave-thumbnail.js?v=120').then(({drawWeaveThumbnail})=>drawWeaveThumbnail(document.querySelector('#aboutWeave'))).catch(()=>{thumbnailReady=false;});});}});
close.addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>announce(false));
// Escape closes this page without reaching the floor navigation shortcut.
dialog.addEventListener('keydown',event=>{if(event.key==='Escape')event.stopPropagation();});
export function updateMemoryUI(count){document.querySelector('#memoryCount').textContent=String(count).padStart(2,'0');document.querySelector('#memoryLabel').textContent=count===1?'MEMORY':'MEMORIES';document.querySelector('#secondFloor').hidden=count===0;}
updateMemoryUI(0);

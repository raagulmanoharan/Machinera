const capture=document.querySelector('#capture'),button=document.querySelector('#aboutButton'),dialog=document.querySelector('#aboutDialog'),close=document.querySelector('#aboutClose');
function announce(open){capture.classList.toggle('about-open',open);document.dispatchEvent(new CustomEvent('machinera-about',{detail:{open}}));}
function openAbout(){if(capture.classList.contains('capture-frozen'))return;dialog.showModal();document.querySelector('#aboutTitle').focus({preventScroll:true});announce(true);}
button.addEventListener('click',openAbout);
close.addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>announce(false));
// Escape closes this page without reaching the floor navigation shortcut.
dialog.addEventListener('keydown',event=>{if(event.key==='Escape')event.stopPropagation();});
export function updateMemoryUI(count){document.querySelector('#memoryCount').textContent=String(count).padStart(2,'0');document.querySelector('#memoryLabel').textContent=count===1?'Memory':'Memories';document.querySelector('#secondFloor').hidden=count===0;}
updateMemoryUI(0);

openAbout();

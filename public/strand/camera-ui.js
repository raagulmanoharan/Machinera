const capture=document.querySelector('#capture'),button=document.querySelector('#aboutButton'),dialog=document.querySelector('#aboutDialog'),close=document.querySelector('#aboutClose');
function announce(open){capture.classList.toggle('about-open',open);document.dispatchEvent(new CustomEvent('machinera-about',{detail:{open}}));}
function openAbout(){if(capture.classList.contains('capture-frozen'))return;dialog.showModal();document.querySelector('#aboutTitle').focus({preventScroll:true});announce(true);}
button.addEventListener('click',openAbout);
close.addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>announce(false));
const tabs=[...dialog.querySelectorAll('[role="tab"]')];
function selectTab(tab){for(const item of tabs){const active=item===tab;item.setAttribute('aria-selected',String(active));item.tabIndex=active?0:-1;document.getElementById(item.getAttribute('aria-controls')).hidden=!active;}dialog.scrollTop=0;}
for(const [i,tab] of tabs.entries()){
 tab.addEventListener('click',()=>selectTab(tab));
 tab.addEventListener('keydown',event=>{let next;if(event.key==='ArrowRight')next=tabs[(i+1)%tabs.length];if(event.key==='ArrowLeft')next=tabs[(i+tabs.length-1)%tabs.length];if(event.key==='Home')next=tabs[0];if(event.key==='End')next=tabs.at(-1);if(next){event.preventDefault();selectTab(next);next.focus();}});
}
// Escape closes this page without reaching the floor navigation shortcut.
dialog.addEventListener('keydown',event=>{if(event.key==='Escape')event.stopPropagation();});
export function updateMemoryUI(count){document.querySelector('#memoryCount').textContent=String(count).padStart(2,'0');document.querySelector('#memoryLabel').textContent=count===1?'Memory':'Memories';document.querySelector('#secondFloor').hidden=count===0;}
updateMemoryUI(0);

openAbout();

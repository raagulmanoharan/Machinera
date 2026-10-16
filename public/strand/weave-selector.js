// Regional inspiration is identified only where it is supported by the structure.
const modes=[
 {name:'Jamakkalam',structure:'Dense plain cotton',origin:'Bhavani · Tamil Nadu, India',detail:'Coloured wefts form a continuous rhythm of bands.',id:'plain'},
 {name:'Diagonal twill',structure:'Over two, under two',origin:'A shared weaving structure',detail:'Offset crossings create a soft diagonal grain.',id:'twill'},
 {name:'Basket weave',structure:'Paired warp & weft',origin:'A shared weaving structure',detail:'Pairs of yarns interlace into a tactile woven grid.',id:'basket'},
 {name:'Diamond twill',structure:'Reversing twill',origin:'A shared weaving structure',detail:'Changing the twill direction forms small diamonds.',id:'diamond'}
];
export function installWeaveSelector(capture,onSelect){
 const trigger=capture.querySelector('#weaveControl'),panel=capture.querySelector('#weaveModes');let selected=0,enabled=true,scrollTimer;
 trigger.hidden=true;panel.hidden=false;
 panel.innerHTML=modes.map((m,i)=>`<button type="button" class="weave-option" data-weave-index="${i}" aria-label="${m.name}. ${m.origin}. ${m.structure}" aria-pressed="false"><span class="mode-thumbnail mode-${m.id}" aria-hidden="true"></span><span class="mode-copy"><span class="mode-origin">${m.origin}</span><strong>${m.name}</strong><span class="mode-structure">${m.structure}</span><span class="mode-detail">${m.detail}</span></span><span class="mode-check" aria-hidden="true"></span></button>`).join('');
 function center(index,behavior='smooth'){const button=panel.children[index];panel.scrollTo({left:button.offsetLeft-(panel.clientWidth-button.offsetWidth)/2,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':behavior});}
 panel.addEventListener('click',e=>{const button=e.target.closest('[data-weave-index]');if(!enabled||!button)return;const index=Number(button.dataset.weaveIndex);onSelect(index);center(index);});
 panel.addEventListener('scroll',()=>{clearTimeout(scrollTimer);if(!enabled)return;scrollTimer=setTimeout(()=>{const middle=panel.scrollLeft+panel.clientWidth/2;let best=selected,distance=Infinity;for(const b of panel.children){const d=Math.abs(b.offsetLeft+b.offsetWidth/2-middle);if(d<distance){distance=d;best=Number(b.dataset.weaveIndex);}}if(best!==selected)onSelect(best);},140);},{passive:true});
 panel.addEventListener('keydown',e=>{if(!enabled||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?3:Math.max(0,Math.min(3,selected+(e.key==='ArrowRight'?1:-1)));onSelect(next);center(next);panel.children[next].focus({preventScroll:true});});
 return{close(){clearTimeout(scrollTimer);},setEnabled(value){enabled=value;clearTimeout(scrollTimer);panel.inert=!value;panel.setAttribute('aria-disabled',String(!value));},setSelected(index){selected=index;trigger.setAttribute('aria-label','Selected weave: '+modes[index].name);panel.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));}};
}

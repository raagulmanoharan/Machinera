const modes=[['Plain cotton','plain'],['Diagonal twill','twill'],['Basket weave','basket'],['Diamond twill','diamond']];
export function installWeaveSelector(capture,onSelect){
 const trigger=capture.querySelector('#weaveControl'),panel=capture.querySelector('#weaveModes');let selected=0,enabled=true;
 panel.innerHTML=modes.map(([label,id],i)=>`<button type="button" class="weave-option" data-weave-index="${i}" aria-label="${label}" aria-pressed="false"><span class="mode-thumbnail mode-${id}" aria-hidden="true"></span><span class="mode-check" aria-hidden="true"></span></button>`).join('');
 function close(){panel.hidden=true;trigger.setAttribute('aria-expanded','false');}
 trigger.onclick=()=>{if(!enabled)return;panel.hidden=!panel.hidden;trigger.setAttribute('aria-expanded',String(!panel.hidden));};
 panel.addEventListener('click',e=>{const button=e.target.closest('[data-weave-index]');if(!enabled||!button)return;onSelect(Number(button.dataset.weaveIndex));close();trigger.focus({preventScroll:true});});
 capture.addEventListener('pointerdown',e=>{if(!e.target.closest('#weaveModes,#weaveControl'))close();});
 capture.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){e.stopPropagation();close();trigger.focus();}if(!panel.hidden&&['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const focused=Number(document.activeElement?.dataset.weaveIndex??selected);const next=e.key==='Home'?0:e.key==='End'?3:(focused+(e.key==='ArrowRight'?1:3))%4;panel.querySelector(`[data-weave-index="${next}"]`).focus();}});
 return{close,setEnabled(value){enabled=value;trigger.disabled=!value;if(!value)close();},setSelected(index){selected=index;trigger.querySelector('.weave-swatch').className='weave-swatch mode-thumbnail mode-'+modes[index][1];trigger.setAttribute('aria-label','Choose weave: '+modes[index][0]);panel.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));}};
}

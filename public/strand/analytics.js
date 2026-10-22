// Only fixed action names leave the app; never pass photo or memory data here.
const actions=new Set(['rug-generated','regenerate','flip','save','download']);
const pending=[];
export function trackAction(action){
 if(!actions.has(action)||typeof window==='undefined'||navigator.doNotTrack==='1')return;
 try{if(window.goatcounter?.count)window.goatcounter.count({path:action,title:action,event:true});else if(pending.length<20)pending.push(action);}catch{}
}
if(typeof window!=='undefined'&&navigator.doNotTrack!=='1'){
 window.goatcounter={no_onload:true,no_events:true,path:'/Machinera/strand/',title:'Machinera',referrer:()=>{try{return document.referrer?new URL(document.referrer).origin:'';}catch{return '';}}};
 const script=document.createElement('script');script.async=true;script.src='https://gc.zgo.at/count.js';script.dataset.goatcounter='https://machinera-raagul.goatcounter.com/count';
 script.onload=()=>{try{window.goatcounter.count();for(const action of pending.splice(0))trackAction(action);}catch{}};
 script.onerror=()=>{pending.length=0;};document.head.append(script);
 // Count button actions separately from the automatic reveal after printing.
 const buttons={'rugFlip':'flip','memoryDetailFlip':'flip','regenerateMemory':'regenerate','saveMemory':'save','postcardDownload':'download'};
 document.addEventListener('click',event=>{const button=event.target.closest?.('button');if(button&&!button.disabled&&buttons[button.id])trackAction(buttons[button.id]);},true);
}

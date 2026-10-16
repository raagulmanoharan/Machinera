// One reusable Web Audio graph. The shutter gesture unlocks it on mobile Safari.
// No samples, network downloads, permanent intervals, or sound while backgrounded.
export class LoomAudio {
 constructor(){this.context=null;this.master=null;this.timer=null;this.mode='idle';this.step=0;this.nodes=new Set();}
 unlock(){try{if(!this.context){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;this.context=new Audio();this.master=this.context.createGain();this.master.gain.value=.18;this.master.connect(this.context.destination);}this.context.resume().catch(()=>{});}catch{}}
 tone(frequency,duration,volume,delay=0){const c=this.context;if(!c||c.state!=='running')return;const start=c.currentTime+delay,osc=c.createOscillator(),gain=c.createGain();osc.type='sine';osc.frequency.setValueAtTime(frequency,start);osc.frequency.exponentialRampToValueAtTime(Math.max(30,frequency*.55),start+duration);gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(volume,start+.008);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);osc.connect(gain);gain.connect(this.master);this.nodes.add(osc);osc.onended=()=>{osc.disconnect();gain.disconnect();this.nodes.delete(osc);};osc.start(start);osc.stop(start+duration+.015);}
 shutter(){this.unlock();this.tone(920,.055,.42);this.tone(170,.11,.32,.035);}
 setMode(mode){if(mode===this.mode)return;this.stop();this.mode=mode;if(mode==='idle')return;const tick=()=>{if(document.hidden||this.mode==='idle'){this.stop();return;}const weaving=this.mode==='printing';this.tone(weaving?(this.step%2?210:165):300,weaving?.085:.13,weaving?.17:.085);if(weaving&&this.step%4===0)this.tone(680,.045,.07,.035);this.step++;this.timer=setTimeout(tick,weaving?185:420);};tick();}
 stop(){if(this.timer!==null)clearTimeout(this.timer);this.timer=null;this.mode='idle';}
 dispose(){this.stop();for(const node of this.nodes){try{node.stop();}catch{}}this.nodes.clear();this.context?.close().catch(()=>{});this.context=null;}
}

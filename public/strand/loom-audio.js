// Native Web Audio only. Acoustic layers are baked once, never synthesized on RAF.
// Original instrumental atmosphere inspired by drone, plucked strings and breath;
// not a rendition of a traditional composition or a claim to reproduce a ghazal.
const TAU=Math.PI*2;
export function makeSoundBank(context){
 const rate=24000;let seed=765431;
 const noise=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2147483648-1;};
 const bake=(seconds,fn)=>{const b=context.createBuffer(1,Math.ceil(seconds*rate),rate),a=b.getChannelData(0);let low=0;for(let i=0;i<a.length;i++){const n=noise();low+=.12*(n-low);a[i]=fn(i/rate,n,low);}return b;};
 const modal=(t,f)=>Math.sin(TAU*f*t)*Math.exp(-t*24)+.34*Math.sin(TAU*f*1.71*t)*Math.exp(-t*40)+.18*Math.sin(TAU*f*2.83*t)*Math.exp(-t*65);
 const bank={
  shutter:bake(.22,(t,n,l)=>(.4*modal(t,155)+.32*(n-l)*Math.exp(-t*100))*Math.min(1,t*1500)),
  shuttle:bake(.38,(t,n,l)=>(.34*modal(t,118)+.12*modal(Math.max(0,t-.035),287)*Math.min(1,t*100)+.3*l*Math.exp(-t*13))*Math.min(1,t*700)),
  brush:bake(.42,(t,n,l)=>(.48*l+.07*n)*Math.sin(Math.PI*Math.min(1,t/.42))**2*Math.exp(-t*5)),
  grain:bake(.12,(t,n,l)=>.24*(n-l)*Math.sin(Math.PI*t/.12)**2*Math.exp(-t*27)),
  settle:bake(.8,(t,n,l)=>(.32*l+.025*n)*Math.sin(Math.PI*t/.8)**2*Math.exp(-t*3)),
  // Damped partials with unequal decay approximate a sympathetic plucked string.
  string:bake(5,(t)=>{let v=0;for(let h=1;h<=9;h++)v+=Math.sin(TAU*146.832*h*(1+.00008*h*h)*t+.3*h)*Math.exp(-t*(.65+h*.19))/(h**1.45);return .45*v*(1-Math.exp(-t*160))*(1-Math.exp(-(5-t)*15));}),
  breath:bake(5,(t,n,l)=>{const e=Math.sin(Math.PI*t/5)**2,phase=TAU*146.832*t+.027*Math.sin(TAU*4.6*t);return e*(.28*Math.sin(phase)+.055*Math.sin(2*phase)+.025*Math.sin(3*phase)+.028*l);})
 };
 const irRate=context.sampleRate||rate,ir=context.createBuffer(2,Math.ceil(irRate*2.6),irRate);
 for(let channel=0;channel<2;channel++){const a=ir.getChannelData(channel);let low=0;for(let i=0;i<a.length;i++){low+=.25*(noise()-low);const t=i/irRate;a[i]=i<irRate*.023?0:low*Math.exp(-t*3.1)*.38;}}bank.room=ir;
 return bank;
}
export class LoomAudio{
 constructor(){this.context=null;this.master=null;this.timer=null;this.mode='idle';this.step=0;this.droneStep=0;this.nodes=new Set();this.nextEffect=0;this.nextDrone=0;this.nextPhrase=0;this.phrase=0;this.disposed=false;this.suspendTimer=null;this.enabled=true;try{this.enabled=localStorage.getItem('machinera-sound')!=='off';}catch{}}
 prepare(){if(this.disposed||!this.enabled||document.hidden||this.context)return;try{if(!this.context){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;const c=this.context=new Audio({latencyHint:'playback'});this.bank=makeSoundBank(c);this.master=c.createGain();this.master.gain.value=0;const high=c.createBiquadFilter();high.type='highpass';high.frequency.value=38;const limiter=c.createDynamicsCompressor();limiter.threshold.value=-16;limiter.knee.value=15;limiter.ratio.value=3;limiter.attack.value=.012;limiter.release.value=.28;this.master.connect(high);high.connect(limiter);limiter.connect(c.destination);this.music=c.createGain();this.music.gain.value=.46;this.effects=c.createGain();this.effects.gain.value=.8;this.music.connect(this.master);this.effects.connect(this.master);const room=c.createConvolver();room.buffer=this.bank.room;const wet=c.createGain();wet.gain.value=.22;room.connect(wet);wet.connect(this.master);this.music.connect(room);const send=c.createGain();send.gain.value=.25;this.effects.connect(send);send.connect(room);}
}catch{this.context?.close().catch(()=>{});this.context=null;}}
 unlock(){if(this.disposed||!this.enabled||document.hidden)return;this.prepare();if(!this.context)return;try{
 const c=this.context;if(this.suspendTimer!==null){clearTimeout(this.suspendTimer);this.suspendTimer=null;for(const v of this.nodes){try{v.source.stop();}catch{}v.source.onended?.();}}return c.resume().then(()=>{if(this.disposed||!this.enabled||document.hidden)return;this.master.gain.cancelScheduledValues(c.currentTime);this.master.gain.setTargetAtTime(.38,c.currentTime,.55);if(this.timer===null){this.nextDrone=c.currentTime+.12;this.nextPhrase=c.currentTime+2;this.nextEffect=c.currentTime+.04;this.schedule();}}).catch(()=>{});
 }catch{}}
 play(name,time,volume=1,rate=1,music=false,pan=0){const c=this.context;if(!c||c.state!=='running'||!this.enabled||this.nodes.size>=28)return;const source=c.createBufferSource(),gain=c.createGain();source.buffer=this.bank[name];source.playbackRate.value=rate;gain.gain.value=volume;source.connect(gain);let stereo=null;if(c.createStereoPanner){stereo=c.createStereoPanner();stereo.pan.value=pan;gain.connect(stereo);stereo.connect(music?this.music:this.effects);}else gain.connect(music?this.music:this.effects);const voice={source,gain,music,name};this.nodes.add(voice);source.onended=()=>{source.disconnect();gain.disconnect();stereo?.disconnect();this.nodes.delete(voice);};source.start(Math.max(c.currentTime,time));return voice;}
 schedule(){if(this.disposed||!this.enabled||document.hidden||this.context?.state!=='running'){this.timer=null;return;}const c=this.context,now=c.currentTime,horizon=now+.22;
 // A quiet four-string tonic/fifth cycle; no beat grid or backing-track loop.
 while(this.nextDrone<horizon){const pitches=[.5,.75,1,.5],i=this.droneStep++%4;this.play('string',Math.max(now,this.nextDrone),i===0?.18:.12,pitches[i],true,i%2?.22:-.22);this.nextDrone+=1.85+(i===3?.6:0);}
 if(this.nextPhrase<horizon){const motifs=[[1,1.2,1.333333,1.2,1.066667,1],[1.5,1.333333,1.2,1.066667,1],[1,1.066667,1.2,1.5,1.333333,1.2,1]],notes=motifs[this.phrase++%motifs.length];let t=Math.max(now,this.nextPhrase);for(let i=0;i<notes.length;i++){this.play(i%3===1?'breath':'string',t,.15+(i===0?.025:0),notes[i]*2,true,Math.sin(i*1.4)*.18);t+=i%3===0?1.45:1.05;}this.nextPhrase=t+6+(this.phrase%3)*2;}
 if(this.mode!=='idle')while(this.nextEffect<horizon){const t=Math.max(now,this.nextEffect);if(this.mode==='printing'){this.play('shuttle',t,.65,.96+(this.step%5)*.017,false,-.1);this.play('brush',t+.035,.7,1.04,false,.1);if(this.step%3===0)this.play('grain',t+.07,.22,1.15);this.nextEffect+=.28+.018*Math.sin(this.step++*2.4);}else{this.play('brush',t,.23,.72,false,Math.sin(this.step)*.12);this.play('grain',t+.08,.12,.85+(this.step%4)*.09);this.nextEffect+=.16+.05*Math.sin(this.step++*1.7);}}
 this.timer=setTimeout(()=>{this.timer=null;this.schedule();},100);}
 shutter(){this.unlock()?.then(()=>{if(this.context)this.play('shutter',this.context.currentTime,.8);});}
 setMode(mode){if(mode===this.mode)return;const previous=this.mode;this.mode=mode;const c=this.context;if(!c)return;this.nextEffect=c.currentTime+.035;this.music.gain.setTargetAtTime(mode==='idle'?.46:.29,c.currentTime,mode==='idle'?.8:.18);for(const voice of this.nodes)if(!voice.music&&voice.name!=='shutter'){voice.gain.gain.setTargetAtTime(.0001,c.currentTime,.045);try{voice.source.stop(c.currentTime+.2);}catch{}}if(previous==='printing'&&mode==='idle')this.play('settle',c.currentTime,.65);}
 stop(){this.setMode('idle');}
 setEnabled(enabled){this.enabled=enabled;try{localStorage.setItem('machinera-sound',enabled?'on':'off');}catch{}if(enabled)this.unlock();else this.suspend();}
 suspend(){if(this.timer!==null)clearTimeout(this.timer);this.timer=null;const c=this.context;if(!c)return;this.master.gain.cancelScheduledValues(c.currentTime);this.master.gain.setTargetAtTime(.0001,c.currentTime,.025);if(this.suspendTimer!==null)clearTimeout(this.suspendTimer);this.suspendTimer=setTimeout(()=>{this.suspendTimer=null;for(const v of this.nodes){try{v.source.stop();}catch{}v.source.onended?.();}c.suspend().catch(()=>{});},110);}

 dispose(){this.disposed=true;this.suspend();if(this.suspendTimer!==null)clearTimeout(this.suspendTimer);this.suspendTimer=null;for(const v of this.nodes){try{v.source.stop();}catch{}v.source.onended?.();}this.context?.close().catch(()=>{});this.context=null;this.bank=null;}
}

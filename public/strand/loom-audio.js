import {GenerativeScore} from './generative-score.js?v=156';
// Native Web Audio only. Acoustic layers are baked once, never synthesized on RAF.
// Original instrumental atmosphere inspired by drone, plucked strings and breath;
// not a rendition of a traditional composition or a claim to reproduce a ghazal.
const TAU=Math.PI*2;
export function makeSoundBank(context){
 const rate=24000;let seed=765431;
 const noise=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2147483648-1;};
 const bake=(seconds,fn)=>{const b=context.createBuffer(1,Math.ceil(seconds*rate),rate),a=b.getChannelData(0);let low=0;for(let i=0;i<a.length;i++){const n=noise();low+=.12*(n-low);a[i]=fn(i/rate,n,low);}return b;};
 const bank={
  // Two curtain impacts, a mirror slap and a brief ratchet tail: dry and
  // broadband rather than a pitched electronic blip. Baked once at startup.
  shutter:bake(.19,(t,n,l)=>{let out=0;for(const [at,gain] of [[0,.8],[.036,.62],[.069,.24]]){const u=t-at;if(u>=0){const attack=Math.min(1,u*6000),body=Math.sin(TAU*190*u)*Math.exp(-u*180)+.35*Math.sin(TAU*430*u)*Math.exp(-u*240);out+=gain*attack*((n-l)*Math.exp(-u*330)+.35*body+.13*l*Math.exp(-u*65));}}const u=t-.075;if(u>0)out+=.09*(n-l)*Math.exp(-u*65)*(.5+.5*Math.cos(TAU*95*u));return out;}),
  // One pitch per cloud, so voicings can change without transposing a chord loop.
  cloud:bake(10,(t,n,l)=>{const e=Math.sin(Math.PI*t/10)**2,p=TAU*146.832*t;return e*(.14*Math.sin(p+.3*Math.sin(TAU*.071*t))+.09*Math.sin(p*1.0021)+.09*Math.sin(p*.9983)+.03*Math.sin(p*2.001)+.09*l);}),
  air:bake(8,(t,n,l)=>Math.sin(Math.PI*t/8)**2*(.18*l+.008*n)*(.7+.3*Math.sin(TAU*.19*t))),
  // Plucked-string model: bridge buzz (jawari), pluck-position comb filtering,
  // unequal harmonic decay and quiet sympathetic partials; no hammer transient.
  string:bake(5,(t,n,l)=>{
   const f=146.832,bend=f*.012*.09*(1-Math.exp(-t/.09)),p=TAU*(f*t+bend);let body=0;
   for(let h=1;h<=12;h++)body+=Math.sin(p*h+.000012*h*h*h*t)*Math.sin(Math.PI*h*.23)*Math.exp(-t*(.25+.11*Math.sqrt(h)+h*.045))/(h**1.15);
   const bridge=(Math.tanh(2.4*Math.sin(p))-.78*Math.sin(p))*.12*Math.exp(-t*.85);
   const sympathetic=.065*Math.sin(p*2+.04*Math.sin(t*2.1))*Math.exp(-t*.27)+.035*Math.sin(p*3)*Math.exp(-t*.38);
   return (.52*body+bridge+sympathetic)*(1-Math.exp(-t*85))*(1-Math.exp(-(5-t)*8))+.006*l*Math.exp(-t*5);
  }),
  // A separate hollow, low bamboo-flute voice, not a transposed lead sample.
  alto:bake(3.4,(t,n,l)=>{const e=(1-Math.exp(-t*4))*Math.min(1,(3.4-t)/.8),p=TAU*293.664*t+.025*Math.sin(TAU*4.1*t);return e*(.26*Math.sin(p)+.014*Math.sin(2*p)+.05*Math.sin(3*p+.2)+.045*l+.002*n)*(.96+.04*Math.sin(TAU*.49*t));}),
  // Breath-driven bamboo-flute colour: soft onset, delayed vibrato, air and
  // a small settling pitch curve rather than a perfectly static oscillator.
  breath:bake(5,(t,n,l)=>{
   const envelope=(1-Math.exp(-t*3.8))*Math.min(1,(5-t)/1.4),vibrato=.045*(1-Math.exp(-t*.9))*Math.sin(TAU*4.7*t);
   const p=TAU*(293.664*t-293.664*.008*.16*(1-Math.exp(-t/.16)))+vibrato;
   return envelope*(.24*Math.sin(p)+.027*Math.sin(p*2+.2)+.012*Math.sin(p*3)+.035*l+.003*n)*(.94+.06*Math.sin(TAU*.7*t));
  })
 };
 const irRate=context.sampleRate||rate,ir=context.createBuffer(2,Math.ceil(irRate*3.8),irRate);
 for(let channel=0;channel<2;channel++){const a=ir.getChannelData(channel);let low=0;for(let i=0;i<a.length;i++){low+=.25*(noise()-low);const t=i/irRate;a[i]=i<irRate*.023?0:low*Math.exp(-t*1.25)*.38;}}bank.room=ir;
 return bank;
}
export class LoomAudio{
 constructor(){this.context=null;this.scanBuffer=null;this.master=null;this.timer=null;this.nodes=new Set();const seed=globalThis.crypto?.getRandomValues?.(new Uint32Array(1))[0]??Math.floor(Math.random()*4294967296);this.score=new GenerativeScore(seed);this.disposed=false;this.suspendTimer=null;this.enabled=true;try{this.enabled=localStorage.getItem('machinera-sound')!=='off';}catch{}}
 prepare(){if(this.disposed||!this.enabled||document.hidden||this.context)return;try{if(!this.context){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;const c=this.context=new Audio({latencyHint:'playback'});this.bank=makeSoundBank(c);this.master=c.createGain();this.master.gain.value=0;const high=c.createBiquadFilter();high.type='highpass';high.frequency.value=38;const limiter=c.createDynamicsCompressor();limiter.threshold.value=-16;limiter.knee.value=15;limiter.ratio.value=3;limiter.attack.value=.012;limiter.release.value=.28;this.master.connect(high);high.connect(limiter);limiter.connect(c.destination);this.music=c.createGain();this.music.gain.value=.46;this.effects=c.createGain();this.effects.gain.value=.8;const dry=c.createGain();dry.gain.value=.62;this.music.connect(dry);dry.connect(this.master);this.effects.connect(this.master);const room=c.createConvolver();room.buffer=this.bank.room;const wet=c.createGain();wet.gain.value=.43;const damp=c.createBiquadFilter();damp.type='lowpass';damp.frequency.value=2800;room.connect(damp);damp.connect(wet);wet.connect(this.master);this.music.connect(room);const send=c.createGain();send.gain.value=.12;this.effects.connect(send);send.connect(room);const delay=c.createDelay(2),feedback=c.createGain(),echo=c.createGain(),dark=c.createBiquadFilter();delay.delayTime.value=.73;feedback.gain.value=.34;echo.gain.value=.28;dark.type='lowpass';dark.frequency.value=1900;this.music.connect(delay);delay.connect(dark);dark.connect(feedback);feedback.connect(delay);dark.connect(echo);echo.connect(this.master);echo.connect(room);}
}catch{this.context?.close().catch(()=>{});this.context=null;}}
 unlock(){if(this.disposed||!this.enabled||document.hidden)return;this.prepare();if(!this.context)return;try{
 const c=this.context;if(this.suspendTimer!==null){clearTimeout(this.suspendTimer);this.suspendTimer=null;for(const v of this.nodes){try{v.source.stop();}catch{}v.source.onended?.();}}return c.resume().then(()=>{if(this.disposed||!this.enabled||document.hidden)return;this.master.gain.cancelScheduledValues(c.currentTime);this.master.gain.setTargetAtTime(.38,c.currentTime,.55);if(this.timer===null){this.score.reset(c.currentTime);this.schedule();}}).catch(()=>{});
 }catch{}}
 play(name,time,volume=1,rate=1,music=false,pan=0,glide=0,timbre=null){
 const c=this.context;if(!c||c.state!=='running'||!this.enabled||this.nodes.size>=28)return;
 const at=Math.max(c.currentTime,time),source=c.createBufferSource(),gain=c.createGain();source.buffer=this.bank[name];source.playbackRate.value=rate;
 if(glide){source.playbackRate.setValueAtTime(rate*(1+glide),at);source.playbackRate.exponentialRampToValueAtTime(rate,at+.22);}
 let filter=null,noise=null,noiseGain=null,end=null;gain.gain.value=volume;
 if(timbre){
  const duration=Math.min(source.buffer.duration/rate,timbre.release),attack=timbre.part==='counter'?.3:.12;
  gain.gain.setValueAtTime(.0001,at);
  const phase=timbre.phase??0,pressure=timbre.pressure??.045;
  // Native audio automation, independent of animation frame rate. Each breath
  // settles into pitch, wavers slightly and fades through an uneven air stream.
  for(let t=.04;t<duration+.039;t+=.04){const u=Math.min(duration,t),tail=Math.max(0,(u-duration*.62)/(duration*.38)),envelope=Math.min(1,u/attack)*(.5+.5*Math.cos(Math.PI*tail));
   const air=1+pressure*Math.sin(u*7.1+phase)+pressure*.4*Math.sin(u*13.7+phase*.7);
   gain.gain.exponentialRampToValueAtTime(Math.max(.0001,volume*envelope*air),at+u);
   const vibrato=(timbre.vibrato??4)*(1-Math.exp(-u*2))*Math.sin(TAU*(timbre.vibratoRate??4.6)*u+phase),drift=2*Math.sin(u*1.7+phase)-3*Math.exp(-u*8);
   source.playbackRate.exponentialRampToValueAtTime(rate*2**(((timbre.cents??0)+vibrato+drift)/1200),at+u);
  }
  filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.setValueAtTime(timbre.cutoff,at);filter.frequency.exponentialRampToValueAtTime(timbre.cutoff*.6,at+duration);source.connect(filter);filter.connect(gain);
  noise=c.createBufferSource();noise.buffer=this.bank.air;noise.loop=true;noiseGain=c.createGain();noiseGain.gain.value=timbre.noiseMix;noise.connect(noiseGain);noiseGain.connect(filter);noise.start(at,2+(phase/(Math.PI*2))*2);end=at+duration+.02;
 }else source.connect(gain);
 let stereo=null;if(c.createStereoPanner){stereo=c.createStereoPanner();stereo.pan.value=pan;gain.connect(stereo);stereo.connect(music?this.music:this.effects);}else gain.connect(music?this.music:this.effects);
 const voice={source,gain,music,name,filter,noise,timbre};this.nodes.add(voice);source.onended=()=>{try{noise?.stop();}catch{}source.disconnect();noise?.disconnect();noiseGain?.disconnect();filter?.disconnect();gain.disconnect();stereo?.disconnect();this.nodes.delete(voice);};source.start(at);if(end!==null)source.stop(end);return voice;
 }

 schedule(){if(this.disposed||!this.enabled||document.hidden||this.context?.state!=='running'){this.timer=null;return;}const c=this.context,now=c.currentTime,horizon=now+.22;
 for(const event of this.score.eventsUntil(now,horizon))this.play(event.name,event.time,event.volume,event.rate,true,event.pan,event.glide,event.timbre);
 this.timer=setTimeout(()=>{this.timer=null;this.schedule();},100);}
 shutter(){this.unlock()?.then(()=>{if(this.context)this.play('shutter',this.context.currentTime,.3);});}

 saveClick(){this.unlock()?.then(()=>{if(this.context)this.play('shutter',this.context.currentTime,.22,1.45);});}

 startScan(){let stopped=false,voice=null;this.unlock()?.then(()=>{if(stopped||!this.enabled||!this.context)return;const c=this.context,source=c.createBufferSource(),gain=c.createGain(),filter=c.createBiquadFilter();if(!this.scanBuffer){const buffer=c.createBuffer(1,24000,24000),samples=buffer.getChannelData(0);let seed=72139,low=0;for(let i=0;i<samples.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const n=seed/2147483648-1;low+=.09*(n-low);const phase=(i%1200)/24000,envelope=phase<.016?Math.sin(Math.PI*phase/.016)**2:0;samples[i]=(.32*(n-low)+.12*low)*envelope;}this.scanBuffer=buffer;}source.buffer=this.scanBuffer;source.loop=true;source.playbackRate.value=1;filter.type='bandpass';filter.frequency.value=1700;filter.Q.value=.65;gain.gain.setValueAtTime(.24,c.currentTime);source.connect(filter);filter.connect(gain);gain.connect(this.effects);voice={source,gain,filter,name:'scan',music:false};this.nodes.add(voice);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();this.nodes.delete(voice);};source.start();});return()=>{if(stopped)return;stopped=true;if(voice&&this.context){const now=this.context.currentTime;voice.gain.gain.setTargetAtTime(.0001,now,.015);try{voice.source.stop(now+.09);}catch{}}};}


 setEnabled(enabled){this.enabled=enabled;try{localStorage.setItem('machinera-sound',enabled?'on':'off');}catch{}if(enabled)this.unlock();else this.suspend();}
 suspend(){if(this.timer!==null)clearTimeout(this.timer);this.timer=null;const c=this.context;if(!c)return;this.master.gain.cancelScheduledValues(c.currentTime);this.master.gain.setTargetAtTime(.0001,c.currentTime,.025);if(this.suspendTimer!==null)clearTimeout(this.suspendTimer);this.suspendTimer=setTimeout(()=>{this.suspendTimer=null;for(const v of this.nodes){try{v.source.stop();}catch{}v.source.onended?.();}c.suspend().catch(()=>{});},110);}

 dispose(){this.disposed=true;this.suspend();if(this.suspendTimer!==null)clearTimeout(this.suspendTimer);this.suspendTimer=null;for(const v of this.nodes){try{v.source.stop();}catch{}v.source.onended?.();}this.context?.close().catch(()=>{});this.context=null;this.bank=null;this.scanBuffer=null;}
}

// Original instrumental grammar, not a transcription or a complete raga model.
// Returning cadences and varied couplet-like calls/responses provide continuity.
// Equal-tempered note vocabularies, suitable for harmonium-like synthesis.
// These are raga-inspired palettes, not full rules for performing those ragas.
const mode=(id,notes,anchors,voicings)=>{const base=notes.map(n=>2**(n/12));return Object.freeze({id,notes:Object.freeze(notes),anchors:Object.freeze(anchors),voicings:Object.freeze(voicings.map(Object.freeze)),ratios:Object.freeze([.5,base[4]/2,...base,2,...base.slice(1,5).map(r=>r*2)])});};
export const SCORE_MODES=Object.freeze({
 bhairavi:mode('bhairavi',[0,1,3,5,7,8,10],[0,3,4],[[2,6,9],[2,4,6],[5,7,9],[2,5,9]]),
 kafi:mode('kafi',[0,2,3,5,7,9,10],[0,1,4],[[2,6,9],[2,4,6],[5,7,9],[2,5,6]]),
 yaman:mode('yaman',[0,2,4,6,7,9,11],[0,2,6],[[2,6,9],[2,4,6],[4,6,8],[2,4,9]])
});
export class GenerativeScore{
 constructor(seed,modeId){this.seed=seed>>>0||1;this.mode=modeId?SCORE_MODES[modeId]:this.pick([SCORE_MODES.bhairavi,SCORE_MODES.kafi]);if(!this.mode)throw new Error('Unknown musical mode');this.ratios=this.mode.ratios;this.phrases=0;this.queue=[];this.recent=[];this.anchor=[0,this.pick([1,2,3]),this.pick([3,4,5]),this.pick([1,2,3]),0];this.section='invocation';this.sectionLeft=2;this.reset(0);}
 random(){let n=this.seed;n^=n<<13;n^=n>>>17;n^=n<<5;this.seed=n>>>0;return this.seed/4294967296;}
 pick(a){return a[Math.floor(this.random()*a.length)];}
 reset(now){this.queue.length=0;this.nextDrone=now+.04;this.nextCloud=now+.08;this.nextAir=now+3;this.nextPhrase=now+2;this.nextArp=[now+.1,now+1.8,now+5.2];this.arpStep=[0,0,0];this.harmony=0;this.nextHarmony=now+24;this.started=now;}
 event(name,time,volume,degree,pan=0,glide=0){return{name,time,volume,rate:this.ratios[degree],pan,glide};}
 // Notes are scale-degree walks, with a remembered contour and cadential anchors.
 phrase(time){
  if(this.sectionLeft--<=0){this.section=this.section==='invocation'?'couplet':this.section==='couplet'?this.pick(['elaboration','repose']):this.section==='elaboration'?'repose':this.pick(['couplet','elaboration']);this.sectionLeft=2+Math.floor(this.random()*4);}
  const opening=this.section==='invocation',answer=this.answerNext,energy=({invocation:.15,couplet:.4,elaboration:.72,repose:.12}[this.section])+this.random()*.15;
  const length=4+Math.floor(this.random()*(answer?4:6));let degree=answer?this.pick([0,2,3]):this.pick(this.mode.anchors);
  const contour=[];for(let i=0;i<length;i++){
   if(i===length-1)degree=answer?0:this.pick(this.mode.anchors);
   else if(i&&this.random()<.24)degree=this.anchor[i%this.anchor.length];
   else if(i)degree=Math.max(0,Math.min(energy>.6?9:7,degree+this.pick(answer?[-2,-1,-1,0,1]:[-1,0,1,1,2])));
   contour.push(degree);
  }
  // Remember the question; responses reshape rather than replay it literally.
  if(!answer)this.anchor=contour.slice();
  const fingerprint=contour.join(',');if(this.recent.includes(fingerprint)&&contour.length>3)contour[1]=(contour[1]+1)%5;
  this.recent.push(contour.join(','));if(this.recent.length>12)this.recent.shift();
  const events=[];let t=time;const voice=answer?'string':'breath';
  for(let i=0;i<contour.length;i++){
   const interval=(answer?1.25:1.75)+this.random()*1.25,d=contour[i]+2,pan=answer?-.22:.18;
   events.push(this.event(voice,t,(answer?.09:.13)*( .85+this.random()*.3),d,pan,(i&&this.random()<.45)?(this.random()-.5)*.055:0));
   // A quiet, independent answering voice enters only in developed passages.
   if(!opening&&!answer&&i>1&&i<contour.length-1&&this.random()<energy*.35)events.push(this.event('string',t+.35+this.random()*.5,.055,2+Math.max(0,contour[i]-2),-.32));
   t+=interval*(i===contour.length-1?1.5:1);
  }
  this.phrases++;this.answerNext=!answer&&this.random()<.8;
  this.nextPhrase=t+(this.section==='repose'?10+this.random()*10:this.answerNext?2+this.random()*3:5+this.random()*8);
  return{events,contour,answer:!!answer,energy,end:t,section:this.section};
 }
 eventsUntil(now,horizon=now+.22){const out=[];
  // Short scheduling horizon bounds live sources; long phrase plans stay as data.
  if(this.nextHarmony<horizon){this.harmony=(this.harmony+this.pick([1,1,3]))%this.mode.voicings.length;this.nextHarmony=Math.max(now,this.nextHarmony)+24+this.random()*18;}
  // Three independently paced arpeggios share a slow-moving harmonic centre.
  // D, F, A, C / D, G, A / Bb, D, F: open minor colours, never a chord loop.
  const shapes=[[2,4,6,8],[2,5,6,9],[7,9,11,6],[2,4,8,9]];
  for(let layer=0;layer<3;layer++)if(this.nextArp[layer]<horizon){
   const shape=shapes[this.harmony],walk=[0,1,2,3,2,1],step=this.arpStep[layer]++;
   let degree=shape[walk[(step+layer*2)%walk.length]];
   if(layer===0)degree=[0,2,4,6][walk[step%walk.length]];
   if(layer===2)degree=Math.min(this.ratios.length-1,degree+this.pick([0,0,2]));
   if(layer!==2||this.random()>.28)out.push(this.event(layer===2?'breath':'arp',Math.max(now,this.nextArp[layer]),[.16,.105,.065][layer]*(.82+this.random()*.3),degree,[-.32,.3,.08][layer],layer===2?-.012:(step%3===1?.018:0)));
   this.nextArp[layer]=Math.max(now,this.nextArp[layer])+[2.8,4.15,6.4][layer]*(.94+this.random()*.12);
  }
  if(this.nextDrone<horizon){out.push(this.event('string',Math.max(now,this.nextDrone),.095+this.random()*.035,this.pick([0,0,1,2]),(this.random()-.5)*.4));this.nextDrone=Math.max(now,this.nextDrone)+2.2+this.random()*2.3;}
  if(this.nextCloud<horizon){
   const voicing=this.mode.voicings[this.harmony];
   for(let i=0;i<voicing.length;i++)out.push(this.event('cloud',Math.max(now,this.nextCloud)+i*.12,.1+this.random()*.025,voicing[i],(i-1)*.28));
   this.nextCloud=Math.max(now,this.nextCloud)+12+this.random()*5;
  }
  if(this.nextAir<horizon){out.push(this.event('air',Math.max(now,this.nextAir),.09,2,(this.random()-.5)*.65));this.nextAir=Math.max(now,this.nextAir)+5+this.random()*5;}
  this.queue.sort((a,b)=>a.time-b.time);while(this.queue.length&&this.queue[0].time<horizon){const e=this.queue.shift();if(e.time>=now-.15)out.push(e);}
  return out.sort((a,b)=>a.time-b.time);
 }
}

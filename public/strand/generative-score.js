// Original instrumental grammar, not a transcription or a complete raga model.
// Evolving arpeggios and an independent counterline retain a shared pulse.
// Equal-tempered note vocabularies, suitable for harmonium-like synthesis.
// These are raga-inspired palettes, not full rules for performing those ragas.
const mode=(id,notes,anchors,voicings)=>{const base=notes.map(n=>2**(n/12));return Object.freeze({id,notes:Object.freeze(notes),anchors:Object.freeze(anchors),voicings:Object.freeze(voicings.map(Object.freeze)),ratios:Object.freeze([.5,base[4]/2,...base,2,...base.slice(1,5).map(r=>r*2)])});};
export const SCORE_MODES=Object.freeze({
 bhairavi:mode('bhairavi',[0,1,3,5,7,8,10],[0,3,4],[[2,6,9],[2,4,6],[5,7,9],[2,5,9]]),
 kafi:mode('kafi',[0,2,3,5,7,9,10],[0,1,4],[[2,6,9],[2,4,6],[5,7,9],[2,5,6]]),
 yaman:mode('yaman',[0,2,4,6,7,9,11],[0,2,6],[[2,6,9],[2,4,6],[4,6,8],[2,4,9]])
});
export class GenerativeScore{
 constructor(seed,modeId){this.seed=seed>>>0||1;this.mode=modeId?SCORE_MODES[modeId]:this.pick([SCORE_MODES.bhairavi,SCORE_MODES.kafi]);if(!this.mode)throw new Error('Unknown musical mode');this.ratios=this.mode.ratios;this.chords=[[2,4,6,9],[5,7,9,11],[7,9,11,13],[2,5,6,9]];this.reset(0);}
 random(){let n=this.seed;n^=n<<13;n^=n>>>17;n^=n<<5;this.seed=n>>>0;return this.seed/4294967296;}
 pick(a){return a[Math.floor(this.random()*a.length)];}
 reset(now){this.nextDrone=now+.04;this.nextCloud=now+.08;this.nextAir=now+3;this.nextArp=[now+.1];this.arpStep=[0];this.harmony=0;this.nextHarmony=now+.1+43.2;this.started=now;this.pattern=[2,4,6,9,9,6,4,2];this.nextMutation=this.pick([4,8]);this.nextCounter=now+.55;this.counterStep=0;this.counterDegree=6;this.counterBeat=.5;this.epoch=now+.1;this.leadDegree=2;this.mutations=0;}
 event(name,time,volume,degree,pan=0,glide=0){return{name,time,volume,degree,rate:this.ratios[degree],pan,glide};}
 evolve(){
  const before=this.pattern.slice(),slots=[1,2,3,4,5,6],changed=[],chord=this.chords[this.harmony];
  for(let i=0,count=this.pick([1,2]);i<count;i++){
   const slot=this.pick(slots.filter(s=>!changed.includes(s))),old=this.pattern[slot];
   // Substitute chord tones, never an unconstrained walk across the scale.
   const candidates=chord.filter(d=>d!==old&&Math.abs(d-old)<=5);
   if(candidates.length){this.pattern[slot]=this.pick(candidates);changed.push(slot);}
  }
  this.mutations++;return{before,after:this.pattern.slice(),changed};
 }
 phraseRole(time){const bar=Math.floor(Math.max(0,time-this.epoch)/3.6)%8;return bar<2?'call':bar<4?'answer':bar<6?'together':'breath';}
 fluteDegree(d){while(d>9)d-=7;while(d<4)d+=7;return d;}
 timbre(time,voice){const t=time-this.epoch,lead=voice==='lead';
  return{part:voice,release:(lead?1.1:2.5)+(lead?.6:.8)*(1+Math.sin(t*.071+(lead?0:1.8))),cutoff:(lead?2400:1900)+600*(1+Math.sin(t*.053+(lead?0:2.1))),noiseMix:.012+.012*(1+Math.sin(t*.037+(lead?0:1.2)))};
 }
 counterpoint(time){
  const lead=this.leadDegree,nextLead=this.fluteDegree(this.pattern[this.arpStep[0]%this.pattern.length]),direction=Math.sign(nextLead-lead),last=this.counterDegree;
  const pitch=d=>12*Math.log2(this.ratios[d]);
  let candidates=[2,3,4,5,6].filter(d=>{
   const interval=((Math.round(pitch(d)-pitch(lead))%12)+12)%12,move=pitch(d)-pitch(last);
   return d!==last&&Math.abs(move)<=7&&[0,3,4,7,8,9].includes(interval);
  });
  // Prefer contrary motion; short passing steps connect the sustained tones.
  const contrary=candidates.filter(d=>Math.sign(d-last)===-direction);if(direction&&contrary.length)candidates=contrary;
  let degree=candidates.length?this.pick(candidates):last;

  if(this.counterStep%16===15)degree=this.pick([2,6]);
  this.counterDegree=degree;const rhythm=[1.5,1,2,1.5,1,1,2,2][this.counterStep++%8];this.counterBeat+=rhythm;this.nextCounter=this.epoch+this.counterBeat*.9;
  const role=this.phraseRole(time),volume=role==='call'?.075:role==='together'?.16:.2;
  return {...this.event('breath',time,volume,degree,.32,0),part:'counter',timbre:this.timbre(time,'counter')};
 }
 eventsUntil(now,horizon=now+.22){const out=[];
  // Short scheduling horizon bounds live sources; long phrase plans stay as data.
  if(this.nextHarmony<horizon){this.harmony=(this.harmony+this.pick([1,1,3]))%this.mode.voicings.length;this.nextHarmony+=43.2;const c=this.chords[this.harmony];this.pattern=[c[0],c[1],c[2],c[3],c[3],c[2],c[1],c[0]];}
  // 4/4 at a 900 ms quarter-note pulse. Change one or two inner notes
  // every one or two bars, retaining the bass, cadence and rhythmic identity.
  if(this.nextArp[0]<horizon){
   const step=this.arpStep[0]++,time=Math.max(now,this.nextArp[0]);
   if(step>=this.nextMutation){this.evolve();this.nextMutation=step+this.pick([4,8]);}
   const degree=this.fluteDegree(this.pattern[step%8]),role=this.phraseRole(time),beat=step%4;
   this.leadDegree=degree;
   // Calls breathe, answers leave space, then both voices meet for two bars.
   const sounding=role==='call'?step%8!==7:role==='answer'?beat<2:role==='together'?true:step%8===0||step%8>=6;
   if(sounding)out.push({...this.event('breath',time,(role==='answer'?.1:.17)*(beat===0?1:.88),degree,-.32,0),part:'lead',timbre:this.timbre(time,'lead')});
   this.nextArp[0]+=.9;if(this.nextArp[0]<now)this.nextArp[0]=now+.9;
  }
  if(this.nextCounter<horizon)out.push(this.counterpoint(Math.max(now,this.nextCounter)));
  if(this.nextDrone<horizon){out.push(this.event('string',Math.max(now,this.nextDrone),.025+this.random()*.01,0,-.12));this.nextDrone=Math.max(now,this.nextDrone)+7.2;}
  if(this.nextCloud<horizon){
   const voicing=this.mode.voicings[this.harmony];
   for(let i=0;i<voicing.length;i++)out.push(this.event('cloud',Math.max(now,this.nextCloud)+i*.12,.04+this.random()*.01,voicing[i],(i-1)*.28));
   this.nextCloud=Math.max(now,this.nextCloud)+12+this.random()*5;
  }
  if(this.nextAir<horizon){out.push(this.event('air',Math.max(now,this.nextAir),.09,2,(this.random()-.5)*.65));this.nextAir=Math.max(now,this.nextAir)+5+this.random()*5;}
  return out.sort((a,b)=>a.time-b.time);
 }
}

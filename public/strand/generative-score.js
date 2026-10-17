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
 reset(now){this.nextDrone=now+.04;this.nextCloud=now+.08;this.nextAir=now+3;this.nextArp=[now+.1,now+.55];this.arpStep=[0,0];this.harmony=0;this.nextHarmony=now+.1+43.2;this.started=now;this.pattern=[2,4,6,9,9,6,4,2];this.nextMutation=this.pick([4,8]);this.nextCounter=now+.55;this.counterStep=0;this.counterDegree=6;this.counterBeat=.5;this.epoch=now+.1;this.leadDegree=2;this.mutations=0;}
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
 timbre(time,voice){const t=time-this.epoch,flute=voice==='breath';
  return{release:(flute?3.4:2.7)+.8*(1+Math.sin(t*.071+(flute?1.8:0))),cutoff:(flute?2100:1500)+800*(1+Math.sin(t*.053+(flute?2.1:0))),noiseMix:.008+.018*(1+Math.sin(t*.037+(flute?1.2:0)))};
 }
 counterpoint(time){
  const lead=this.leadDegree,nextLead=this.pattern[this.arpStep[0]%this.pattern.length],direction=Math.sign(nextLead-lead),last=this.counterDegree;
  const pitch=d=>12*Math.log2(this.ratios[d]);
  let candidates=[2,3,4,5,6,7,8].filter(d=>{
   const interval=((Math.round(pitch(d)+12-pitch(lead))%12)+12)%12,move=pitch(d)-pitch(last);
   return d!==last&&Math.abs(move)<=7&&[0,3,4,7,8,9].includes(interval);
  });
  // Prefer contrary motion; short passing steps connect the sustained tones.
  const contrary=candidates.filter(d=>Math.sign(d-last)===-direction);if(direction&&contrary.length)candidates=contrary;
  let degree=candidates.length?this.pick(candidates):last;

  if(this.counterStep%16===15)degree=this.pick([2,6]);
  this.counterDegree=degree;const rhythm=[1.5,1,2,1.5,1,1,2,2][this.counterStep++%8];this.counterBeat+=rhythm;this.nextCounter=this.epoch+this.counterBeat*.9;
  return {...this.event('breath',time,.18,degree,.32,0),timbre:this.timbre(time,'breath')};
 }
 eventsUntil(now,horizon=now+.22){const out=[];
  // Short scheduling horizon bounds live sources; long phrase plans stay as data.
  if(this.nextHarmony<horizon){this.harmony=(this.harmony+this.pick([1,1,3]))%this.mode.voicings.length;this.nextHarmony+=43.2;const c=this.chords[this.harmony];this.pattern=[c[0],c[1],c[2],c[3],c[3],c[2],c[1],c[0]];}
  // 4/4 at a 900 ms quarter-note pulse. Change one or two inner notes
  // every one or two bars, retaining the bass, cadence and rhythmic identity.
  const shapes=this.chords;
  for(let layer=0;layer<2;layer++)if(this.nextArp[layer]<horizon){
   const step=this.arpStep[layer]++;
   if(layer===0&&step>=this.nextMutation){this.evolve();this.nextMutation=step+this.pick([4,8]);}
   let degree=layer===0?this.pattern[step%8]:shapes[this.harmony][[0,2,1,3][step%4]];
   this.leadDegree=layer===0?degree:this.leadDegree;
   const time=Math.max(now,this.nextArp[layer]);out.push({...this.event('arp',time,[.16,.045][layer]*(step%4===0?1:.85),degree,[-.32,-.05][layer],0),timbre:this.timbre(time,'arp')});
   this.nextArp[layer]+=[.9,1.8][layer];if(this.nextArp[layer]<now)this.nextArp[layer]=now+[.9,1.8][layer];
  }
  if(this.nextCounter<horizon)out.push(this.counterpoint(Math.max(now,this.nextCounter)));
  if(this.nextDrone<horizon){out.push(this.event('string',Math.max(now,this.nextDrone),.095+this.random()*.035,0,-.12));this.nextDrone=Math.max(now,this.nextDrone)+7.2;}
  if(this.nextCloud<horizon){
   const voicing=this.mode.voicings[this.harmony];
   for(let i=0;i<voicing.length;i++)out.push(this.event('cloud',Math.max(now,this.nextCloud)+i*.12,.04+this.random()*.01,voicing[i],(i-1)*.28));
   this.nextCloud=Math.max(now,this.nextCloud)+12+this.random()*5;
  }
  if(this.nextAir<horizon){out.push(this.event('air',Math.max(now,this.nextAir),.09,2,(this.random()-.5)*.65));this.nextAir=Math.max(now,this.nextAir)+5+this.random()*5;}
  return out.sort((a,b)=>a.time-b.time);
 }
}

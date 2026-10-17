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
 constructor(seed,modeId){this.seed=seed>>>0||1;this.mode=modeId?SCORE_MODES[modeId]:this.pick([SCORE_MODES.bhairavi,SCORE_MODES.kafi]);if(!this.mode)throw new Error('Unknown musical mode');this.ratios=this.mode.ratios;this.reset(0);}
 random(){let n=this.seed;n^=n<<13;n^=n>>>17;n^=n<<5;this.seed=n>>>0;return this.seed/4294967296;}
 pick(a){return a[Math.floor(this.random()*a.length)];}
 reset(now){this.nextDrone=now+.04;this.nextCloud=now+.08;this.nextAir=now+3;this.nextArp=[now+.1,now+.55];this.arpStep=[0,0];this.harmony=0;this.nextHarmony=now+.1+43.2;this.started=now;this.pattern=[2,4,6,8,9,8,6,4];this.nextMutation=this.pick([4,8]);this.nextCounter=now+1.45;this.counterStep=0;this.counterDegree=6;this.leadDegree=2;this.mutations=0;}
 event(name,time,volume,degree,pan=0,glide=0){return{name,time,volume,degree,rate:this.ratios[degree],pan,glide};}
 evolve(){
  const before=this.pattern.slice(),slots=[1,2,3,4,5,6],changed=[];
  const count=this.pick([1,2]);for(let i=0;i<count;i++){
   const slot=this.pick(slots.filter(s=>!changed.includes(s))),old=this.pattern[slot];
   const candidates=[old-2,old-1,old+1,old+2].filter(d=>d>=2&&d<=10);
   this.pattern[slot]=this.pick(candidates);changed.push(slot);
  }
  this.mutations++;return{before,after:this.pattern.slice(),changed};
 }
 counterpoint(time){
  const lead=this.leadDegree,nextLead=this.pattern[this.arpStep[0]%this.pattern.length],direction=Math.sign(nextLead-lead),last=this.counterDegree;
  const pitch=d=>12*Math.log2(this.ratios[d]),strong=this.counterStep%4===0;
  let candidates=[2,3,4,5,6,7,8].filter(d=>{
   const interval=((Math.round(pitch(d)+12-pitch(lead))%12)+12)%12,move=pitch(d)-pitch(last);
   return d!==last&&Math.abs(move)<=7&&[0,3,4,7,8,9].includes(interval);
  });
  // Prefer contrary motion; short passing steps connect the sustained tones.
  const contrary=candidates.filter(d=>Math.sign(d-last)===-direction);if(direction&&contrary.length)candidates=contrary;
  let degree=candidates.length?this.pick(candidates):last;
  if(!strong&&this.counterStep%3===2)degree=Math.max(2,Math.min(8,last+this.pick([-1,1])));
  if(this.counterStep%16===15)degree=this.pick([2,6]);
  this.counterDegree=degree;this.counterStep++;const duration=this.pick([1.8,1.8,2.7,.9]);this.nextCounter=time+duration;
  return this.event('breath',time,.085,degree,.24,-.012);
 }
 eventsUntil(now,horizon=now+.22){const out=[];
  // Short scheduling horizon bounds live sources; long phrase plans stay as data.
  if(this.nextHarmony<horizon){this.harmony=(this.harmony+this.pick([1,1,3]))%this.mode.voicings.length;this.nextHarmony+=43.2;}
  // 4/4 at a 900 ms quarter-note pulse. Change one or two inner notes
  // every one or two bars, retaining the bass, cadence and rhythmic identity.
  const shapes=[[2,4,6,8],[2,5,6,9],[7,9,11,6],[2,4,8,9]];
  for(let layer=0;layer<2;layer++)if(this.nextArp[layer]<horizon){
   const step=this.arpStep[layer]++;
   if(layer===0&&step>=this.nextMutation){this.evolve();this.nextMutation=step+this.pick([4,8]);}
   let degree=layer===0?this.pattern[step%8]:shapes[this.harmony][[0,2,1,3][step%4]];
   this.leadDegree=layer===0?degree:this.leadDegree;
   out.push(this.event('arp',Math.max(now,this.nextArp[layer]),[.19,.065][layer]*(step%4===0?1:.85),degree,[-.32,-.05][layer],step%3===1?.018:0));
   this.nextArp[layer]+=[.9,1.8][layer];if(this.nextArp[layer]<now)this.nextArp[layer]=now+[.9,1.8][layer];
  }
  if(this.nextCounter<horizon)out.push(this.counterpoint(Math.max(now,this.nextCounter)));
  if(this.nextDrone<horizon){out.push(this.event('string',Math.max(now,this.nextDrone),.095+this.random()*.035,0,-.12));this.nextDrone=Math.max(now,this.nextDrone)+7.2;}
  if(this.nextCloud<horizon){
   const voicing=this.mode.voicings[this.harmony];
   for(let i=0;i<voicing.length;i++)out.push(this.event('cloud',Math.max(now,this.nextCloud)+i*.12,.07+this.random()*.015,voicing[i],(i-1)*.28));
   this.nextCloud=Math.max(now,this.nextCloud)+12+this.random()*5;
  }
  if(this.nextAir<horizon){out.push(this.event('air',Math.max(now,this.nextAir),.09,2,(this.random()-.5)*.65));this.nextAir=Math.max(now,this.nextAir)+5+this.random()*5;}
  return out.sort((a,b)=>a.time-b.time);
 }
}

// Original instrumental grammar, not a transcription or a complete raga model.
// Two original short motifs repeat on different phrase lengths in one minor palette.
// Equal-tempered note vocabularies, suitable for harmonium-like synthesis.
// These are raga-inspired palettes, not full rules for performing those ragas.
const mode=(id,notes,anchors,voicings)=>{const base=notes.map(n=>2**(n/12));return Object.freeze({id,notes:Object.freeze(notes),anchors:Object.freeze(anchors),voicings:Object.freeze(voicings.map(Object.freeze)),ratios:Object.freeze([.5,base[4]/2,...base,2,...base.slice(1,5).map(r=>r*2)])});};
export const SCORE_MODES=Object.freeze({
 bhairavi:mode('bhairavi',[0,1,3,5,7,8,10],[0,3,4],[[2,6,9],[2,4,6],[5,7,9],[2,5,9]]),
 kafi:mode('kafi',[0,2,3,5,7,9,10],[0,1,4],[[2,6,9],[2,4,6],[5,7,9],[2,5,6]]),
 yaman:mode('yaman',[0,2,4,6,7,9,11],[0,2,6],[[2,6,9],[2,4,6],[4,6,8],[2,4,9]])
});
export class GenerativeScore{
 constructor(seed,modeId){this.seed=seed>>>0||1;this.mode=modeId?SCORE_MODES[modeId]:this.pick([SCORE_MODES.bhairavi,SCORE_MODES.kafi]);if(!this.mode)throw new Error('Unknown musical mode');this.ratios=this.mode.ratios;this.leadMotif=this.pick([[6,8,9],[6,8,9,6]]);this.counterMotif=[2,4,6];this.reset(0);}
 random(){let n=this.seed;n^=n<<13;n^=n>>>17;n^=n<<5;this.seed=n>>>0;return this.seed/4294967296;}
 pick(a){return a[Math.floor(this.random()*a.length)];}
 reset(now){this.epoch=now+.15;this.beats=[0,.5];this.steps=[0,0];this.next=[this.epoch,this.epoch+.45];this.nextDrone=now+.04;this.nextCloud=now+.08;this.nextAir=now+3;}
 event(name,time,volume,degree,pan=0){return{name,time,volume,degree,rate:this.ratios[degree],pan,glide:0};}
 note(layer){
  const lead=layer===0,motif=lead?this.leadMotif:this.counterMotif,index=this.steps[layer]++%motif.length,degree=motif[index],beatTime=this.next[layer];
  const time=beatTime+(this.random()-.5)*.022,t=time-this.epoch;
  const timbre={part:lead?'lead':'counter',release:(lead?1.65:2.5)+.5*(1+Math.sin(t*.071+layer)),cutoff:(lead?2300:1300)+650*(1+Math.sin(t*.053+layer*1.7)),noiseMix:.025+.022*(1+Math.sin(t*.037+layer)),cents:(this.random()-.5)*8,vibrato:3+this.random()*3,vibratoRate:4.1+this.random()*1.1,phase:this.random()*Math.PI*2,pressure:.035+this.random()*.035};
  const rhythm=lead?(motif.length===3?[1,1.5,2]:[1,1,1.5,1.5]):[1.5,2,2.5];this.beats[layer]+=rhythm[index];this.next[layer]=this.epoch+this.beats[layer]*.9;
  return{...this.event(lead?'breath':'alto',time,(lead?.17:.19)*(.91+this.random()*.18),degree,lead?-.3:.32),part:timbre.part,beatTime,motifIndex:index,timbre};
 }
 eventsUntil(now,horizon=now+.22){const out=[];
  for(let layer=0;layer<2;layer++)if(this.next[layer]<horizon){const event=this.note(layer);if(event.time>=now-.1)out.push(event);if(this.next[layer]<now)this.next[layer]=now+.45;}
  if(this.nextDrone<horizon){out.push(this.event('string',Math.max(now,this.nextDrone),.028,0,-.12));this.nextDrone=Math.max(now,this.nextDrone)+7.2;}
  if(this.nextCloud<horizon){for(const [i,d] of [2,4,6].entries())out.push(this.event('cloud',Math.max(now,this.nextCloud)+i*.12,.045,d,(i-1)*.28));this.nextCloud=Math.max(now,this.nextCloud)+13+this.random()*4;}
  if(this.nextAir<horizon){out.push(this.event('air',Math.max(now,this.nextAir),.07,2,.1));this.nextAir=Math.max(now,this.nextAir)+7+this.random()*4;}
  return out.sort((a,b)=>a.time-b.time);
 }
}

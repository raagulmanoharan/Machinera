// Original instrumental grammar, not a transcription or a complete raga model.
// Returning cadences and varied couplet-like calls/responses provide continuity.
export const SCORE_RATIOS=Object.freeze([.5,.75,1,16/15,6/5,4/3,3/2,8/5,9/5,2,32/15,12/5,8/3,3]);
export class GenerativeScore{
 constructor(seed){this.seed=seed>>>0||1;this.phrases=0;this.queue=[];this.recent=[];this.anchor=[0,this.pick([1,2,3]),this.pick([3,4,5]),this.pick([1,2,3]),0];this.section='invocation';this.sectionLeft=2;this.reset(0);}
 random(){let n=this.seed;n^=n<<13;n^=n>>>17;n^=n<<5;this.seed=n>>>0;return this.seed/4294967296;}
 pick(a){return a[Math.floor(this.random()*a.length)];}
 reset(now){this.queue.length=0;this.nextDrone=now+.12;this.nextCloud=now+.8;this.nextAir=now+3;this.nextPhrase=now+2;this.started=now;}
 event(name,time,volume,degree,pan=0,glide=0){return{name,time,volume,rate:SCORE_RATIOS[degree],pan,glide};}
 // Notes are scale-degree walks, with a remembered contour and cadential anchors.
 phrase(time){
  if(this.sectionLeft--<=0){this.section=this.section==='invocation'?'couplet':this.section==='couplet'?this.pick(['elaboration','repose']):this.section==='elaboration'?'repose':this.pick(['couplet','elaboration']);this.sectionLeft=2+Math.floor(this.random()*4);}
  const opening=this.section==='invocation',answer=this.answerNext,energy=({invocation:.15,couplet:.4,elaboration:.72,repose:.12}[this.section])+this.random()*.15;
  const length=4+Math.floor(this.random()*(answer?4:6));let degree=answer?this.pick([0,2,3]):this.pick([0,3,4]);
  const contour=[];for(let i=0;i<length;i++){
   if(i===length-1)degree=answer?0:this.pick([0,3,4]);
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
  if(this.nextPhrase<horizon){const p=this.phrase(Math.max(now,this.nextPhrase));this.queue.push(...p.events);}
  if(this.nextDrone<horizon){out.push(this.event('string',Math.max(now,this.nextDrone),.095+this.random()*.035,this.pick([0,0,1,2]),(this.random()-.5)*.4));this.nextDrone=Math.max(now,this.nextDrone)+2.2+this.random()*2.3;}
  if(this.nextCloud<horizon){
   const root=this.pick([2,2,5]),voicing=root===2?this.pick([[2,6,9],[2,4,6],[2,5,9]]):this.pick([[2,5,9],[5,6,9]]);
   for(let i=0;i<voicing.length;i++)out.push(this.event('cloud',Math.max(now,this.nextCloud)+i*.12,.1+this.random()*.025,voicing[i],(i-1)*.28));
   this.nextCloud=Math.max(now,this.nextCloud)+7+this.random()*4;
  }
  if(this.nextAir<horizon){out.push(this.event('air',Math.max(now,this.nextAir),.09,2,(this.random()-.5)*.65));this.nextAir=Math.max(now,this.nextAir)+5+this.random()*5;}
  this.queue.sort((a,b)=>a.time-b.time);while(this.queue.length&&this.queue[0].time<horizon){const e=this.queue.shift();if(e.time>=now-.15)out.push(e);}
  return out.sort((a,b)=>a.time-b.time);
 }
}

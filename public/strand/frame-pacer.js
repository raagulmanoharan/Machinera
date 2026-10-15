// Preserve the target cadence across 60/90/120/144 Hz displays without GPU waits.
export class FramePacer {
 constructor(rate=60){this.interval=1000/rate;this.deadline=null;}
 accept(time){
  if(this.deadline!==null&&time+.5<this.deadline)return false;
  this.deadline=this.deadline===null||time-this.deadline>this.interval?time+this.interval:this.deadline+this.interval;
  return true;
 }
 reset(){this.deadline=null;}
}

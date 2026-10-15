// Opt-in diagnostics only: ?perf=1. CPU submission times are not GPU timings.
export function createStreamPerformance(){
 const capacity=4096,frames=new Float64Array(capacity),updates=new Float64Array(capacity),submits=new Float64Array(capacity);let count=0,last=null;
 function stats(values){const a=Array.from(values.subarray(0,Math.min(count,capacity))).filter(Number.isFinite).sort((a,b)=>a-b);if(!a.length)return null;return {mean:a.reduce((x,y)=>x+y)/a.length,p50:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],p99:a[Math.floor(a.length*.99)]};}
 return {record(time,update,submit){const i=count%capacity;frames[i]=last===null?NaN:time-last;updates[i]=update;submits[i]=submit;last=time;count++;},reset(){count=0;last=null;},report(sim,pipeline){return {samples:Math.min(count,capacity),frameIntervalMs:stats(frames),mainUpdateMs:stats(updates),renderSubmissionMs:stats(submits),simulation:sim.isWorker?'worker':'local',lastWorker:sim.metrics??null,renderTarget:{...pipeline.metrics},note:'CPU timings, not GPU timings; frame intervals include intentional sleep.'};}};
}

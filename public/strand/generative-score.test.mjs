import assert from 'node:assert/strict';
import {GenerativeScore,SCORE_RATIOS} from './generative-score.js';
const a=new GenerativeScore(12345),b=new GenerativeScore(12345),other=new GenerativeScore(98765);let t=2;const signatures=new Set(),otherSignatures=[],sections=new Set();let answers=0,multiVoice=0;
for(let i=0;i<200;i++){
 const p=a.phrase(t),same=b.phrase(t);assert.deepEqual(p,same,'A seed makes diagnosis reproducible');
 signatures.add(p.contour.join(','));otherSignatures.push(other.phrase(t).contour.join(','));sections.add(p.section);answers+=p.answer?1:0;
 if(new Set(p.events.map(e=>e.name)).size>1)multiVoice++;
 for(const e of p.events){assert.ok(SCORE_RATIOS.includes(e.rate));assert.ok(e.time>=t);assert.ok(e.volume>0&&e.volume<.2);assert.ok(['string','breath'].includes(e.name));}
 assert.ok([0,3,4].includes(p.contour.at(-1)),'Phrases return to a cadential anchor');if(p.answer)assert.equal(p.contour.at(-1),0);
 t=a.nextPhrase;
}
assert.ok(signatures.size>160,'Generate varied contours instead of a short motif playlist');assert.notDeepEqual([...signatures].slice(0,20),otherSignatures.slice(0,20));assert.ok(answers>30&&answers<150);assert.equal(sections.size,4);assert.ok(multiVoice>0,'Developed passages include an independent reply');
const score=new GenerativeScore(42);let maxQueue=0,total=0;const voices=new Set();
for(let now=0;now<1800;now+=.1){const events=score.eventsUntil(now);maxQueue=Math.max(maxQueue,score.queue.length);total+=events.length;for(const e of events){assert.ok(e.time>=now-.15&&e.time<now+.5);assert.ok(Number.isFinite(e.rate));voices.add(e.name);}}
assert.ok(maxQueue<32,'Long-running music has a bounded event queue');assert.ok(total>100);assert.deepEqual([...voices].sort(),['air','breath','cloud','string']);score.reset(10000);assert.equal(score.queue.length,0);assert.ok(score.eventsUntil(10000).every(e=>e.time>=10000),'Resume never replays missed notes');
console.log(JSON.stringify({uniqueContours:signatures.size,phrases:200,sections:[...sections],answers,multiVoice,maxQueue}));

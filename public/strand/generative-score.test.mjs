import assert from 'node:assert/strict';
import {GenerativeScore,SCORE_MODES} from './generative-score.js';
const a=new GenerativeScore(12345),b=new GenerativeScore(12345),other=new GenerativeScore(98765);let t=2;const signatures=new Set(),otherSignatures=[],sections=new Set();let answers=0,multiVoice=0;
for(let i=0;i<200;i++){
 const p=a.phrase(t),same=b.phrase(t);assert.deepEqual(p,same,'A seed makes diagnosis reproducible');
 signatures.add(p.contour.join(','));otherSignatures.push(other.phrase(t).contour.join(','));sections.add(p.section);answers+=p.answer?1:0;
 if(new Set(p.events.map(e=>e.name)).size>1)multiVoice++;
 for(const e of p.events){assert.ok(a.ratios.includes(e.rate));assert.ok(e.time>=t);assert.ok(e.volume>0&&e.volume<.2);assert.ok(['string','breath'].includes(e.name));}
 assert.ok(a.mode.anchors.includes(p.contour.at(-1)),'Phrases return to a cadential anchor');if(p.answer)assert.equal(p.contour.at(-1),0);
 t=a.nextPhrase;
}
assert.ok(signatures.size>160,'Generate varied contours instead of a short motif playlist');assert.notDeepEqual([...signatures].slice(0,20),otherSignatures.slice(0,20));assert.ok(answers>30&&answers<150);assert.equal(sections.size,4);assert.ok(multiVoice>0,'Developed passages include an independent reply');
const score=new GenerativeScore(42);let maxQueue=0,total=0;const voices=new Set();
for(let now=0;now<1800;now+=.1){const events=score.eventsUntil(now);maxQueue=Math.max(maxQueue,score.queue.length);total+=events.length;for(const e of events){assert.ok(e.time>=now-.15&&e.time<now+.5);assert.ok(Number.isFinite(e.rate));voices.add(e.name);}}
assert.ok(maxQueue<32,'Long-running music has a bounded event queue');assert.ok(total>100);assert.deepEqual([...voices].sort(),['air','arp','breath','cloud','string']);score.reset(10000);assert.equal(score.queue.length,0);assert.ok(score.eventsUntil(10000).every(e=>e.time>=10000),'Resume never replays missed notes');
console.log(JSON.stringify({uniqueContours:signatures.size,phrases:200,sections:[...sections],answers,multiVoice,maxQueue}));

for(const id of Object.keys(SCORE_MODES)){
 const composer=new GenerativeScore(123,id),originalMode=composer.mode;for(let t=0;t<600;t+=.1)for(const event of composer.eventsUntil(t)){assert.ok(composer.ratios.includes(event.rate),'Every voice stays within the selected mode');assert.equal(composer.mode,originalMode,'A session never randomly mixes scales');}
 assert.equal(composer.ratios[2],1);assert.equal(composer.ratios[9],2);assert.ok(Math.abs(composer.ratios[1]*2-composer.ratios[6])<1e-12,'Drone fifth matches the ensemble tuning');
}
assert.equal(SCORE_MODES.yaman.notes[3],6);assert.equal(SCORE_MODES.bhairavi.notes[1],1);assert.equal(SCORE_MODES.kafi.notes[1],2);

for(let seed=1;seed<50;seed++){const score=new GenerativeScore(seed);assert.equal(score.mode.notes[2],3,"Default atmosphere retains a minor third");}

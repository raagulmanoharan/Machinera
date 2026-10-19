import assert from 'node:assert/strict';
import {printMotion} from './print-motion.js';
import {StreamCloth} from './stream-cloth.js';
let previous=0;
for(let i=0;i<=1000;i++){const p=printMotion(i/1000);assert.ok(p.feed>=previous-1e-10);assert.ok(p.feed>=0&&p.feed<=1);previous=p.feed;}
assert.equal(printMotion(.12).feed,0);assert.equal(printMotion(.9).feed,1);
const delta=.001,a=printMotion(.4+delta).feed-printMotion(.4).feed,b=printMotion(.6+delta).feed-printMotion(.6).feed;
assert.ok(Math.abs(a-b)<1e-10,'Middle of print has constant feed speed');
const cloth={print:{time:0,duration:5.4,section:3.8,handoff:true},story:{streamRemaining:{value:3.8},streamHead:{}},sim:{length:0},get visibleHead(){return 3.8-this.story.streamRemaining.value;},get visibleLength(){return this.visibleHead;},setLength(length){this.sim.length=length;},upload(){},refreshViewport(){},yarn:{feed(){}}};
StreamCloth.prototype.update.call(cloth,.5);assert.equal(cloth.sim.length,0,'No rug is printed before feed engages');
cloth.print.time=5.4*.6;StreamCloth.prototype.update.call(cloth,0);assert.ok(cloth.sim.length>0&&cloth.sim.length<3.8,'Camera can settle with material still printing');
cloth.print.time=5.4*.9;StreamCloth.prototype.update.call(cloth,0);assert.equal(cloth.sim.length,3.8);assert.ok(cloth.print,'Slot withdrawal remains in the same clock');
cloth.print.time=5.4;StreamCloth.prototype.update.call(cloth,0);assert.equal(cloth.print,null);
console.log('Shared feed timeline, stationary landing and delayed slot release passed');

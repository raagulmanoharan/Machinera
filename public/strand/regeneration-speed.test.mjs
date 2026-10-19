import assert from 'node:assert/strict';
import {StreamCloth} from './stream-cloth.js';
const cloth={print:{time:0,duration:8,section:3.8,regenerating:true},story:{streamRemaining:{value:3.8},streamHead:{}},sim:{length:0},get visibleHead(){return 3.8-this.story.streamRemaining.value;},get visibleLength(){return this.visibleHead;},setLength(length){this.sim.length=length;},upload(){},refreshViewport(){}};
for(let i=1;i<=8;i++){StreamCloth.prototype.update.call(cloth,1);assert.ok(Math.abs(cloth.sim.length-3.8*i/8)<1e-6,'New yarn advances at constant speed throughout regeneration');}
assert.equal(cloth.print,null);
console.log('Regeneration feeds at constant speed over the full eight seconds');

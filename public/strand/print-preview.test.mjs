import assert from 'node:assert/strict';
import {StreamCloth} from './stream-cloth.js';
const cloth={print:{time:0,duration:4,section:3.8,hold:true,preview:true},story:{streamRemaining:{value:3.8},streamHead:{}},sim:{length:0},get visibleHead(){return 3.8-this.story.streamRemaining.value;},get visibleLength(){return this.visibleHead;},setLength(length){this.sim.length=length;},upload(){},refreshViewport(){},yarn:{feed(){}}};
assert.equal(StreamCloth.prototype.update.call(cloth,.5),true);assert.equal(cloth.sim.length,3.8,'Reveal uses the entire rug from its first visible frame');
assert.equal(cloth.print.time,0);assert.equal(cloth.story.streamRemaining.value,0);
assert.equal(StreamCloth.prototype.update.call(cloth,.5),false,'Held preview does not redraw its shader on every motion frame');
assert.ok(cloth.print,'Controls remain unavailable until the reveal finishes');
console.log('Complete, centred preview is prepared once while held');

import assert from 'node:assert/strict';
import {setupLoomControls} from './loom-controls.js';
const buttons=new Map(),poses=[],sounds=[];let flips=0,stops=0,regenerations=0;
globalThis.document={querySelector(id){if(!buttons.has(id))buttons.set(id,{style:{},setAttribute(){}});return buttons.get(id);},addEventListener(){}};
globalThis.matchMedia=()=>({matches:false});
const cloth={archive:{entries:[{photoYarns:{}}]},setFlipProgress(p){poses.push(p);return p*p;},setBack(){},setTurn(){},replacePhoto(){}};
const controls=setupLoomControls({getCloth:()=>cloth,getBounds:()=>({x:0,y:0,width:100,height:300}),canEdit:()=>true,render(){},capture:{hidden:true},getRecordId:()=>null,onFlip:()=>{flips++;const stop=()=>stops++;stop.update=p=>sounds.push(p);return stop;},onRegenerate:()=>regenerations++});
controls.sync();buttons.get('#rugFlip').onclick();
assert.equal(poses.length,0,'Click does not mutate geometry outside a rendered frame');
for(let i=0;i<58;i++)controls.update(.5);
assert.equal(controls.busy,false,'Flip completes even when frame time is capped');
for(let i=1;i<poses.length;i++)assert.ok(poses[i]-poses[i-1]<=1/30/1.9+1e-8,'Missed frames do not cause a large geometry jump');
assert.equal(poses.at(-1),1);assert.deepEqual(sounds,poses.map(p=>p*p),'Sound follows mesh travel rather than elapsed time');
buttons.get('#rugFlip').onclick();controls.update(.016);controls.reset();
assert.equal(controls.busy,false);
console.log('Flip advances on rendered frames, caps jumps and resets safely');

assert.equal(flips,2);assert.equal(stops,2,'Completed and cancelled turns both release their sound');await buttons.get('#regenerateMemory').onclick();assert.equal(regenerations,1,'Accepted regeneration triggers its effect exactly once');

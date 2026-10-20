import assert from 'node:assert/strict';
import {setupMemoryGallery} from './memory-gallery.js';
const nodes=new Map();
function node(id){if(!nodes.has(id)){const listeners=new Map();nodes.set(id,{open:false,style:{setProperty(){}},querySelectorAll:()=>[],replaceChildren(){},focus(){},addEventListener(type,fn){listeners.set(type,fn);},showModal(){this.open=true;},close(){this.open=false;listeners.get('close')?.();},escape(){let stopped=false;listeners.get('keydown')?.({key:'Escape',stopPropagation(){stopped=true;}});assert.ok(stopped);this.close();}});}return nodes.get(id);}
globalThis.document={querySelector:node};globalThis.IntersectionObserver=class{observe(){}unobserve(){}disconnect(){}};
let view='rug',returns=0;
const gallery=setupMemoryGallery({store:{load:async()=>[]},capture:{style:{getPropertyValue:()=>''}},thumbnail(){},render(){},onCamera(){view='camera';returns++;}});
await gallery.open();node('#galleryClose').onclick();assert.equal(view,'camera','Back from a saved rug must return to the viewfinder');assert.equal(returns,1);
view='rug';await gallery.open();node('#galleryDialog').escape();assert.equal(view,'camera','Native dialog cancellation returns to the viewfinder');assert.equal(returns,2);
await gallery.open();node('#galleryCamera').onclick();assert.equal(returns,3,'Camera shortcut uses the same exit once');
console.log('Gallery Back, Escape and camera shortcut all return to photo view exactly once');

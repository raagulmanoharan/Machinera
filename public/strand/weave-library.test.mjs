import test from 'node:test';import assert from 'node:assert/strict';
import {WEAVE_LIBRARY,warpOver} from './weave-library.js';
test('every drawdown is a distinct, fully bound threading/treadling/tie-up recipe',()=>{
 const signatures=new Set();for(let id=0;id<WEAVE_LIBRARY.length;id++){
 const d=WEAVE_LIBRARY[id];assert.ok(d.width<=16);assert.ok(d.height<=16);
 for(let y=-d.height;y<d.height*2;y++)for(let x=-d.width;x<d.width*2;x++){
  const row=(y%d.height+d.height)%d.height,col=(x%d.width+d.width)%d.width;
  assert.equal(warpOver(x,y,id),d.tieUp[d.treadling[row]][d.threading[col]]);
 }
 for(let y=0;y<d.height;y++){const row=d.threading.map((_,x)=>warpOver(x,y,id));assert.ok(row.some(Boolean)&&row.some(v=>!v),'each pick binds');}
 for(let x=0;x<d.width;x++){const col=d.treadling.map((_,y)=>warpOver(x,y,id));assert.ok(col.some(Boolean)&&col.some(v=>!v),'each end binds');}
 const signature=Array.from({length:64},(_,y)=>Array.from({length:64},(_,x)=>+warpOver(x,y,id)).join('')).join('');assert.ok(!signatures.has(signature),'distinct crossing topology: '+d.name);signatures.add(signature);
 }
 assert.equal(signatures.size,WEAVE_LIBRARY.length);
});
test('every draft has bounded floats on both faces, including wrapped repeats',()=>{
 for(let id=0;id<WEAVE_LIBRARY.length;id++){const d=WEAVE_LIBRARY[id];for(let axis=0;axis<2;axis++){const length=axis?d.height:d.width,lines=axis?d.width:d.height;for(let line=0;line<lines;line++){let run=0,last=null;for(let k=0;k<length*2;k++){const v=axis?warpOver(line,k,id):warpOver(k,line,id);run=v===last?run+1:1;last=v;assert.ok(run<=7,d.name+' has a free float longer than the model supports');}}}}
});

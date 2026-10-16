import test from 'node:test';import assert from 'node:assert/strict';import {shouldTear} from './stream-tear-gesture.js';
const pull={startY:100,dy:100,dx:10,uvY:.2,height:844,printing:false,torn:false};
test('deliberate downward upper pull tears',()=>assert.equal(shouldTear(pull),true));
test('ordinary, horizontal, cancelled or printing gestures cannot tear',()=>{for(const change of [{dy:30},{dy:-100},{dx:100},{startY:500},{uvY:.7},{printing:true},{torn:true}])assert.equal(shouldTear({...pull,...change}),false);});

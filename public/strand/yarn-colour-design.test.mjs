import test from 'node:test';import assert from 'node:assert/strict';
import {createColourDesign,designYarns} from './yarn-colour-design.js';
import {WEAVE_LIBRARY} from './weave-library.js';import {allocateYarns} from './yarn-palette.js';
const palette=[{share:.5},{share:.3},{share:.2}];
test('every design preserves exact integer dye quotas in both yarn systems',()=>{
 const signatures=new Set();for(const recipe of WEAVE_LIBRARY)for(let seed=1;seed<=12;seed++){
 const d=createColourDesign(recipe,seed);for(const axis of ['warp','weft']){const n=axis==='warp'?48:119,result=designYarns(palette,n,d,axis),counts=palette.map((_,i)=>result.sequence.filter(c=>c===i).length);assert.deepEqual(counts,allocateYarns(palette,n));assert.deepEqual(result,designYarns(palette,n,d,axis));signatures.add(result.sequence.join(','));}}
 assert.ok(signatures.size>400,'seed and weave family produce distinct colour orders');
});

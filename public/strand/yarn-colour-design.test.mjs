import test from 'node:test';import assert from 'node:assert/strict';
import {createColourDesign,designYarns} from './yarn-colour-design.js';
import {WEAVE_LIBRARY} from './weave-library.js';import {allocateYarns} from './yarn-palette.js';
const palette=[{rgb:[25,70,85],share:.5},{rgb:[210,190,140],share:.3},{rgb:[180,60,45],share:.2}];
test('every design preserves exact integer dye quotas in both yarn systems',()=>{
 for(const recipe of WEAVE_LIBRARY)for(let seed=1;seed<=12;seed++){
 const d=createColourDesign(recipe,seed);for(const axis of ['warp','weft']){const n=axis==='warp'?48:119,result=designYarns(palette,n,d,axis),counts=palette.map((_,i)=>result.sequence.filter(c=>c===i).length);if(axis==='warp'){assert.deepEqual(result.sequence,result.sequence.slice().reverse());for(let i=0;i<counts.length;i++)assert.ok(Math.abs(counts[i]-palette[i].share*n)<2);}else assert.deepEqual(counts,allocateYarns(palette,n));assert.deepEqual(result,designYarns(palette,n,d,axis));}}
});

test('ordered bands repeat consistently without random isolated ends',()=>{
 for(const recipe of WEAVE_LIBRARY)for(let seed=1;seed<=20;seed++){
 const design=createColourDesign(recipe,seed);
 for(const axis of ['warp','weft']){const s=designYarns(palette,axis==='warp'?48:119,design,axis).sequence,runs=[];
 for(const colour of s){if(runs.at(-1)?.colour===colour)runs.at(-1).length++;else runs.push({colour,length:1});}
 assert.ok(runs.every(r=>r.length>=2),'no scattered one-yarn flecks for a three-dye palette');
 for(const colour of [0,1,2]){const sizes=runs.filter(r=>r.colour===colour).map(r=>r.length);if(axis==='weft')assert.ok(Math.max(...sizes)-Math.min(...sizes)<=1,'weft bands repeat within one yarn');}
 }
 }
});

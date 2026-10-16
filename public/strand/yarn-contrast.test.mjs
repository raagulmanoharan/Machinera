import test from 'node:test';import assert from 'node:assert/strict';
import {orderColours,splitYarnDyes,colourContrast} from './yarn-contrast.js';
import {createWeavePattern} from './weaving-patterns.js';
const palette=[{rgb:[35,45,60],share:.45},{rgb:[50,60,75],share:.2},{rgb:[235,225,195],share:.2},{rgb:[225,80,55],share:.15}];
const weakest=order=>Math.min(...order.slice(1).map((c,i)=>colourContrast(palette[order[i]].rgb,palette[c].rgb)));
test('perceptual ordering separates adjacent near-dark dyes with contrasting colours',()=>{const ordered=orderColours(palette,[0,1,2,3]);assert.deepEqual([...ordered].sort(),[0,1,2,3]);assert.ok(weakest(ordered)>weakest([0,1,2,3])*2);});
test('contrasting systems preserve every dye share and improve cross-system contrast',()=>{
 const split=splitYarnDyes(palette);assert.ok(Math.abs(split.warp.reduce((a,b)=>a+b,0)-1)<1e-12);for(let i=0;i<palette.length;i++)assert.ok(Math.abs((split.warp[i]+split.weft[i])*.5-palette[i].share)<1e-12);
 let before=0,after=0;for(let i=0;i<palette.length;i++)for(let j=0;j<palette.length;j++){const d=colourContrast(palette[i].rgb,palette[j].rgb);before+=palette[i].share*palette[j].share*d;after+=split.warp[i]*split.weft[j]*d;}assert.ok(after>before);
});
test('mirrored ground fills the centre rather than collecting a thin accent stripe',()=>{
 const p=createWeavePattern({draftId:'geo-diamond-rings',seed:42,symmetry:'both',palette:[{rgb:[145,190,195],share:.47},{rgb:[240,60,40],share:.4},{rgb:[8,8,8],share:.13}]});assert.deepEqual(p.warp.sequence,p.warp.sequence.slice().reverse());const dominant=p.warp.counts.indexOf(Math.max(...p.warp.counts));assert.equal(p.warp.sequence[23],dominant);assert.equal(p.warp.sequence[24],dominant);
});

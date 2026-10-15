import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {StreamPhysics} from './stream-physics.js';
import {findClothIntersections,findClothIntersectionsJS,installCollisionWasm} from './stream-intersections.js';
await installCollisionWasm(await readFile(new URL('./wasm/cloth-collision.wasm',import.meta.url)));
function compare(p,nx,ny){for(const limit of [1,12,64])assert.deepEqual(findClothIntersections(p,nx,ny,limit),findClothIntersectionsJS(p,nx,ny,limit));}
test('Wasm and JavaScript return the same ordered exact intersections across deformed folds',()=>{let random=2873;const rand=()=>{random=(Math.imul(random,1664525)+1013904223)>>>0;return random/4294967296;};for(const length of [6.2,12.95,14]){const s=new StreamPhysics({length});compare(s.positions,s.nx,s.ny);for(let frame=0;frame<35;frame++){const p=s.positions.slice();for(let i=0;i<16;i++){const j=(s.nx+Math.floor(rand()*(s.nx*s.ny-s.nx)))*3;p[j]+=(rand()-.5)*.4;p[j+1]+=(rand()-.5)*.4;p[j+2]+=(rand()-.5)*.3;}compare(p,s.nx,s.ny);}}});
test('coplanar overlaps, raised crossings, different grids and large query fallback agree',()=>{for(const [nx,ny]of [[3,10],[5,25],[13,97]]){const s=new StreamPhysics({nx,ny}),p=s.positions.slice();for(let y=5;y<ny;y++)for(let x=0;x<nx;x++){const a=(y*nx+x)*3,b=((y-4)*nx+x)*3;p[a]=p[b];p[a+1]=p[b+1]+(x/(nx-1)-.5)*.1;p[a+2]=p[b+2];}compare(p,nx,ny);assert.deepEqual(findClothIntersections(p,nx,ny,100),findClothIntersectionsJS(p,nx,ny,100));}});

import test from 'node:test';import assert from 'node:assert/strict';
import {yarnTile,THREAD_PITCH,TILE_THREADS,WARP_ENDS,CLOTH_WIDTH,YARN_HEIGHT,CROSSING_HEIGHT} from './yarn-structure.js';
import {warpOver,yarnHeight} from './weave-types.js';
test('yarn tiles close at both ends, with matching radius and normal',()=>{
 assert.equal(WARP_ENDS*THREAD_PITCH,CLOTH_WIDTH);
 for(const warp of [true,false]){const g=yarnTile(warp);for(let strand=0;strand<TILE_THREADS;strand++)for(let side=0;side<g.sides;side++){
 const a=(strand*(g.rings+1)*g.sides+side)*3,b=a+g.rings*g.sides*3;
 for(let k=0;k<3;k++){const step=k===(warp?1:0)?TILE_THREADS*THREAD_PITCH:0;assert.ok(Math.abs(g.position[b+k]-g.position[a+k]-step)<1e-10);assert.ok(Math.abs(g.normal[a+k]-g.normal[b+k])<1e-10);}
 }assert.ok(g.index.every(i=>i>=0&&i<g.position.length/3));}
});
test('all crossing drafts put opposing yarns on opposite sides without penetration',()=>{
 assert.ok(CROSSING_HEIGHT>YARN_HEIGHT,'clearance between the two yarn envelopes');
 for(let type=0;type<4;type++)for(let pick=-16;pick<16;pick++)for(let end=0;end<WARP_ENDS;end++){
 const warp=yarnHeight(pick,end,true,type),weft=yarnHeight(end,pick,false,type);
 assert.equal(warp,-weft);assert.equal(warp>weft,warpOver(end,pick,type));
 assert.ok(Math.abs(warp-weft)>2*YARN_HEIGHT);
 }
});
test('yarn triangle winding survives the cloth mapping handedness change',()=>{
 for(const warp of [true,false]){const g=yarnTile(warp);for(let i=0;i<g.index.length;i+=3){
 const ids=g.index.slice(i,i+3).map(v=>v*3),a=ids[0],b=ids[1],c=ids[2],u=[0,1,2].map(k=>g.position[b+k]-g.position[a+k]),v=[0,1,2].map(k=>g.position[c+k]-g.position[a+k]),cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
 const dot=cross.reduce((sum,n,k)=>sum+n*(g.normal[a+k]+g.normal[b+k]+g.normal[c+k]),0);
 assert.ok(dot<0,'mirrored cloth frame requires reversed local faces');
 }}
});
test('readable interlacing stays within the previous triangle density',()=>{
 const previousTileTriangles=8*40*6*2,previousTileArea=.1536**2;
 const g=yarnTile(true),density=(g.index.length/3)/(THREAD_PITCH*TILE_THREADS)**2;
 assert.ok(density/(previousTileTriangles/previousTileArea)<1.03,'no more than 3% additional yarn triangles per cloth area');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {SlackSpan} from './stream-slack.js';
test('the flowing rug has no floor bend, wall clamp or floor collider',()=>{
 const s=new SlackSpan({freeFall:true});
 assert.equal(s.floorLimit,-Infinity);assert.equal(s.wallLimit,Infinity);
 for(let row=0;row<s.ny;row++){
  const j=(row*s.nx+6)*3;
  assert.ok(Math.abs(s.base[j+2]-(s.top-row/(s.ny-1)*s.length))<1e-5);
  assert.ok(Math.abs(s.base[j+1]+.19)<.019);
 }
 const j=((s.ny-1)*s.nx+6)*3;
 s.offset[j+1]=1;s.offset[j+2]=-2;s.pose();
 assert.ok(s.positions[j+1]>0,'no former wall clips the cloth');
 assert.ok(s.positions[j+2]<-5,'cloth continues below the former floor');
 assert.equal(s.positions.length,13*97*3,'fixed simulation budget');
});

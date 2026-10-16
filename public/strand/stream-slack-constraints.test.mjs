import test from 'node:test';
import assert from 'node:assert/strict';
import {SlackSpan} from './stream-slack.js';
const settle=(s,n=120)=>{for(let i=0;i<n;i++)s.advance(1/120);};
test('a short first rug has a movable free hem and a fixed feed edge',()=>{
 const s=new SlackSpan();s.length=3.1;s.shape();s.pose();const rest=s.positions.slice(),j=((s.ny-1)*s.nx+6)*3;
 s.hold(.5,1,[rest[j]+.5,rest[j+1]-.25,rest[j+2]+.12]);settle(s);
 assert.ok(s.positions[j]-rest[j]>.3,'hem follows the grip instead of remaining pinned');
 assert.deepEqual(s.positions.slice(0,s.nx*3),rest.slice(0,s.nx*3));
 for(let y=1;y<s.ny;y++)for(let x=0;x<s.nx;x++){
  const b=(y*s.nx+x)*3,a=b-s.nx*3;
  const distance=p=>Math.hypot(p[b]-p[a],p[b+1]-p[a+1],p[b+2]-p[a+2]);
  assert.ok(distance(s.positions)<=distance(s.base)*1.009,'lengthwise yarn spacing stays effectively inextensible');
 }
 const before=s.positions[j];s.release();s.advance(1/120);assert.ok(Math.abs(s.positions[j]-before)<.02,'release has no snap');
 settle(s,1200);assert.ok(Math.abs(s.positions[j]-rest[j])<1e-4,'free hem settles smoothly');
});
test('a long freely hanging rug keeps finite positions during constrained interaction',()=>{
 const s=new SlackSpan(),j=(45*s.nx+6)*3,p=s.positions;
 s.hold(.5,45/96,[p[j]+.5,1,p[j+2]-.4]);settle(s,180);
 for(let i=0;i<p.length;i+=3){assert.ok(Number.isFinite(p[i]));assert.ok(p[i+1]<=s.wallLimit+1e-6);assert.ok(p[i+2]>=s.floorLimit-1e-6);}
});
test('a strong pull preserves transverse and diagonal yarn spacing',()=>{
 const s=new SlackSpan();s.length=3.1;s.shape();s.pose();const row=22,j=(row*s.nx+6)*3,p=s.positions;
 s.hold(.5,row/96,[p[j]+.55,p[j+1]-.3,p[j+2]+.1]);settle(s);
 for(const[a,b,rest]of s.constraints){const spacing=Math.hypot(p[b]-p[a],p[b+1]-p[a+1],p[b+2]-p[a+2]);assert.ok(spacing<=rest*1.02,'warp, weft and diagonal strain all remain below 2%');}
 assert.ok(p[j]>.2,'limiting strain still permits pronounced motion');
});

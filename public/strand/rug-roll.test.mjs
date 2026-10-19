import assert from 'node:assert/strict';
import {rollPositions} from './rug-roll.js';
const p=new Float32Array(5*81*3),width=1.536,length=3.8,top=3.4,lift=2;
rollPositions(p,5,81,width,length,top,0,lift);
for(let y=0;y<81;y++){const i=y*5*3;assert.ok(Math.abs(p[i+1]+.205)<1e-6);assert.ok(Math.abs(p[i+2]-(top-y/80*length))<1e-6);}
rollPositions(p,5,81,width,length,top,.4,lift);
assert.ok(Math.abs(p[2]-top)<1e-6,'Top edge stays put while bottom rolls upward');
assert.ok(p.some((v,i)=>i%3===1&&v<-.3),'Rolled portion curls out of the rug plane');
for(let t=0;t<=1;t+=.02){rollPositions(p,5,81,width,length,top,t,lift);assert.ok(p.every(Number.isFinite),'No invalid roll vertices');}
rollPositions(p,5,81,width,length,top,1,lift);
for(let i=2;i<p.length;i+=3)assert.ok(p[i]>top+1.5,'Entire roll exits above the old top edge');
console.log('Roll starts flat, curls bottom upward and exits fully through the top');

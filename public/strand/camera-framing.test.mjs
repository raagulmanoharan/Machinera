import test from 'node:test';import assert from 'node:assert/strict';import {captureWindow} from './camera-framing.js';
test('digital zoom preserves the visible aspect ratio and stays centred',()=>{for(const [w,h] of [[1920,1440],[1080,1920]])for(const z of [1,1.5,3]){const c=captureWindow(w,h,390,844,z);assert.ok(Math.abs(c.width/c.height-390/844)<1e-12);assert.equal(c.x+c.width/2,w/2);assert.equal(c.y+c.height/2,h/2);assert.ok(c.width<=w&&c.height<=h);const base=captureWindow(w,h,390,844);assert.ok(Math.abs(c.width*z-base.width)<1e-9);}});
test('framing rejects invalid source geometry',()=>{assert.throws(()=>captureWindow(0,100,390,844));});

test('a visible blue subject excludes brown side margins in a wide uploaded photo',()=>{const crop=captureWindow(900,300,390,667);assert.ok(crop.x>=360);assert.ok(crop.x+crop.width<=540);assert.equal(crop.height,300);});

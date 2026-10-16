import test from 'node:test';
import assert from 'node:assert/strict';
import {GPUFrameGate} from './gpu-frame-gate.js';
function mock(){return {TIMEOUT_EXPIRED:1,WAIT_FAILED:2,ALREADY_SIGNALED:3,SYNC_GPU_COMMANDS_COMPLETE:4,status:1,created:0,deleted:0,flushed:0,fenceSync(){return ++this.created},clientWaitSync(f,flags,timeout){assert.equal(timeout,0);return this.status},deleteSync(){this.deleted++},flush(){this.flushed++}};}
test('busy GPU defers submission without blocking or leaking fences',()=>{const gl=mock(),gate=new GPUFrameGate(gl);for(let cycle=0;cycle<100;cycle++){assert.ok(gate.ready());gate.submitted();for(let poll=0;poll<10;poll++)assert.equal(gate.ready(),false);gl.status=3;assert.ok(gate.ready());gl.status=1;}assert.equal(gl.created,100);assert.equal(gl.deleted,100);assert.equal(gl.flushed,100);});
test('failed synchronization falls back and resets release resources',()=>{const gl=mock(),gate=new GPUFrameGate(gl);gate.submitted();gl.status=2;assert.ok(gate.ready());gate.submitted();assert.equal(gl.created,1);gate.reset();assert.equal(gl.deleted,1);});
test('unsupported contexts remain usable',()=>{const gate=new GPUFrameGate({});assert.ok(gate.ready());gate.submitted();gate.reset();});

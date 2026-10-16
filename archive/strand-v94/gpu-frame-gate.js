// Keep interaction fresh by allowing at most one submitted frame on the GPU.
// Polling never blocks the main thread and does not change render quality.
export class GPUFrameGate {
 constructor(gl){this.gl=gl;this.fence=null;this.available=typeof gl.fenceSync==='function';}
 ready(){
  if(!this.fence)return true;
  const gl=this.gl,status=gl.clientWaitSync(this.fence,0,0);
  if(status===gl.TIMEOUT_EXPIRED)return false;
  gl.deleteSync(this.fence);this.fence=null;
  if(status===gl.WAIT_FAILED)this.available=false;
  return true;
 }
 submitted(){if(!this.available)return;this.fence=this.gl.fenceSync(this.gl.SYNC_GPU_COMMANDS_COMPLETE,0);this.gl.flush();}
 reset(){if(this.fence)this.gl.deleteSync(this.fence);this.fence=null;}
}

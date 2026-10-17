import * as T from 'three';
import {StraightSpan} from './straight-span.js?v=143';
// A fixed-size, freely hanging cloth patch. No room colliders or pile solver.
class SlackSpan{
 constructor(){this.nx=5;this.ny=33;this.width=1.536;this.length=3.85+.48*Math.PI/2+4.83;this.top=4.35;this.wallLimit=Infinity;this.floorLimit=-Infinity;this.positions=new Float32Array(this.nx*this.ny*3);this.base=new Float32Array(this.positions.length);this.offset=new Float32Array(this.positions.length);this.velocity=new Float32Array(this.positions.length);this.stepBefore=new Float32Array(this.positions.length);this.active=false;this.isWorker=false;this.grab=null;this.constraints=[];this.shape();this.pose();}
 shape(){for(let y=0;y<this.ny;y++){const s=y/(this.ny-1)*this.length,depth=-.19,z=this.top-s,slack=0;for(let x=0;x<this.nx;x++){const j=(y*this.nx+x)*3;this.base[j]=(x/(this.nx-1)-.5)*this.width;this.base[j+1]=depth+slack;this.base[j+2]=z;}}let edge=0;const add=(a,b)=>{const ia=a*3,ib=b*3,r=Math.hypot(this.base[ia]-this.base[ib],this.base[ia+1]-this.base[ib+1],this.base[ia+2]-this.base[ib+2]);if(this.constraints[edge])this.constraints[edge][2]=r;else this.constraints.push([ia,ib,r]);edge++;};for(let y=0;y<this.ny;y++)for(let x=0;x<this.nx;x++){const a=y*this.nx+x;if(x+1<this.nx)add(a,a+1);if(y+1<this.ny){add(a,a+this.nx);if(x+1<this.nx){add(a,a+this.nx+1);add(a+1,a+this.nx);}}}}
 pose(){for(let j=0;j<this.positions.length;j++)this.positions[j]=this.base[j]+this.offset[j];}
 hold(u,v,target){const row=Math.max(3,Math.min(this.ny-1,Math.round(v*(this.ny-1)))),column=Math.max(0,Math.min(this.nx-1,Math.round(u*(this.nx-1)))),index=row*this.nx+column;this.grab={row,column,index,origin:Array.from(this.positions.slice(index*3,index*3+3)),start:Array.from(this.offset.slice(index*3,index*3+3)),goal:target.slice()};this.active=true;}
 move(target){if(this.grab){this.grab.goal=target.slice();this.active=true;}}
 release(){this.grab=null;this.active=true;}
 advance(dt){if(!this.active)return false;let changed=false,remaining=Math.min(dt,.05);while(remaining>1e-7){const step=Math.min(remaining,1/120);this.step(step);remaining-=step;changed=true;}return changed;}
 step(dt){const {nx,ny,offset:o,velocity:v,grab:g}=this;this.stepBefore.set(this.positions);const stiffness=7,damping=Math.exp(-(g?4.8:4.2)*dt),dx=this.width/(nx-1),ds=this.length/(ny-1);let energy=0;
  for(let y=1;y<ny;y++)for(let x=0;x<nx;x++){const j=(y*nx+x)*3,ax=g?(x-g.column)*dx/.30:0,ay=g?(y-g.row)*ds/.45:0,weight=g?Math.exp(-ax*ax-ay*ay)*Math.min(1,y/5):0;for(let k=0;k<3;k++){const i=j+k,limit=k===2?.5:.65,goal=g?Math.max(-limit,Math.min(limit,g.start[k]+g.goal[k]-g.origin[k])):0;let laplacian=0;if(x)laplacian+=o[i-3]-o[i];if(x<nx-1)laplacian+=o[i+3]-o[i];laplacian+=o[i-nx*3]-o[i];if(y<ny-1)laplacian+=o[i+nx*3]-o[i];v[i]=(v[i]+(-o[i]*stiffness+(g?(goal-o[i])*140*weight:0)+laplacian*3)*dt)*damping;}}
  for(let y=1;y<ny;y++)for(let x=0;x<nx;x++)for(let k=0;k<3;k++){const j=(y*nx+x)*3+k;o[j]+=v[j]*dt;energy=Math.max(energy,Math.abs(o[j]),Math.abs(v[j]));}this.pose();this.limitStretch();energy=0;for(let j=nx*3;j<o.length;j++){v[j]=(this.positions[j]-this.stepBefore[j])/dt;energy=Math.max(energy,Math.abs(o[j]),Math.abs(v[j]));}this.active=!!g||energy>5e-5;
 }
 // Inequality distance constraints retain folds/compression while preventing
 // rubber-like extension. Only the feed row is fixed; the visible hem is free.
 limitStretch(){const p=this.positions,top=this.nx*3;for(let pass=0;pass<4;pass++){const reverse=pass%2;for(let n=0;n<this.constraints.length;n++){const [a,b,rest]=this.constraints[reverse?this.constraints.length-1-n:n],dx=p[b]-p[a],dy=p[b+1]-p[a+1],dz=p[b+2]-p[a+2],d2=dx*dx+dy*dy+dz*dz,limit=rest*1.008;if(d2<=limit*limit||d2<1e-18)continue;const d=Math.sqrt(d2);const wa=a<top?0:1,wb=b<top?0:1,amount=(d-limit)/d/(wa+wb);for(let k=0;k<3;k++){const delta=(k===0?dx:k===1?dy:dz)*amount;if(wa)p[a+k]+=delta;if(wb)p[b+k]-=delta;}}}// A feed-to-hem sweep also limits transverse and diagonal strain.
 const cap=(b,a)=>{const dx=p[b]-p[a],dy=p[b+1]-p[a+1],dz=p[b+2]-p[a+2],bx=this.base[b]-this.base[a],by=this.base[b+1]-this.base[a+1],bz=this.base[b+2]-this.base[a+2],limit2=(bx*bx+by*by+bz*bz)*1.016064,d2=dx*dx+dy*dy+dz*dz;if(d2>limit2*(1.+1e-6)){const f=Math.sqrt(limit2/d2);p[b]=p[a]+dx*f;p[b+1]=p[a+1]+dy*f;p[b+2]=p[a+2]+dz*f;}};
 for(let y=1;y<this.ny;y++)for(let x=0;x<this.nx;x++){const b=(y*this.nx+x)*3;for(let pass=0;pass<16;pass++){const px=p[b],py=p[b+1],pz=p[b+2];if(x)cap(b,b-3);if(x)cap(b,b-top-3);if(x+1<this.nx)cap(b,b-top+3);cap(b,b-top);if((p[b]-px)**2+(p[b+1]-py)**2+(p[b+2]-pz)**2<1e-12)break;}}
 for(let j=top;j<p.length;j++){this.offset[j]=p[j]-this.base[j];}this.pose();}
}

// Loaded only on explicit opt-in. Every listener and in-flight grip is released
// by the returned disposer, so repeated toggles cannot accumulate handlers.
export function enableClothPhysics({cloth,canvas,camera,render,scroll}){
 const sim=new SlackSpan();sim.length=cloth.sim.length;sim.top=cloth.sim.top;sim.shape();sim.pose();cloth.sim=sim;cloth.physicsEnabled=true;cloth.display=sim.positions;cloth.upload();
 const controller=new AbortController(),options={signal:controller.signal},ray=new T.Raycaster(),pointer=new T.Vector2(),plane=new T.Plane(),point=new T.Vector3(),direction=new T.Vector3();let drag=null;
 const cast=e=>{const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);ray.setFromCamera(pointer,camera);};
 canvas.addEventListener('pointerdown',e=>{if(drag||e.button>0)return;cast(e);const hit=ray.intersectObject(cloth.hit,false)[0];scroll.stop();drag={id:e.pointerId,lastY:e.clientY,time:e.timeStamp,velocity:0,scrolling:!hit};if(hit){plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(direction),hit.point);sim.hold(hit.uv.x,hit.uv.y,hit.point.toArray());}canvas.setPointerCapture(e.pointerId);e.preventDefault();render();},options);
 canvas.addEventListener('pointermove',e=>{if(drag?.id!==e.pointerId)return;e.preventDefault();if(drag.scrolling){const amount=drag.lastY-e.clientY,dt=Math.max(1,e.timeStamp-drag.time);drag.velocity=.35*drag.velocity+.65*amount/dt;scroll.move(amount);drag.lastY=e.clientY;drag.time=e.timeStamp;}else{cast(e);if(ray.ray.intersectPlane(plane,point))sim.move(point.toArray());}render();},options);
 const finish=e=>{if(!drag||e&&e.pointerId!==drag.id)return;const d=drag;drag=null;if(canvas.hasPointerCapture(d.id))canvas.releasePointerCapture(d.id);sim.release();if(d.scrolling)scroll.release(e?.type==='pointerup'&&e.timeStamp-d.time<100?d.velocity:0);render();};
 for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,finish,options);
 canvas.addEventListener('wheel',e=>{e.preventDefault();scroll.move(e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?innerHeight:1));},{...options,passive:false});
 window.addEventListener('blur',()=>finish(),options);document.addEventListener('visibilitychange',()=>{if(document.hidden)finish();},options);
 render(true);
 return()=>{finish();controller.abort();scroll.stop();const straight=new StraightSpan();straight.length=sim.length;straight.top=sim.top;straight.shape();cloth.sim=straight;cloth.physicsEnabled=false;cloth.display=straight.positions;cloth.upload();render(true);};
}

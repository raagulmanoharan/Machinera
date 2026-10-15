// Metres, Z-up. Fixed-step position-based hanging cloth, pinned only along the rail.
export class HangingPhysics {
 constructor({width=1.536,height=2.304,bottom=.648,nx=25,ny=39}={}){
  Object.assign(this,{width,height,bottom,nx,ny});this.positions=new Float32Array(nx*ny*3);this.previous=new Float32Array(this.positions.length);this.rest=new Float32Array(this.positions.length);this.pinned=new Uint8Array(nx*ny);this.links=[];this.grab=null;this.active=false;this.accumulator=0;this.quiet=0;
  for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){const u=x/(nx-1),v=y/(ny-1),i=y*nx+x,j=i*3,envelope=Math.sin((1-v)*Math.PI/2);this.positions.set([(u-.5)*width+envelope*Math.pow(Math.abs(u-.5)*2,4)*.003*Math.sin(v*13+.7),-.014-envelope*(.006+.005*Math.sin(u*6.2+v*3.1)),bottom+v*height],j);this.pinned[i]=y===ny-1?1:0;}
  this.rest.set(this.positions);this.previous.set(this.positions);
  const link=(a,b,k)=>{const j=a*3,l=b*3;this.links.push([a,b,Math.hypot(...[0,1,2].map(c=>this.rest[j+c]-this.rest[l+c])),k])};
  for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){const i=y*nx+x;if(x<nx-1)link(i,i+1,1);if(y<ny-1)link(i,i+nx,1);if(x<nx-1&&y<ny-1){link(i,i+nx+1,.75);link(i+1,i+nx,.75)}if(x<nx-2)link(i,i+2,.32);if(y<ny-2)link(i,i+nx*2,.32)}
 }
 index(u,v){return Math.max(0,Math.min(this.ny-2,Math.round(v*(this.ny-1))))*this.nx+Math.max(0,Math.min(this.nx-1,Math.round(u*(this.nx-1))))}
 hold(u,v,target){const index=this.index(u,v);this.grab={index,target:Array.from(this.positions.subarray(index*3,index*3+3)),goal:[...target]};this.active=true;this.quiet=0;}
 move(target){if(!this.grab)return;const j=this.grab.index*3;this.grab.goal=target.map((v,c)=>Math.max(this.rest[j+c]-(c===1?.45:.32),Math.min(this.rest[j+c]+(c===1?.025:.32),v)));this.active=true;}
 impulse(u,v,amount=.008){const i=this.index(u,v),cx=i%this.nx,cy=Math.floor(i/this.nx);for(let y=Math.max(0,cy-3);y<Math.min(this.ny-1,cy+4);y++)for(let x=Math.max(0,cx-3);x<Math.min(this.nx,cx+4);x++){const j=(y*this.nx+x)*3+1;this.previous[j]+=amount*Math.exp(-((x-cx)**2+(y-cy)**2)/5);}this.active=true;this.quiet=0;}
 release(){this.grab=null;this.active=true;this.quiet=0;}
 advance(dt){if(!this.active)return false;this.accumulator+=Math.min(dt,.06);let changed=false;while(this.accumulator>=1/90){this.step();this.accumulator-=1/90;changed=true;}return changed;}
 step(){const p=this.positions,old=this.previous,dt=1/90;
  if(this.grab)for(let c=0;c<3;c++)this.grab.target[c]+=(this.grab.goal[c]-this.grab.target[c])*.28;
  for(let i=0;i<this.pinned.length;i++){if(this.pinned[i])continue;const j=i*3;for(let c=0;c<3;c++){const v=p[j+c],vel=(v-old[j+c])*.965;old[j+c]=v;p[j+c]=v+vel+(c===2?-2.4*dt*dt:0)+(this.rest[j+c]-v)*.0015;}}
  for(let iteration=0;iteration<7;iteration++){
   for(const[a,b,length,k]of this.links){const j=a*3,l=b*3,dx=p[l]-p[j],dy=p[l+1]-p[j+1],dz=p[l+2]-p[j+2],d=Math.hypot(dx,dy,dz);if(d<1e-9)continue;const wa=this.pinned[a]||this.grab?.index===a?0:1,wb=this.pinned[b]||this.grab?.index===b?0:1;if(!wa&&!wb)continue;const f=(d-length)/d*k/(wa+wb);p[j]+=dx*f*wa;p[j+1]+=dy*f*wa;p[j+2]+=dz*f*wa;p[l]-=dx*f*wb;p[l+1]-=dy*f*wb;p[l+2]-=dz*f*wb;}
   if(this.grab){const j=this.grab.index*3;p.set(this.grab.target,j);old.set(this.grab.target,j);}
   // Keep the full yarn radius in front of the plaster at Y=.03.
   for(let i=0;i<this.pinned.length;i++){const j=i*3;if(!this.pinned[i])p[j+1]=Math.min(.017,p[j+1]);}
  }
  let speed=0;for(let i=0;i<p.length;i++)speed=Math.max(speed,Math.abs(p[i]-old[i]));this.quiet=speed<.00012&&!this.grab?this.quiet+1:0;if(this.quiet>65){this.active=false;this.previous.set(p);}
 }
}

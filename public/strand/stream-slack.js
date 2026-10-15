// A fixed-size guided fabric patch: local springs, anchored ends and simple
// room-plane bounds. No self-contact queries, pile solver or growing grid.
export class SlackSpan{
 constructor(){this.nx=13;this.ny=97;this.width=1.536;this.length=3.85+.48*Math.PI/2+4.83;this.top=4.35;this.wallLimit=-.075;this.floorLimit=.018;this.positions=new Float32Array(this.nx*this.ny*3);this.previous=this.positions;this.base=new Float32Array(this.positions.length);this.offset=new Float32Array(this.positions.length);this.velocity=new Float32Array(this.positions.length);this.active=false;this.isWorker=false;this.feed=0;this.grab=null;this.shape();this.pose();}
 shape(){const bend=3.85,endBend=bend+.48*Math.PI/2;for(let y=0;y<this.ny;y++){const s=y/(this.ny-1)*this.length;let depth=-.19,z=this.top-s;if(s>bend&&s<=endBend){const angle=(s-bend)/.48;depth=-.19-.48*(1-Math.cos(angle));z=.50-.48*Math.sin(angle);}else if(s>endBend){depth=-.67-(s-endBend);z=.02;}const slack=s>2.9&&s<endBend?.018*Math.sin((s-2.9)/(endBend-2.9)*Math.PI)**2:0;for(let x=0;x<this.nx;x++){const j=(y*this.nx+x)*3;this.base[j]=(x/(this.nx-1)-.5)*this.width;this.base[j+1]=depth+slack;this.base[j+2]=z;}}}
 pose(){for(let j=0;j<this.positions.length;j+=3){this.positions[j]=this.base[j]+this.offset[j];const depth=this.base[j+1]+this.offset[j+1],height=this.base[j+2]+this.offset[j+2];this.positions[j+1]=Math.min(this.wallLimit,depth);this.positions[j+2]=Math.max(this.floorLimit,height);if(depth>this.wallLimit){this.offset[j+1]=this.wallLimit-this.base[j+1];this.velocity[j+1]=Math.min(0,this.velocity[j+1]);}if(height<this.floorLimit){this.offset[j+2]=this.floorLimit-this.base[j+2];this.velocity[j+2]=Math.max(0,this.velocity[j+2]);}}}
 hold(u,v,target){const row=Math.max(3,Math.min(this.ny-4,Math.round(v*(this.ny-1)))),column=Math.max(0,Math.min(this.nx-1,Math.round(u*(this.nx-1)))),index=row*this.nx+column;this.grab={row,column,index,origin:Array.from(this.positions.slice(index*3,index*3+3)),start:Array.from(this.offset.slice(index*3,index*3+3)),goal:target.slice()};this.active=true;}
 move(target){if(this.grab){this.grab.goal=target.slice();this.active=true;}}
 release(){this.grab=null;this.active=true;}
 impulse(){this.velocity[(42*this.nx+6)*3+1]-=.18;this.active=true;}
 advance(dt){if(!this.active)return false;let changed=false,remaining=Math.min(dt,.05);while(remaining>1e-7){const step=Math.min(remaining,1/120);this.step(step);remaining-=step;changed=true;}return changed;}
 step(dt){const {nx,ny,offset:o,velocity:v,grab:g}=this;const stiffness=g?85:32,damping=Math.exp(-(g?10:7.5)*dt),dx=this.width/(nx-1),ds=this.length/(ny-1);let energy=0;
  for(let y=1;y<ny-1;y++)for(let x=0;x<nx;x++){const j=(y*nx+x)*3,ax=g?(x-g.column)*dx/.8:0,ay=g?(y-g.row)*ds/.95:0,weight=g?Math.exp(-ax*ax-ay*ay)*Math.min(1,y/5,(ny-1-y)/5):0;for(let k=0;k<3;k++){const i=j+k,limit=k===2?.5:.65,goal=g?Math.max(-limit,Math.min(limit,g.start[k]+g.goal[k]-g.origin[k]))*weight:0;let laplacian=0;if(x)laplacian+=o[i-3]-o[i];if(x<nx-1)laplacian+=o[i+3]-o[i];laplacian+=o[i-nx*3]+o[i+nx*3]-2*o[i];v[i]=(v[i]+((goal-o[i])*stiffness+laplacian*12)*dt)*damping;}}
  for(let y=1;y<ny-1;y++)for(let x=0;x<nx;x++)for(let k=0;k<3;k++){const j=(y*nx+x)*3+k;o[j]+=v[j]*dt;energy=Math.max(energy,Math.abs(o[j]),Math.abs(v[j]));}this.pose();this.active=!!g||energy>1e-6;
 }
 setViewportRows(){}
}

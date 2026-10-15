// A guided loose span with damped touch response. No contacts, floor pile,
// triangle intersections, worker, or hidden growing simulation grid.
export class SlackSpan{
 constructor(){this.nx=13;this.ny=97;this.width=1.536;this.length=4.65;this.top=4.35;this.positions=new Float32Array(this.nx*this.ny*3);this.previous=this.positions;this.offset=new Float32Array(this.ny*3);this.velocity=new Float32Array(this.offset.length);this.active=false;this.isWorker=false;this.feed=0;this.grab=null;this.pose();}
 pose(){for(let y=0;y<this.ny;y++){const s=y/(this.ny-1)*this.length;let depth=-.19,z=this.top-s;if(s>3.65){const t=(s-3.65);depth=-.19-.93*t*t*(3-2*t);z=.7-.40*Math.sin(t*Math.PI/2);}for(let x=0;x<this.nx;x++){const u=x/(this.nx-1),j=(y*this.nx+x)*3,envelope=Math.sin(y/(this.ny-1)*Math.PI);this.positions[j]=(u-.5)*this.width+this.offset[y*3];this.positions[j+1]=depth+this.offset[y*3+1]*(.8+.2*Math.sin(u*Math.PI))+.015*envelope*Math.sin(u*5+s);this.positions[j+2]=z+this.offset[y*3+2];}}}
 hold(u,v,target){const row=Math.max(3,Math.min(this.ny-4,Math.round(v*(this.ny-1)))),index=row*this.nx+Math.round(u*(this.nx-1));this.grab={row,index,origin:Array.from(this.positions.slice(index*3,index*3+3)),goal:target.slice()};this.active=true;}
 move(target){if(this.grab){this.grab.goal=target.slice();this.active=true;}}
 release(){this.grab=null;this.active=true;}
 impulse(){this.velocity[60*3+1]-=.08;this.active=true;}
 advance(dt){if(!this.active)return false;const step=Math.min(dt,.025);let energy=0;for(let y=1;y<this.ny-1;y++){const weight=this.grab?Math.exp(-(((y-this.grab.row)/14)**2))*Math.sin(y/(this.ny-1)*Math.PI):0;for(let k=0;k<3;k++){const j=y*3+k,goal=this.grab?Math.max(-.28,Math.min(.28,this.grab.goal[k]-this.grab.origin[k]))*weight:0;this.velocity[j]+=(goal-this.offset[j])*75*step;this.velocity[j]*=Math.exp(-11*step);this.offset[j]+=this.velocity[j]*step;energy=Math.max(energy,Math.abs(this.offset[j]),Math.abs(this.velocity[j]));}}this.pose();this.active=!!this.grab||energy>1e-6;return true;}
 setViewportRows(){}
}

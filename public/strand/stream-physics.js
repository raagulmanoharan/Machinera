// Z-up, metres. A fed strip with fixed-step cloth constraints and floor contact.
export class StreamPhysics {
 constructor({nx=19,ny=137,length=6.2}={}){
  Object.assign(this,{nx,ny,length,width:1.536,top:4.35});this.positions=new Float32Array(nx*ny*3);this.previous=new Float32Array(nx*ny*3);this.rest=new Float32Array(nx*ny*3);this.active=true;this.grab=null;this.accumulator=0;this.quiet=0;this.feed=0;this.links=[];this.collisionCells=new Map();this.collisionNext=new Int32Array(nx*ny);
  this.shape(length);this.positions.set(this.rest);this.previous.set(this.rest);
  const add=(a,b,k)=>this.links.push([a,b,k]);for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){const i=y*nx+x;if(x+1<nx)add(i,i+1,1);if(y+1<ny)add(i,i+nx,1);if(x+1<nx&&y+1<ny){add(i,i+nx+1,.65);add(i+1,i+nx,.65)}if(y+2<ny)add(i,i+nx*2,.24);if(x+2<nx)add(i,i+2,.24);}
  this.a=new Uint16Array(this.links.length);this.b=new Uint16Array(this.links.length);this.k=new Float32Array(this.links.length);this.lengths=new Float32Array(this.links.length);for(let i=0;i<this.links.length;i++){const[a,b,k]=this.links[i];this.a[i]=a;this.b[i]=b;this.k[i]=k;}this.measure();
 }
 shape(length){this.length=length;for(let y=0;y<this.ny;y++)for(let x=0;x<this.nx;x++){
  const u=x/(this.nx-1),s=y/(this.ny-1)*length,t=Math.max(0,s-3.55),j=(y*this.nx+x)*3;
  const settle=1-Math.exp(-t*3),wave=Math.sin(t*5.3);
  const z=t>0?.03+.77*Math.exp(-t*3)+.20*settle*wave*wave+.022*t*settle:this.top-s;
  const depth=t>0?-.19-1.05*(1-Math.exp(-t*.65))-.14*settle*Math.sin(t*2.2):-.19-.025*Math.sin(s*2.4+u*5)*Math.sin(Math.min(s,1)*Math.PI/2);
  this.rest[j]=(u-.5)*this.width+.025*settle*Math.sin(t*3+u*4);
  this.rest[j+1]=depth+.035*settle*Math.sin(u*9+t*2);
  this.rest[j+2]=z+.025*Math.sin(u*7+s*2)*Math.sin(u*Math.PI)*Math.min(1,s)*Math.exp(-t*.3);
 }}
 measure(){for(let i=0;i<this.a.length;i++){const a=this.a[i]*3,b=this.b[i]*3;this.lengths[i]=Math.hypot(this.rest[a]-this.rest[b],this.rest[a+1]-this.rest[b+1],this.rest[a+2]-this.rest[b+2]);}}
 setLength(length){this.shape(Math.min(14,length));this.measure();this.active=true;this.quiet=0;}
 index(u,v){return Math.max(2,Math.min(this.ny-1,Math.round(v*(this.ny-1))))*this.nx+Math.max(0,Math.min(this.nx-1,Math.round(u*(this.nx-1))));}
 hold(u,v,target){const index=this.index(u,v);this.grab={index,target:Array.from(this.positions.subarray(index*3,index*3+3)),goal:[...target]};this.active=true;this.quiet=0;}
 move(target){if(!this.grab)return;this.grab.goal=target.map((v,c)=>c===2?Math.max(.045,v):c===1?Math.min(.005,v):Math.max(-1.35,Math.min(1.35,v)));this.active=true;}
 release(){this.grab=null;this.active=true;this.quiet=0;}
 impulse(u,v,amount=.009){const index=this.index(u,v),j=index*3;this.previous[j+1]+=amount;this.active=true;this.quiet=0;}
 advance(dt){if(!this.active)return false;this.accumulator+=Math.min(dt,.05);let changed=false;while(this.accumulator>=1/90){this.step();this.accumulator-=1/90;changed=true;}return changed;}
 step(){const p=this.positions,old=this.previous,r=this.rest,nx=this.nx,grab=this.grab?.index??-1;
  if(this.grab)for(let c=0;c<3;c++)this.grab.target[c]+=(this.grab.goal[c]-this.grab.target[c])*.22;
  for(let i=nx;i<p.length/3;i++){const j=i*3;for(let c=0;c<3;c++){const value=p[j+c];p[j+c]+=(value-old[j+c])*.955+(r[j+c]-value)*(this.feed?.018:.0018)-(c===2?.00036:0);old[j+c]=value;}}
  for(let it=0;it<5;it++){
   for(let e=0;e<this.a.length;e++){const ai=this.a[e],bi=this.b[e],a=ai*3,b=bi*3,wa=ai<nx||ai===grab?0:1,wb=bi<nx||bi===grab?0:1;if(!wa&&!wb)continue;const dx=p[b]-p[a],dy=p[b+1]-p[a+1],dz=p[b+2]-p[a+2],d=Math.sqrt(dx*dx+dy*dy+dz*dz)||1;const f=(d-this.lengths[e])/d*this.k[e]/(wa+wb);p[a]+=dx*f*wa;p[a+1]+=dy*f*wa;p[a+2]+=dz*f*wa;p[b]-=dx*f*wb;p[b+1]-=dy*f*wb;p[b+2]-=dz*f*wb;}
   if(this.grab){p.set(this.grab.target,grab*3);old.set(this.grab.target,grab*3);}
   for(let i=nx;i<p.length/3;i++){const j=i*3;p[j+1]=Math.min(.012,p[j+1]);if(p[j+2]<.025){p[j+2]=.025;old[j+2]=Math.min(old[j+2],.025);old[j]=p[j]+(old[j]-p[j])*.7;old[j+1]=p[j+1]+(old[j+1]-p[j+1])*.7;}}
  }
  // Resolve non-neighbouring floor vertices, keeping successive folds separate.
  if((this.tick=(this.tick??0)+1)%2===0){const cells=this.collisionCells,cell=.035;cells.clear();for(let i=nx;i<p.length/3;i++){const j=i*3;if(p[j+2]>.65)continue;const x=Math.floor(p[j]/cell),y=Math.floor(p[j+1]/cell),z=Math.floor(p[j+2]/cell);for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(let dz=-1;dz<=1;dz++){const first=cells.get(x+dx+64+(y+dy+256)*256+(z+dz+64)*131072);if(first===undefined)continue;for(let k=first;k>=0;k=this.collisionNext[k]){if(Math.abs(Math.floor(k/nx)-Math.floor(i/nx))<3)continue;const b=k*3,ax=p[j]-p[b],ay=p[j+1]-p[b+1],az=p[j+2]-p[b+2],d=Math.hypot(ax,ay,az);if(d>.00001&&d<.018){const f=(.018-d)/d*.35;p[j]+=ax*f;p[j+1]+=ay*f;p[j+2]=Math.max(.025,p[j+2]+az*f);p[b]-=ax*f;p[b+1]-=ay*f;p[b+2]=Math.max(.025,p[b+2]-az*f);}}}const key=x+64+(y+256)*256+(z+64)*131072;this.collisionNext[i]=cells.get(key)??-1;cells.set(key,i);}}
  let speed=0;for(let i=nx*3;i<p.length;i++)speed=Math.max(speed,Math.abs(p[i]-old[i]));this.quiet=speed<.00015&&!this.grab&&!this.feed?this.quiet+1:0;if(this.quiet>75){this.active=false;old.set(p);}
 }
}

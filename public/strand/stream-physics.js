import {separateFoldSurfaces} from './stream-contact.js?v=43';
// Broad, arc-length sampled floor folds: keep layer rise low and allow depth
// to extend beyond the framing rather than building a tall stack of rolls.
function feedPath(){const points=[],distance=[];let total=0,last=null;const add=(y,z)=>{if(last)total+=Math.hypot(y-last[0],z-last[1]);points.push(y,z);distance.push(total);last=[y,z];};for(let z=4.35;z>.8;z-=.01)add(-.19,z);add(-.19,.8);for(let angle=.008;angle<Math.PI/2;angle+=.008)add(-.19-.7*(1-Math.cos(angle)),.8-.755*Math.sin(angle));add(-.89,.045);for(let q=.006;q<30;q+=.006)add(-.89-.62*(1-Math.cos(q*2.4)),.045+.065*(q-(1-Math.exp(-q*3))/3)+.008*(1-Math.cos(q*2.4)));return {points,distance};}
const inletPath=feedPath();
// Z-up, metres. A fed strip with fixed-step cloth constraints and floor contact.
export class StreamPhysics {
 constructor({nx=13,ny=97,length=6.2}={}){
  Object.assign(this,{nx,ny,length,width:1.536,top:4.35});this.positions=new Float32Array(nx*ny*3);this.previous=new Float32Array(nx*ny*3);this.rest=new Float32Array(nx*ny*3);this.collisionStart=new Float32Array(nx*ny*3);this.feedPositions=new Float32Array(nx*ny*3);this.feedPrevious=new Float32Array(nx*ny*3);this.active=true;this.grab=null;this.accumulator=0;this.quiet=0;this.feed=0;this.links=[];this.rowVisible=new Uint8Array(ny).fill(1);this.rowSleeping=new Uint8Array(ny);this.rowQuiet=new Uint16Array(ny);
  this.shape(length);this.positions.set(this.rest);this.previous.set(this.rest);this.straightenInlet();
  const add=(a,b,k)=>this.links.push([a,b,k]);for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){const i=y*nx+x;if(x+1<nx)add(i,i+1,1);if(y+1<ny)add(i,i+nx,1);if(x+1<nx&&y+1<ny){add(i,i+nx+1,.65);add(i+1,i+nx,.65)}if(y+2<ny)add(i,i+nx*2,.075);if(x+2<nx)add(i,i+2,.075);}
  this.a=new Uint16Array(this.links.length);this.b=new Uint16Array(this.links.length);this.k=new Float32Array(this.links.length);this.lengths=new Float32Array(this.links.length);for(let i=0;i<this.links.length;i++){const[a,b,k]=this.links[i];this.a[i]=a;this.b[i]=b;this.k[i]=k;}this.linkRowsA=Uint16Array.from(this.a,v=>Math.floor(v/nx));this.linkRowsB=Uint16Array.from(this.b,v=>Math.floor(v/nx));this.lofiLinks=new Uint8Array(this.a.length);this.measure();
 }
 shape(length){this.length=length;const {points,distance}=inletPath;let cursor=0;for(let y=0;y<this.ny;y++){const s=y/(this.ny-1)*length;while(cursor+1<distance.length-1&&distance[cursor+1]<s)cursor++;const t=(s-distance[cursor])/(distance[cursor+1]-distance[cursor]),depth=points[cursor*2]*(1-t)+points[(cursor+1)*2]*t,height=points[cursor*2+1]*(1-t)+points[(cursor+1)*2+1]*t;for(let x=0;x<this.nx;x++){const u=x/(this.nx-1),j=(y*this.nx+x)*3;const relaxed=Math.min(1,s)*Math.sin(u*Math.PI);this.rest[j]=(u-.5)*this.width+.008*relaxed*Math.sin(s*.8);this.rest[j+1]=depth+.012*relaxed*Math.sin(u*7+s*.9);this.rest[j+2]=height+.015*relaxed*Math.sin(u*5+s*1.5);}}}
 measure(){const dx=this.width/(this.nx-1),ds=this.length/(this.ny-1);for(let i=0;i<this.a.length;i++){const a=this.a[i],b=this.b[i];this.lengths[i]=Math.hypot((a%this.nx-b%this.nx)*dx,(Math.floor(a/this.nx)-Math.floor(b/this.nx))*ds);}}
 setLength(length){const next=Math.min(14,length),before=this.length,delta=next-before;if(delta<=1e-7)return;this.wakeAll();const {nx,ny}=this,p=this.positions,old=this.previous;this.feedPositions.set(p);this.feedPrevious.set(old);this.shape(next);
  // Insert material at the inlet; advect existing material down the strip.
  // Reuse scratch arrays rather than allocating particle buffers each frame.
  for(let y=0;y<ny;y++){const s=y/(ny-1)*next-delta,source=Math.max(0,s/before*(ny-1)),row=Math.min(ny-1,Math.floor(source)),nextRow=Math.min(ny-1,row+1),t=source-row;for(let x=0;x<nx;x++)for(let c=0;c<3;c++){const j=(y*nx+x)*3+c,a=(row*nx+x)*3+c,b=(nextRow*nx+x)*3+c;if(s<0){p[j]=old[j]=this.rest[j];}else{p[j]=this.feedPositions[a]*(1-t)+this.feedPositions[b]*t;old[j]=this.feedPrevious[a]*(1-t)+this.feedPrevious[b]*t;}}}
  if(this.grab){const i=this.grab.index;this.grab.index=this.index((i%nx)/(nx-1),(Math.floor(i/nx)/(ny-1)*before+delta)/next);}
  this.straightenInlet();this.measure();this.active=true;this.quiet=0;
 }
 inletRows(){return Math.max(1,Math.floor(.65/this.length*(this.ny-1)));}
 straightenInlet(){const rows=this.inletRows(),nx=this.nx,p=this.positions,old=this.previous;for(let y=0;y<=rows;y++)for(let x=0;x<nx;x++){const j=(y*nx+x)*3;p[j]=old[j]=(x/(nx-1)-.5)*this.width;p[j+1]=old[j+1]=-.19;p[j+2]=old[j+2]=this.top-y/(this.ny-1)*this.length;}
  // Guided feed can bow with touch, but its cross sections stay level so
  // the descending strip never twists. Only the short inlet is rigid.
  const guide=Math.floor(3.35/this.length*(this.ny-1));for(let y=rows+1;y<=guide;y++){if(this.rowSleeping[y])continue;let dx=0,dy=0,dz=0,px=0,py=0,pz=0;for(let x=0;x<nx;x++){const j=(y*nx+x)*3;dx+=p[j];dy+=p[j+1]+.19;px+=old[j];py+=old[j+1]+.19;dz+=p[j+2];pz+=old[j+2];}dx/=nx;dy/=nx;px/=nx;py/=nx;dz/=nx;pz/=nx;if(this.grab&&Math.floor(this.grab.index/nx)===y){dx=this.grab.target[0]-(this.grab.index%nx/(nx-1)-.5)*this.width;dy=this.grab.target[1]+.19;dz=this.grab.target[2];px=dx;py=dy;pz=dz;}dx=Math.max(-.18,Math.min(.18,dx));dy=Math.max(-.28,Math.min(.08,dy));for(let x=0;x<nx;x++){const j=(y*nx+x)*3,base=(x/(nx-1)-.5)*this.width;p[j]=base+dx;p[j+1]=-.19+dy;old[j]=base+px;old[j+1]=-.19+py;p[j+2]=Math.max(.04,dz);old[j+2]=Math.max(.04,pz);}}
 }
 setViewportRows(mask){for(let y=0;y<this.ny;y++){this.rowVisible[y]=mask[y]?1:0;if(mask[y])this.wakeRow(y,1);}for(let e=0;e<this.a.length;e++)this.lofiLinks[e]=!this.rowVisible[this.linkRowsA[e]]&&!this.rowVisible[this.linkRowsB[e]]?1:0;}
 wakeRow(row,radius=2){for(let y=Math.max(0,row-radius);y<=Math.min(this.ny-1,row+radius);y++){if(this.rowSleeping[y]){this.rowQuiet.fill(0);const start=y*this.nx*3;this.previous.set(this.positions.subarray(start,start+this.nx*3),start);}this.rowSleeping[y]=0;this.rowQuiet[y]=0;}}
 wakeAll(){this.rowSleeping.fill(0);this.rowQuiet.fill(0);}
 updateSleeping(){for(let first=1;first<this.ny;){if(this.rowVisible[first]){this.rowQuiet[first++]=0;continue;}let end=first;while(end+1<this.ny&&!this.rowVisible[end+1])end++;const grabRow=this.grab?Math.floor(this.grab.index/this.nx):-100;let energy=0,max=0,count=0;for(let y=first;y<=end;y++)for(let j=y*this.nx*3;j<(y+1)*this.nx*3;j++){const v=this.positions[j]-this.previous[j];energy+=v*v;max=Math.max(max,Math.abs(v));count++;}const quiet=!this.feed&&!(grabRow>=first-4&&grabRow<=end+4)&&Math.sqrt(energy/count)<.0009&&max<.008;this.rowQuiet[first]=quiet?this.rowQuiet[first]+1:Math.max(0,this.rowQuiet[first]-3);if(this.rowQuiet[first]>=60){for(let y=first;y<=end;y++){this.rowSleeping[y]=1;const start=y*this.nx*3;this.previous.set(this.positions.subarray(start,start+this.nx*3),start);}}first=end+1;}}

 index(u,v){return Math.max(2,Math.min(this.ny-1,Math.round(v*(this.ny-1))))*this.nx+Math.max(0,Math.min(this.nx-1,Math.round(u*(this.nx-1))));}
 hold(u,v,target){const index=this.index(u,v);this.wakeRow(Math.floor(index/this.nx),4);this.grab={index,target:Array.from(this.positions.subarray(index*3,index*3+3)),goal:[...target]};this.active=true;this.quiet=0;}
 move(target){if(!this.grab)return;this.grab.goal=target.map((v,c)=>c===2?Math.max(.045,v):c===1?Math.min(.005,v):Math.max(-1.35,Math.min(1.35,v)));this.active=true;}
 release(){this.grab=null;this.active=true;this.quiet=0;}
 impulse(u,v,amount=.009){const index=this.index(u,v),j=index*3;this.previous[j+1]+=amount;this.active=true;this.quiet=0;}
 advance(dt){if(!this.active)return false;this.accumulator+=Math.min(dt,.05);let changed=false;while(this.accumulator>=1/90){this.step();this.accumulator-=1/90;changed=true;}return changed;}
 step(){this.collisionStart.set(this.positions);const p=this.positions,old=this.previous,r=this.rest,nx=this.nx,pinned=(this.inletRows()+1)*nx,hasSleeping=this.rowSleeping.some(Boolean),grab=this.grab?.index??-1,grabRow=grab<0?-100:Math.floor(grab/nx);
  if(this.grab)for(let c=0;c<3;c++)this.grab.target[c]+=Math.max(-.014,Math.min(.014,(this.grab.goal[c]-this.grab.target[c])*.32));
  for(let i=pinned;i<p.length/3;i++){const j=i*3;if(this.rowSleeping[Math.floor(i/nx)])continue;for(let c=0;c<3;c++){const value=p[j+c];p[j+c]+=(value-old[j+c])*.975+(r[j+c]-value)*(i/nx*this.length/(this.ny-1)<2.8?.00015:0)-(c===2?.00085:0);old[j+c]=value;}}
  for(let it=0;it<5;it++){
   for(let e=0;e<this.a.length;e++){const ai=this.a[e],bi=this.b[e],a=ai*3,b=bi*3,ar=this.linkRowsA[e],br=this.linkRowsB[e];if(it>=2&&this.lofiLinks[e]&&!this.feed&&(grab<0||Math.abs(ar-grabRow)>4&&Math.abs(br-grabRow)>4))continue;if(hasSleeping&&this.rowSleeping[ar]&&this.rowSleeping[br])continue;const dx=p[b]-p[a],dy=p[b+1]-p[a+1],dz=p[b+2]-p[a+2],d=Math.sqrt(dx*dx+dy*dy+dz*dz)||1;if((this.rowSleeping[ar]||this.rowSleeping[br])&&Math.abs(d-this.lengths[e])>.004){this.wakeRow(ar,1);this.wakeRow(br,1);}const wa=ai<pinned||ai===grab||this.rowSleeping[ar]?0:1,wb=bi<pinned||bi===grab||this.rowSleeping[br]?0:1;if(!wa&&!wb)continue;const f=(d-this.lengths[e])/d*this.k[e]/(wa+wb);p[a]+=dx*f*wa;p[a+1]+=dy*f*wa;p[a+2]+=dz*f*wa;p[b]-=dx*f*wb;p[b+1]-=dy*f*wb;p[b+2]-=dz*f*wb;}

   if(this.grab){p.set(this.grab.target,grab*3);old.set(this.grab.target,grab*3);}
   for(let i=nx;i<p.length/3;i++){const j=i*3;p[j+1]=Math.min(.012,p[j+1]);if(p[j+2]<.025){p[j+2]=.025;old[j+2]=Math.min(old[j+2],.025);if(it===4){old[j]=p[j]+(old[j]-p[j])*.88;old[j+1]=p[j+1]+(old[j+1]-p[j+1])*.88;}}}
  }
  // Triangle contact handles floor folds and raised folds in one pass.
  separateFoldSurfaces(this);this.straightenInlet();this.updateSleeping();
  let speed=0,energy=0;for(let i=nx*3;i<p.length;i++){const v=p[i]-old[i];speed=Math.max(speed,Math.abs(v));energy+=v*v;}const rms=Math.sqrt(energy/(p.length-nx*3));this.quiet=rms<.0009&&speed<.012&&!this.grab&&!this.feed?this.quiet+1:0;if(this.quiet>45){const t=Math.min(1,(this.quiet-45)/45),gain=1-t*t*(3-2*t);for(let j=pinned*3;j<p.length;j++){const velocity=p[j]-old[j];p[j]=this.collisionStart[j]+(p[j]-this.collisionStart[j])*gain;old[j]=p[j]-velocity*gain;}}if(this.quiet>90){this.active=false;old.set(p);}
 }
}

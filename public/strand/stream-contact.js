// Full-sheet point/triangle contact, including raised folds and the grabbed point.
// Large triangles use an explicit fallback list instead of being dropped.
export function separateFoldSurfaces(sim){
 const p=sim.positions,old=sim.collisionStart??sim.previous,nx=sim.nx,ny=sim.ny,cell=.18,gap=.03,buckets=new Map(),triangles=[],large=[];
 const key=(x,y,z)=>(x+128)+(y+128)*512+(z+128)*262144;
 function add(a,b,c){const n=triangles.length;triangles.push([a,b,c]);const low=[],high=[];for(let k=0;k<3;k++){low[k]=Math.floor((Math.min(p[a*3+k],p[b*3+k],p[c*3+k])-gap)/cell);high[k]=Math.floor((Math.max(p[a*3+k],p[b*3+k],p[c*3+k])+gap)/cell);}if((high[0]-low[0]+1)*(high[1]-low[1]+1)*(high[2]-low[2]+1)>512){large.push(n);return;}for(let x=low[0];x<=high[0];x++)for(let y=low[1];y<=high[1];y++)for(let z=low[2];z<=high[2];z++){const k=key(x,y,z);let list=buckets.get(k);if(!list)buckets.set(k,list=[]);list.push(n);}}
 for(let y=0;y<ny-1;y++)for(let x=0;x<nx-1;x++){const a=y*nx+x;add(a,a+1,a+nx);add(a+1,a+nx+1,a+nx);}
 for(let i=nx;i<nx*ny;i++){const j=i*3;let list=buckets.get(key(Math.floor(p[j]/cell),Math.floor(p[j+1]/cell),Math.floor(p[j+2]/cell)));if(large.length)list=list?list.concat(large):large;if(!list)continue;for(const ti of list){const[a,b,c]=triangles[ti];if([a,b,c].some(v=>Math.abs(Math.floor(i/nx)-Math.floor(v/nx))<=1&&Math.abs(i%nx-v%nx)<=1))continue;const A=a*3,B=b*3,C=c*3,ux=p[B]-p[A],uy=p[B+1]-p[A+1],uz=p[B+2]-p[A+2],vx=p[C]-p[A],vy=p[C+1]-p[A+1],vz=p[C+2]-p[A+2];let nxv=uy*vz-uz*vy,nyv=uz*vx-ux*vz,nzv=ux*vy-uy*vx;const magnitude=Math.hypot(nxv,nyv,nzv);if(magnitude<1e-8)continue;nxv/=magnitude;nyv/=magnitude;nzv/=magnitude;const dx=p[j]-p[A],dy=p[j+1]-p[A+1],dz=p[j+2]-p[A+2],d=dx*nxv+dy*nyv+dz*nzv;const uu=ux*ux+uy*uy+uz*uz,uv=ux*vx+uy*vy+uz*vz,vv=vx*vx+vy*vy+vz*vz,du=dx*ux+dy*uy+dz*uz,dv=dx*vx+dy*vy+dz*vz,den=uu*vv-uv*uv;if(den<1e-12)continue;const wb=(du*vv-dv*uv)/den,wc=(dv*uu-du*uv)/den,wa=1-wb-wc;if(Math.min(wa,wb,wc)<0)continue;const previous=(old[j]-old[A])*nxv+(old[j+1]-old[A+1])*nyv+(old[j+2]-old[A+2])*nzv,side=previous===0?(d>=0?1:-1):(previous>0?1:-1),correction=(side*gap-d)*.7;if(Math.abs(d)>=gap&&previous*d>=0)continue;
 p[j]+=nxv*correction;p[j+1]+=nyv*correction;p[j+2]=Math.max(.025,p[j+2]+nzv*correction);
 for(const[v,w]of [[A,wa],[B,wb],[C,wc]]){if(v<nx*3)continue;p[v]-=nxv*correction*w*.5;p[v+1]-=nyv*correction*w*.5;p[v+2]=Math.max(.025,p[v+2]-nzv*correction*w*.5);}
 }}
 if(sim.grab){const j=sim.grab.index*3;sim.grab.target[0]=p[j];sim.grab.target[1]=p[j+1];sim.grab.target[2]=p[j+2];}
}

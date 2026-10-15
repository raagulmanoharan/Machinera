// Exact surface intersection guard for the simulation's triangular sheet.
// Contact response lives separately; this rejects unsafe poses if response cannot converge.
function crossEdge(p,a,b,c,d,e){
 const ax=p[a*3],ay=p[a*3+1],az=p[a*3+2],dx=p[b*3]-ax,dy=p[b*3+1]-ay,dz=p[b*3+2]-az;
 const cx=p[c*3],cy=p[c*3+1],cz=p[c*3+2],ux=p[d*3]-cx,uy=p[d*3+1]-cy,uz=p[d*3+2]-cz,vx=p[e*3]-cx,vy=p[e*3+1]-cy,vz=p[e*3+2]-cz;
 const hx=dy*vz-dz*vy,hy=dz*vx-dx*vz,hz=dx*vy-dy*vx,det=ux*hx+uy*hy+uz*hz;if(Math.abs(det)<1e-10)return false;
 const sx=ax-cx,sy=ay-cy,sz=az-cz,u=(sx*hx+sy*hy+sz*hz)/det;if(u< -1e-6||u>1.000001)return false;const qx=sy*uz-sz*uy,qy=sz*ux-sx*uz,qz=sx*uy-sy*ux,v=(dx*qx+dy*qy+dz*qz)/det;if(v< -1e-6||u+v>1.000001)return false;
 const t=(vx*qx+vy*qy+vz*qz)/det;return t>1e-5&&t<1-1e-5;
}
function orient2(p,a,b,c,x,y){return (p[b*3+x]-p[a*3+x])*(p[c*3+y]-p[a*3+y])-(p[b*3+y]-p[a*3+y])*(p[c*3+x]-p[a*3+x]);}
function inside2(p,i,a,b,c,x,y){if(i===a||i===b||i===c)return false;const u=orient2(p,a,b,i,x,y),v=orient2(p,b,c,i,x,y),w=orient2(p,c,a,i,x,y);return u>1e-9&&v>1e-9&&w>1e-9||u< -1e-9&&v< -1e-9&&w< -1e-9;}
// Scalar narrow phase: retain the original tolerances without allocating
// normals, callbacks or per-pair closures in the coplanar hot path.
function coplanarOverlap(p,A,B){const a=A[0],b=A[1],c=A[2],ax=p[b*3]-p[a*3],ay=p[b*3+1]-p[a*3+1],az=p[b*3+2]-p[a*3+2],bx=p[c*3]-p[a*3],by=p[c*3+1]-p[a*3+1],bz=p[c*3+2]-p[a*3+2],n0=ay*bz-az*by,n1=az*bx-ax*bz,n2=ax*by-ay*bx,m=Math.hypot(n0,n1,n2);if(m<1e-9)return false;for(let k=0;k<3;k++){const i=B[k];if(Math.abs((p[i*3]-p[a*3])*n0+(p[i*3+1]-p[a*3+1])*n1+(p[i*3+2]-p[a*3+2])*n2)>m*1e-6)return false;}
 const drop=Math.abs(n0)>Math.abs(n1)?(Math.abs(n0)>Math.abs(n2)?0:2):(Math.abs(n1)>Math.abs(n2)?1:2),x=(drop+1)%3,y=(drop+2)%3;
 for(let k=0;k<3;k++)if(inside2(p,A[k],B[0],B[1],B[2],x,y)||inside2(p,B[k],a,b,c,x,y))return true;
 for(let i=0;i<3;i++)for(let j=0;j<3;j++){const a=A[i],b=A[(i+1)%3],c=B[j],d=B[(j+1)%3];if(orient2(p,a,b,c,x,y)*orient2(p,a,b,d,x,y)< -1e-16&&orient2(p,c,d,a,x,y)*orient2(p,c,d,b,x,y)< -1e-16)return true;}return false;
}
const trees=new Map();
function treeFor(nx,ny){const key=nx+':'+ny;if(trees.has(key))return trees.get(key);const nodes=[],faces=[];
 function build(x0,x1,y0,y1){const id=nodes.length,node={left:-1,right:-1,faces:null,count:(x1-x0)*(y1-y0)};nodes.push(node);if(node.count===1){const a=y0*nx+x0;node.faces=[[a,a+nx,a+1],[a+nx,a+nx+1,a+1]];for(const face of node.faces){Object.defineProperty(face,"boundsOffset",{value:faces.length*6});faces.push(face);}node.vertices=[a,a+1,a+nx,a+nx+1];}else if(y1-y0>=x1-x0){const m=(y0+y1)>>1;node.left=build(x0,x1,y0,m);node.right=build(x0,x1,m,y1);}else{const m=(x0+x1)>>1;node.left=build(x0,m,y0,y1);node.right=build(m,x1,y0,y1);}return id;}
 build(0,nx-1,0,ny-1);const tree={nodes,faces,faceBounds:new Float64Array(faces.length*6),bounds:new Float64Array(nodes.length*6),stack:[]};trees.set(key,tree);return tree;
}
export function findClothIntersections(p,nx,ny,limit=1){
 const {nodes,faces,faceBounds:fb,bounds:b,stack}=treeFor(nx,ny),hits=[];
 // Refit exact per-triangle bounds alongside the node bounds. A conservative
 // pad retains the edge test's barycentric tolerance for near-boundary hits.
 for(let i=0;i<faces.length;i++){const f=faces[i],o=i*6;for(let k=0;k<3;k++){fb[o+k]=Math.min(p[f[0]*3+k],p[f[1]*3+k],p[f[2]*3+k]);fb[o+3+k]=Math.max(p[f[0]*3+k],p[f[1]*3+k],p[f[2]*3+k]);}}
 for(let i=nodes.length-1;i>=0;i--){const n=nodes[i],o=i*6;if(n.faces){for(let k=0;k<3;k++){const v=n.vertices;b[o+k]=Math.min(p[v[0]*3+k],p[v[1]*3+k],p[v[2]*3+k],p[v[3]*3+k]);b[o+3+k]=Math.max(p[v[0]*3+k],p[v[1]*3+k],p[v[2]*3+k],p[v[3]*3+k]);}}else{const a=n.left*6,c=n.right*6;for(let k=0;k<3;k++){b[o+k]=Math.min(b[a+k],b[c+k]);b[o+3+k]=Math.max(b[a+3+k],b[c+3+k]);}}}
 stack.length=0;stack.push(0,0);
 while(stack.length){const j=stack.pop(),i=stack.pop(),A=nodes[i],B=nodes[j];if(i===j){if(A.faces)continue;stack.push(A.left,A.left,A.left,A.right,A.right,A.right);continue;}
  const a=i*6,c=j*6;if(b[a]>b[c+3]+1e-7||b[c]>b[a+3]+1e-7||b[a+1]>b[c+4]+1e-7||b[c+1]>b[a+4]+1e-7||b[a+2]>b[c+5]+1e-7||b[c+2]>b[a+5]+1e-7)continue;
  if(!A.faces||!B.faces){if(!A.faces&&(B.faces||A.count>=B.count))stack.push(A.left,j,A.right,j);else stack.push(i,B.left,i,B.right);continue;}
  for(const T of A.faces)for(const U of B.faces){const to=T.boundsOffset,uo=U.boundsOffset;let disjoint=false;for(let k=0;k<3;k++){const pad=1e-7+(fb[to+3+k]-fb[to+k]+fb[uo+3+k]-fb[uo+k])*2e-6;if(fb[to+k]>fb[uo+3+k]+pad||fb[uo+k]>fb[to+3+k]+pad){disjoint=true;break;}}if(disjoint)continue;let common=0;for(const v of T)if(U.includes(v))common++;if(common>=2)continue;let hit=false;
 if(common===1){const shared=U.includes(T[0])?T[0]:U.includes(T[1])?T[1]:T[2],ti=T.indexOf(shared),ui=U.indexOf(shared);hit=crossEdge(p,T[(ti+1)%3],T[(ti+2)%3],U[0],U[1],U[2])||crossEdge(p,U[(ui+1)%3],U[(ui+2)%3],T[0],T[1],T[2]);}else for(let e=0;e<3&&!hit;e++)hit=crossEdge(p,T[e],T[(e+1)%3],U[0],U[1],U[2])||crossEdge(p,U[e],U[(e+1)%3],T[0],T[1],T[2]);
 if(!hit){let axes=0;for(let k=0;k<3;k++){const lo=Math.max(fb[to+k],fb[uo+k]),hi=Math.min(fb[to+3+k],fb[uo+3+k]);if(hi-lo>1e-7)axes++;}if(axes>=2)hit=coplanarOverlap(p,T,U);}if(hit){hits.push([T,U]);if(hits.length>=limit)return hits;}}
 }
 return hits;
}

// A final fail-closed pose gate. Contact iterations are allowed to fail; an
// intersecting surface is never uploaded in place of the last valid surface.
function resolveCrossings(p,safe,nx,hits){
 for(const[A,B]of hits){const a=B[0]*3,b=B[1]*3,c=B[2]*3,ux=p[b]-p[a],uy=p[b+1]-p[a+1],uz=p[b+2]-p[a+2],vx=p[c]-p[a],vy=p[c+1]-p[a+1],vz=p[c+2]-p[a+2];let x=uy*vz-uz*vy,y=uz*vx-ux*vz,z=ux*vy-uy*vx;const len=Math.hypot(x,y,z);if(len<1e-9)continue;x/=len;y/=len;z/=len;
 let before=0;for(const v of A)before+=(safe[v*3]-safe[a])*x+(safe[v*3+1]-safe[a+1])*y+(safe[v*3+2]-safe[a+2])*z;const side=before>=0?1:-1;let min=Infinity;for(const v of A)min=Math.min(min,side*((p[v*3]-p[a])*x+(p[v*3+1]-p[a+1])*y+(p[v*3+2]-p[a+2])*z));const correction=Math.min(.10,Math.max(0,.03-min)),moveA=A.some(v=>v>=nx),moveB=B.some(v=>v>=nx),wa=moveA?(moveB?.5:1):0,wb=moveB?(moveA?.5:1):0;
 for(const v of A){if(v<nx||B.includes(v))continue;const j=v*3;p[j]+=x*side*correction*wa;p[j+1]=Math.min(.012,p[j+1]+y*side*correction*wa);p[j+2]=Math.max(.025,p[j+2]+z*side*correction*wa);}
 for(const v of B){if(v<nx||A.includes(v))continue;const j=v*3;p[j]-=x*side*correction*wb;p[j+1]=Math.min(.012,p[j+1]-y*side*correction*wb);p[j+2]=Math.max(.025,p[j+2]-z*side*correction*wb);}
 }
}
export function acceptClothPose(sim,display){
 if(!sim.renderSafe){if(!display.every(Number.isFinite)||findClothIntersections(display,sim.nx,sim.ny).length)throw Error('Cloth needs a collision-free initial pose');sim.renderSafe=new Float32Array(display);}
 if(!display.every(Number.isFinite)){display.set(sim.renderSafe);sim.positions.set(display);sim.previous.set(display);sim.blockedPoses=(sim.blockedPoses??0)+1;return false;}
 let hits=findClothIntersections(display,sim.nx,sim.ny,12);
 if(!hits.length){sim.renderSafe.set(display);return true;}
 for(const pair of hits)for(const face of pair)for(const v of face){const row=Math.floor(v/sim.nx);if(sim.rowSleeping?.[row])sim.wakeRow(row,1);}
 // Resolve actual crossing faces as well as point contacts: long edges can
 // cross between vertices, where particle-only contact cannot detect them.
 for(let pass=0;pass<4&&hits.length;pass++){resolveCrossings(display,sim.renderSafe,sim.nx,hits);hits=findClothIntersections(display,sim.nx,sim.ny,12);}
 let accepted=!hits.length,fraction=1;
 if(!accepted){
  // A collision in a floor fold must not rewind an unrelated hanging grab.
  // Restrict rollback to the colliding rows first, preserving the grabbed
  // side where possible. Revalidate the complete sheet after each correction.
  const candidate=sim.poseCandidate??(sim.poseCandidate=new Float32Array(display.length));candidate.set(display);
  const weights=sim.poseWeights??(sim.poseWeights=new Float32Array(sim.ny));weights.fill(1);
  const grabRow=sim.grab?Math.floor(sim.grab.index/sim.nx):-1;
  for(let pass=0;pass<8&&hits.length;pass++){
   for(const [A,B]of hits){
    let chosen=null;
    if(grabRow>=0&&pass<4){let da=Infinity,db=Infinity;for(const v of A)da=Math.min(da,Math.abs(Math.floor(v/sim.nx)-grabRow));for(const v of B)db=Math.min(db,Math.abs(Math.floor(v/sim.nx)-grabRow));chosen=da<=db?B:A;}
    for(const face of chosen?[chosen]:[A,B])for(const vertex of face){const row=Math.floor(vertex/sim.nx),radius=pass>=4?1:0;for(let y=Math.max(0,row-radius);y<=Math.min(sim.ny-1,row+radius);y++)weights[y]=pass>=4?0:Math.min(weights[y],Math.pow(.25,pass+1));}
   }
   for(let y=0;y<sim.ny;y++)if(weights[y]<1)for(let j=y*sim.nx*3;j<(y+1)*sim.nx*3;j++)display[j]=sim.renderSafe[j]+(candidate[j]-sim.renderSafe[j])*weights[y];
   hits=findClothIntersections(display,sim.nx,sim.ny,12);
  }
  accepted=!hits.length;
  if(!accepted){
   // Last-resort global line search remains fail-closed for extreme drags.
   for(let attempt=0;attempt<7;attempt++){fraction*=.5;for(let i=0;i<display.length;i++)display[i]=sim.renderSafe[i]+(candidate[i]-sim.renderSafe[i])*fraction;if(!findClothIntersections(display,sim.nx,sim.ny).length){accepted=true;break;}}
   if(!accepted){display.set(sim.renderSafe);fraction=0;}
  }
 }

 for(let i=0;i<display.length;i++){const velocity=sim.positions[i]-sim.previous[i];sim.positions[i]=display[i];sim.previous[i]=display[i]-velocity*fraction*.5;}
 if(sim.grab){const j=sim.grab.index*3;sim.grab.target[0]=display[j];sim.grab.target[1]=display[j+1];sim.grab.target[2]=display[j+2];}
 sim.renderSafe.set(display);sim.blockedPoses=(sim.blockedPoses??0)+1;return false;
}

// Subdivide the render field, never the constrained physics mesh. Midpoint
// Catmull-Rom preserves all solver nodes and curved tangents between them.
export class SmoothClothGrid{
 constructor(nx,ny){this.sourceNx=nx;this.sourceNy=ny;this.nx=nx*2-1;this.ny=ny;this.positions=new Float32Array(this.nx*this.ny*3);this.normals=new Float32Array(this.positions.length);}
 update(source,wallLimit,floorLimit){const {sourceNx:sx,sourceNy:sy,nx,ny,positions:p,normals:n}=this;
 for(let y=0;y<sy;y++)for(let x=0;x<nx;x++){const col=x>>1,out=(y*nx+x)*3,at=(y*sx+col)*3;if(!(x&1)){p[out]=source[at];p[out+1]=source[at+1];p[out+2]=source[at+2];}else{const lo=(y*sx+Math.max(0,col-1))*3,hi=at+3,end=(y*sx+Math.min(sx-1,col+2))*3;for(let k=0;k<3;k++)p[out+k]=(-source[lo+k]+9*source[at+k]+9*source[hi+k]-source[end+k])/16;}}
 for(let i=0;i<p.length;i+=3){p[i+1]=Math.min(wallLimit,p[i+1]);p[i+2]=Math.max(floorLimit,p[i+2]);}
 // Central differences keep backing and yarn normals on the same smooth field.
 for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){const i=(y*nx+x)*3,l=(y*nx+Math.max(0,x-1))*3,r=(y*nx+Math.min(nx-1,x+1))*3,u=(Math.max(0,y-1)*nx+x)*3,d=(Math.min(ny-1,y+1)*nx+x)*3,ax=p[r]-p[l],ay=p[r+1]-p[l+1],az=p[r+2]-p[l+2],bx=p[d]-p[u],by=p[d+1]-p[u+1],bz=p[d+2]-p[u+2],cx=by*az-bz*ay,cy=bz*ax-bx*az,cz=bx*ay-by*ax,inv=1/(Math.sqrt(cx*cx+cy*cy+cz*cz)||1);n[i]=cx*inv;n[i+1]=cy*inv;n[i+2]=cz*inv;}
 return this;}
}

// Material length is cumulative. Only this local section stays in the dense solver.
export const LIVE_WINDOW=14;
export function splitMaterialPose(positions,nx,ny,length,cutRow){
 const keep=length*cutRow/(ny-1),retained=new Float32Array(positions.length);
 for(let y=0;y<ny;y++){const source=y/(ny-1)*cutRow,a=Math.floor(source),b=Math.min(cutRow,a+1),t=source-a;for(let x=0;x<nx;x++)for(let k=0;k<3;k++){const j=(y*nx+x)*3+k;retained[j]=positions[(a*nx+x)*3+k]*(1-t)+positions[(b*nx+x)*3+k]*t;}}
 return {length:keep,retained,tail:positions.slice(cutRow*nx*3),rows:ny-cutRow,archivedLength:length-keep};
}

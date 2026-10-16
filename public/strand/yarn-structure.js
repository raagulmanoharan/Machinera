// A physical, balanced set: 48 visibly interlaced yarn bundles across a 1.536 m cloth.
// All relief, draft joins, surface shading and tile phases use this pitch.
export const CLOTH_WIDTH=1.536;
export const WARP_ENDS=48;
export const THREAD_PITCH=CLOTH_WIDTH/WARP_ENDS;
export const TILE_THREADS=8;
export const YARN_RADIUS=THREAD_PITCH*.45;
export const YARN_HEIGHT=THREAD_PITCH*.20;
export const CROSSING_HEIGHT=THREAD_PITCH*.28;
export {draftGLSL} from './weave-library.js?v=117';
// Seam-matched elliptical yarns. Four longitudinal segments per crossing,
// smooth analytical normals and shader plies avoid adding microscopic geometry.
export function yarnTile(warp,sides=6){
 const position=[],normal=[],uv=[],radial=[],index=[],rings=TILE_THREADS*4;
 for(let strand=0;strand<TILE_THREADS;strand++){
  const base=position.length/3;
  for(let ring=0;ring<=rings;ring++){
   const t=ring/rings,along=(t*TILE_THREADS-.5)*THREAD_PITCH;
   // Periodic small spinning irregularity; both ends and their slopes match.
   const radius=1+.025*Math.cos(t*Math.PI*16+strand*2.7)+.015*Math.sin(strand*2.7);
   for(let side=0;side<sides;side++){
    const a=side/sides*Math.PI*2,across=Math.cos(a),up=Math.sin(a);
    position.push(warp?strand*THREAD_PITCH+across*YARN_RADIUS*radius:along,warp?along:strand*THREAD_PITCH+across*YARN_RADIUS*radius,up*YARN_HEIGHT*radius);
    const nx=across/YARN_RADIUS,nz=up/YARN_HEIGHT,inv=1/Math.hypot(nx,nz);
    normal.push(warp?nx*inv:0,warp?0:nx*inv,nz*inv);
    uv.push(t*TILE_THREADS,side/sides);radial.push(across,up,warp?1:0);
   }
  }
  for(let ring=0;ring<rings;ring++)for(let side=0;side<sides;side++){
   const a=base+ring*sides+side,b=base+ring*sides+(side+1)%sides;
   // Cloth mapping reverses handedness (local height follows the -Y normal).
   // Reverse both local windings so world-facing triangles match their normals.
   if(warp)index.push(a,b,a+sides,a+sides,b,b+sides);
   else index.push(a,a+sides,b,b,a+sides,b+sides);
  }
 }
 return {position,normal,uv,radial,index,rings,sides};
}

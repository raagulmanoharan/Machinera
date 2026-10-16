import {THREAD_PITCH,WARP_ENDS,TILE_THREADS} from './yarn-structure.js?v=94';
export const PICKS_PER_METRE=256;
export const FABRIC_COLUMNS=128;
export const ATLAS_ROWS=4096;
export const YARN_TILE=THREAD_PITCH*TILE_THREADS;
// q is a permanent material coordinate, measured from the first rug's hem.
export const materialPoint=(head,distance)=>head-distance;
export const atlasBase=length=>(Math.ceil(length*PICKS_PER_METRE/64)*64-ATLAS_ROWS)/PICKS_PER_METRE;
export const yarnPhase=head=>((head%YARN_TILE)+YARN_TILE)%YARN_TILE;
export function motifOffset(u,q,type){const fract=x=>x-Math.floor(x),x=u*WARP_ENDS,y=q/THREAD_PITCH;if(type===1)return(Math.abs(fract(x/20)-.5)*2-.5)*.035;if(type===2)return 0;if(type===3)return(Math.abs(fract(x/32)-.5)+Math.abs(fract(y/32)-.5)-.5)*.04;return 0;}

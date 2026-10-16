import {THREAD_PITCH,TILE_THREADS} from './yarn-structure.js?v=96';
export const PICKS_PER_METRE=256;
export const FABRIC_COLUMNS=128;
export const ATLAS_ROWS=4096;
export const YARN_TILE=THREAD_PITCH*TILE_THREADS;
// q is a permanent material coordinate, measured from the first rug's hem.
export const materialPoint=(head,distance)=>head-distance;
export const atlasBase=length=>(Math.ceil(length*PICKS_PER_METRE/64)*64-ATLAS_ROWS)/PICKS_PER_METRE;
export const yarnPhase=head=>((head%YARN_TILE)+YARN_TILE)%YARN_TILE;

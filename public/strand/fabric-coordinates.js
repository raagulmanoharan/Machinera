export const PICKS_PER_METRE=256;
export const FABRIC_COLUMNS=128;
export const ATLAS_ROWS=4096;
export const YARN_TILE=.1536;
// q is a permanent material coordinate, measured from the first rug's hem.
export const materialPoint=(head,distance)=>head-distance;
export const atlasBase=length=>(Math.ceil(length*PICKS_PER_METRE/64)*64-ATLAS_ROWS)/PICKS_PER_METRE;
export const yarnPhase=head=>((head%YARN_TILE)+YARN_TILE)%YARN_TILE;
export function motifOffset(u,q,type){const fract=x=>x-Math.floor(x),x=u*80,y=q*52.0833333;if(type===1)return(Math.abs(fract(x/20)-.5)*2-.5)*.32;if(type===2)return((fract(x/16)>=.5?1:0)+(fract(y/16)>=.5?1:0)-1)*.12;if(type===3)return(Math.abs(fract(x/32)-.5)+Math.abs(fract(y/32)-.5)-.5)*.52;return 0;}

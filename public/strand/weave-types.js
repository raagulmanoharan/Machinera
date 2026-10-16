import {CROSSING_HEIGHT} from './yarn-structure.js?v=87';
import {WEAVE_LIBRARY} from './weave-library.js?v=87';
export {warpOver} from './weave-library.js?v=87';
import {warpOver} from './weave-library.js?v=87';
export const WEAVES=WEAVE_LIBRARY.map(d=>d.id);
export const WEAVE_STUDIES=WEAVE_LIBRARY.map(d=>d.name);
export function yarnHeight(along,strand,warp,type=0){const a=Math.floor(along),t=along-a,ease=.5-.5*Math.cos(t*Math.PI),height=i=>(warp?warpOver(strand,i,type):!warpOver(i,strand,type))?CROSSING_HEIGHT:-CROSSING_HEIGHT;return height(a)*(1-ease)+height(a+1)*ease;}

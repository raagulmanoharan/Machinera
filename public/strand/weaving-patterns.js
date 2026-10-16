import {WEAVE_LIBRARY,warpOver} from './weave-library.js?v=87';
import {createColourDesign,designYarns,freshDesignSeed} from './yarn-colour-design.js?v=87';
export {compileLoomDraft,generateLoomDraft} from './loom-draft.js?v=87';
export function patternIndices({family,symmetry='warp',maxFloat=4}={}){
 return WEAVE_LIBRARY.flatMap((draft,index)=>(!family||draft.family===family)&&(symmetry!=='warp'||draft.structuralSymmetry==='warp')&&draft.maxFloat<=maxFloat?[index]:[]);
}
export function listWeavePatterns(){return WEAVE_LIBRARY.map(d=>({id:d.id,name:d.name,family:d.family,shafts:d.shafts,width:d.width,height:d.height,maxFloat:d.maxFloat,symmetry:d.structuralSymmetry}));}
export function createWeavePattern({draftId,seed=freshDesignSeed(),palette,warpEnds=48,weftPicks=120,firstPick=0,family,symmetry='warp',maxFloat=4}={}){
 if(!Number.isInteger(firstPick)||!Number.isInteger(seed)||!Number.isInteger(warpEnds)||warpEnds<2||!Number.isInteger(weftPicks)||weftPicks<1)throw new RangeError('Integer seed, ends and picks required');
 if(!palette?.length||palette.some(c=>!Array.isArray(c.rgb)||c.rgb.length!==3||c.rgb.some(v=>!Number.isFinite(v)||v<0||v>255)||!Number.isFinite(c.share)||c.share<0)||Math.abs(palette.reduce((n,c)=>n+c.share,0)-1)>1e-6)throw new RangeError('Provide RGB dye lots with shares summing to one');
 const candidates=patternIndices({family,symmetry,maxFloat});let draftIndex;
 if(draftId!==undefined){draftIndex=WEAVE_LIBRARY.findIndex(d=>d.id===draftId);if(draftIndex<0)throw new RangeError('Unknown compiled draft');}
 else {if(!candidates.length)throw new RangeError('No supported draft matches the constraints');draftIndex=candidates[(seed>>>0)%candidates.length];}
 const draft=WEAVE_LIBRARY[draftIndex];if(draft.structuralSymmetry==='warp'&&warpEnds%draft.width)throw new RangeError('Mirrored repeat must divide the warp width');
 const dyes=Object.freeze(palette.map(c=>Object.freeze({...c,rgb:Object.freeze(c.rgb.slice())}))),design=Object.freeze(createColourDesign(draft,seed)),freezeYarns=y=>Object.freeze({sequence:Object.freeze(y.sequence),counts:Object.freeze(y.counts)});
 const warp=freezeYarns(designYarns(dyes,warpEnds,design,'warp')),weft=freezeYarns(designYarns(dyes,weftPicks,design,'weft'));
 return Object.freeze({version:1,id:`${draft.id}:${seed>>>0}`,seed:seed>>>0,firstPick,draftIndex,draft,palette:dyes,design,warp,weft,symmetry:draft.structuralSymmetry==='warp'?'warp-colour-and-structure':'warp-colour',
  crossing:(end,pick)=>warpOver(end,pick+firstPick,draftIndex),
  yarnAt(end,pick){if(!Number.isInteger(end)||end<0||end>=warpEnds||!Number.isInteger(pick)||pick<0||pick>=weftPicks)throw new RangeError('Crossing outside yarn inventory');return dyes[warpOver(end,pick+firstPick,draftIndex)?warp.sequence[end]:weft.sequence[pick]].rgb;}
 });
}

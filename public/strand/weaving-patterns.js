import {composeRug} from './rug-composition.js?v=126';
import {generatePhotoDraft,draftCrossing} from './photo-draft.js?v=126';
import {chooseLoomDraft} from './photo-weave-design.js?v=126';
import {splitYarnDyes} from './yarn-contrast.js?v=126';
import {WEAVE_LIBRARY} from './weave-library.js?v=126';
import {createColourDesign,designYarns} from './yarn-colour-design.js?v=126';
export {compileLoomDraft,generateLoomDraft} from './loom-draft.js?v=126';
export function patternIndices({family,symmetry='warp',maxFloat=7,composition=false}={}){
 return WEAVE_LIBRARY.flatMap((draft,index)=>(!family||draft.family===family)&&(symmetry!=='warp'||draft.structuralSymmetry==='warp')&&draft.maxFloat<=maxFloat?[index]:[]);
}
export function listWeavePatterns(){return WEAVE_LIBRARY.map(d=>({id:d.id,name:d.name,family:d.family,shafts:d.shafts,width:d.width,height:d.height,maxFloat:d.maxFloat,symmetry:d.structuralSymmetry}));}
export function createWeavePattern({draftId,seed=0,palette,analysis=null,warpEnds=48,weftPicks=120,firstPick=0,family,symmetry='warp',maxFloat=7,composition=false}={}){
 if(!Number.isInteger(firstPick)||!Number.isInteger(seed)||!Number.isInteger(warpEnds)||warpEnds<2||!Number.isInteger(weftPicks)||weftPicks<1)throw new RangeError('Integer seed, ends and picks required');
 if(!palette?.length||palette.length>5||palette.some(c=>!Array.isArray(c.rgb)||c.rgb.length!==3||c.rgb.some(v=>!Number.isFinite(v)||v<0||v>255)||!Number.isFinite(c.share)||c.share<0)||Math.abs(palette.reduce((n,c)=>n+c.share,0)-1)>1e-6)throw new RangeError('Provide RGB dye lots with shares summing to one');
 if(!['warp','weft','both','radial','auto'].includes(symmetry))throw new RangeError('Unknown composition symmetry');
 const candidates=patternIndices({family,symmetry:symmetry==='auto'?'warp':symmetry,maxFloat});let draftIndex;
 if(draftId!==undefined){draftIndex=WEAVE_LIBRARY.findIndex(d=>d.id===draftId);if(draftIndex<0)throw new RangeError('Unknown compiled draft');}
 else if(family){if(!candidates.length)throw new RangeError('No supported draft matches the constraints');draftIndex=chooseLoomDraft(palette,candidates,WEAVE_LIBRARY,analysis);}
 const draft=draftIndex===undefined?generatePhotoDraft(palette,analysis):WEAVE_LIBRARY[draftIndex];if(draftIndex===undefined){draftIndex=256+parseInt(draft.id.split('-')[1],16);}if(draft.structuralSymmetry==='warp'&&warpEnds%draft.width)throw new RangeError('Mirrored repeat must divide the warp width');
 const dyes=Object.freeze(palette.map(c=>Object.freeze({...c,rgb:Object.freeze(c.rgb.slice())}))),design=Object.freeze(createColourDesign(draft,seed,symmetry,dyes,analysis)),freezeYarns=y=>Object.freeze({sequence:Object.freeze(y.sequence),counts:Object.freeze(y.counts)});
 // Each system contributes roughly half the length in a balanced cloth.
 // Split the dye mass between contrasting systems instead of duplicating the
 // same stripes on both axes; combined source proportions remain unchanged.
 const geometric=draft.family==='geometric'&&!composition;const {warp:warpShares,weft:weftShares}=geometric?splitYarnDyes(dyes):{};
 const wp=geometric?dyes.map((c,i)=>({...c,share:warpShares[i]})):dyes,fp=geometric?dyes.map((c,i)=>({...c,share:weftShares[i]})):dyes;
 const motif=composition?composeRug(dyes,warpEnds,weftPicks,analysis):null;
 const warp=freezeYarns(designYarns(wp,warpEnds,design,'warp')),weft=freezeYarns(designYarns(fp,weftPicks,design,'weft'));
 return Object.freeze({version:1,motif,id:`${draft.id}:${seed>>>0}`,seed:seed>>>0,firstPick,draftIndex,draft,palette:dyes,design,warp,weft,allocation:geometric?'contrasting-systems':'shared-systems',colourSymmetry:design.symmetry,rotationalOrder:design.symmetry==='radial'?2:undefined,symmetry:design.symmetry==='warp'&&draft.structuralSymmetry==='warp'?'warp-colour-and-structure':design.symmetry+'-colour',
  crossing:(end,pick)=>draftCrossing(draft,end,pick+firstPick),
  yarnAt(end,pick){if(!Number.isInteger(end)||end<0||end>=warpEnds||!Number.isInteger(pick)||pick<0||pick>=weftPicks)throw new RangeError('Crossing outside yarn inventory');return dyes[draftCrossing(draft,end,pick+firstPick)?warp.sequence[end]:(motif?motif.map[pick*warpEnds+end]:weft.sequence[pick])].rgb;}
 });
}

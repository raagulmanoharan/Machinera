import {orderColours} from './yarn-contrast.js?v=96';
import {allocateYarns} from './yarn-palette.js?v=96';
import {deriveColourDesign} from './photo-weave-design.js?v=96';
export function createColourDesign(recipe,seed,symmetry='warp',palette){
 const derived=palette?deriveColourDesign(palette):{symmetry:'both',style:recipe?.family==='basket'?'checks':'stripes',repeat:2};
 return {seed,...derived,symmetry:symmetry==='auto'?derived.symmetry:symmetry};
}
export function designYarns(palette,count,design,axis){
 const symmetry=design.symmetry??'warp',mirror=symmetry==='both'||symmetry==='radial'||symmetry===axis,half=mirror?Math.floor(count/2):count;
 const counts=allocateYarns(palette,half),active=palette.map((_,i)=>i).filter(i=>counts[i]>0);
 // Keep the dominant ground and the same accent order in warp and weft.
 // A reversed accent order is a whole-design decision, not per-axis shuffling.
 const order=orderColours(palette,active);
 let motif=mirror?order.slice().reverse():order.slice();if(design.style==='point-repeat'&&!mirror)motif=[...order,...order.slice(1,-1).reverse()];
 if(!mirror&&design.style.startsWith('bordered')&&order.length>1){const bordered=[order.at(-1),...order.slice(0,-1)];motif=[...bordered,...bordered.slice(1,-1).reverse()];};
 // Broad lengthwise ground panels support horizontal bands. Checks share the
 // same ordered colour repeat on both axes. Avoid isolated one-yarn speckling.
 let repeats=design.style==='medallion'?1:axis==='warp'?1:Math.min(2,design.repeat);
 const occurrences=counts.map((_,i)=>motif.filter(c=>c===i).length);
 const supported=Math.min(...active.map(i=>Math.max(1,Math.floor(counts[i]/(2*occurrences[i])))));
 repeats=Math.max(1,Math.min(repeats,supported));
 const plan=Array.from({length:repeats},()=>motif).flat(),seen=counts.map(()=>0),total=counts.map((_,i)=>plan.filter(c=>c===i).length),sequence=[];
 // Distribute each dye lot evenly between its planned bands. Remainder yarns
 // differ by at most one end/pick, keeping integer quotas exact and repeats tidy.
 for(const colour of plan){const occurrence=seen[colour]++,n=Math.floor((occurrence+1)*counts[colour]/total[colour])-Math.floor(occurrence*counts[colour]/total[colour]);for(let k=0;k<n;k++)sequence.push(colour);}
 if(mirror){const complete=[...sequence];if(count%2)complete.push(active[0]);complete.push(...sequence.slice().reverse());return{counts:palette.map((_,i)=>complete.filter(c=>c===i).length),sequence:complete};}
 return{counts,sequence};
}

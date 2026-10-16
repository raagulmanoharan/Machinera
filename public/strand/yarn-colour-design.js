import {allocateYarns} from './yarn-palette.js?v=85';
// A loom plan is made of ordered colour runs. Randomness selects the complete
// repeat, never individual ends/picks or an independent order for each axis.
export function designRandom(seed){let state=seed>>>0;return()=>{state+=0x6D2B79F5;let t=Math.imul(state^state>>>15,1|state);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};}
export function createColourDesign(recipe,seed){
 let identity=2166136261;for(const c of recipe?.id??'plain')identity=Math.imul(identity^c.charCodeAt(0),16777619);
 seed=(seed^identity)>>>0;const random=designRandom(seed),family=recipe?.family??'plain';
 const choices=family==='basket'?['checks','bordered-checks']:family==='rib'?['stripes','bordered-stripes']:family.includes('point')?['point-repeat','checks']:family.includes('twill')?['checks','point-repeat','stripes']:['stripes','checks'];
 return {seed,style:choices[Math.floor(random()*choices.length)],repeat:2+Math.floor(random()*2),reverse:random()<.5};
}
export function designYarns(palette,count,design,axis){
 const mirror=axis==='warp',half=mirror?Math.floor(count/2):count;
 const counts=allocateYarns(palette,half),active=palette.map((_,i)=>i).filter(i=>counts[i]>0);
 // Keep the dominant ground and the same accent order in warp and weft.
 // A reversed accent order is a whole-design decision, not per-axis shuffling.
 const accents=active.slice(1);if(design.reverse)accents.reverse();const order=[active[0],...accents];
 let motif=order.slice();if(design.style==='point-repeat')motif=[...order,...order.slice(1,-1).reverse()];
 if(design.style.startsWith('bordered')&&order.length>1){const bordered=[order.at(-1),...order.slice(0,-1)];motif=[...bordered,...bordered.slice(1,-1).reverse()];};
 const isStripe=design.style.includes('stripes');
 // Broad lengthwise ground panels support horizontal bands. Checks share the
 // same ordered colour repeat on both axes. Avoid isolated one-yarn speckling.
 let repeats=isStripe&&axis==='warp'?1:axis==='warp'?2:design.repeat;
 const occurrences=counts.map((_,i)=>motif.filter(c=>c===i).length);
 const supported=Math.min(...active.map(i=>Math.max(1,Math.floor(counts[i]/(2*occurrences[i])))));
 repeats=Math.max(1,Math.min(repeats,supported));
 const plan=Array.from({length:repeats},()=>motif).flat(),seen=counts.map(()=>0),total=counts.map((_,i)=>plan.filter(c=>c===i).length),sequence=[];
 // Distribute each dye lot evenly between its planned bands. Remainder yarns
 // differ by at most one end/pick, keeping integer quotas exact and repeats tidy.
 for(const colour of plan){const occurrence=seen[colour]++,n=Math.floor((occurrence+1)*counts[colour]/total[colour])-Math.floor(occurrence*counts[colour]/total[colour]);for(let k=0;k<n;k++)sequence.push(colour);}
 if(mirror){const complete=[...sequence];if(count%2)complete.push(0);complete.push(...sequence.slice().reverse());return{counts:palette.map((_,i)=>complete.filter(c=>c===i).length),sequence:complete};}
 return{counts,sequence};
}
export function freshDesignSeed(){const bits=new Uint32Array(1);globalThis.crypto.getRandomValues(bits);return bits[0];}

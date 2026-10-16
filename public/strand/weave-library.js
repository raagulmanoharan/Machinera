import {geometricDrafts} from './geometric-drafts.js?v=105';
import {generatedDraftCatalogue,compileLoomDraft} from './loom-draft.js?v=105';
// Independently constructed loom drafts, studied against the public drawdowns
// and structural metadata in Handweaving.net's Glossary, Twills and Satins.
// Each recipe records threading, treadling and tie-up; no thumbnail is a texture.
const seq=n=>Array.from({length:n},(_,i)=>i),mod=(x,n)=>((x%n)+n)%n;
function draft(id,name,shafts,threading,treadling,lifts,family){
 const tieUp=Array.from({length:shafts},(_,t)=>seq(shafts).map(s=>lifts[mod(s+t,shafts)]===1));
 return Object.freeze({...compileLoomDraft({id,name,family,shafts,threading,treadling,tieUp}),generated:false});
}
const point=[0,1,2,3,2,1],reverse=[0,1,2,3,3,2,1,0];
const baseDrafts=[
 draft('tabby','Plain weave',2,[0,1],[0,1],[1,0],'plain'),
 draft('twill-22','2/2 twill',4,seq(4),seq(4),[1,1,0,0],'twill'),
 draft('basket-22','2×2 basket',2,[0,0,1,1],[0,0,1,1],[1,0],'basket'),
 draft('diamond-4','Point diamond',4,point,point,[1,1,0,0],'point twill'),
 draft('rib-21','2×1 rib',2,[0,0,1,1],[0,1],[1,0],'rib'),
 draft('rib-12','1×2 rib',2,[0,1],[0,0,1,1],[1,0],'rib'),
 draft('basket-33','3×3 basket',2,[0,0,0,1,1,1],[0,0,0,1,1,1],[1,0],'basket'),
 draft('basket-23','2×3 basket',2,[0,0,1,1],[0,0,0,1,1,1],[1,0],'basket'),
 draft('twill-12','1/2 twill',3,seq(3),seq(3),[1,0,0],'twill'),
 draft('twill-21','2/1 twill',3,seq(3),seq(3),[1,1,0],'twill'),
 draft('twill-13','1/3 twill',4,seq(4),seq(4),[1,0,0,0],'twill'),
 draft('twill-31','3/1 twill',4,seq(4),seq(4),[1,1,1,0],'twill'),
 draft('twill-33','3/3 twill',6,seq(6),seq(6),[1,1,1,0,0,0],'twill'),
 draft('twill-24','2/4 twill',6,seq(6),seq(6),[1,1,0,0,0,0],'twill'),
 draft('chevron-4','Point chevron',4,point,seq(4),[1,1,0,0],'point twill'),
 draft('herringbone-4','Herringbone',4,reverse,seq(4),[1,1,0,0],'broken twill'),
 draft('broken-4','Broken 2/2 twill',4,[0,1,3,2],seq(4),[1,1,0,0],'broken twill'),
 draft('twill-44','4/4 twill',8,seq(8),seq(8),[1,1,1,1,0,0,0,0],'twill'),
 draft('compound-8','Compound eight-shaft twill',8,seq(8),seq(8),[1,1,0,1,0,0,1,0],'compound twill'),
 draft('satin-5','Five-end satin',5,seq(5),[0,2,4,1,3],[0,1,1,1,1],'satin'),
 draft('sateen-5','Five-end sateen',5,seq(5),[0,2,4,1,3],[1,0,0,0,0],'satin'),
 draft('satin-8','Eight-end satin',8,seq(8),[0,3,6,1,4,7,2,5],[0,1,1,1,1,1,1,1],'satin'),
 draft('granite-8','Granite study',8,seq(8),[0,3,6,1,4,7,2,5],[1,0,1,0,0,1,1,0],'crepe study'),
 draft('mw-point','M-and-W point twill',4,[0,1,2,3,2,1,2,3,2,1,0,1],[0,1,2,3,2,1,0,1,2,3,2,1],[1,1,0,0],'point twill')
];
export const WEAVE_LIBRARY=Object.freeze([...baseDrafts,...generatedDraftCatalogue(baseDrafts),...geometricDrafts(compileLoomDraft,baseDrafts)]);
export function warpOver(end,pick,type=0){const d=WEAVE_LIBRARY[type]??WEAVE_LIBRARY[0];return Math.floor(d.rows[mod(Math.round(pick),d.height)]/2**mod(Math.round(end),d.width))%2===1;}
// Generate the GPU rules from these exact drawdown bits. A balanced decision
// tree keeps the lookup to at most five pattern decisions, with no extra texture.
const f=n=>n.toFixed(1);
function lookup(d){let expression='0.';for(let y=d.height-1;y>=0;y--)expression=`row<${f(y+.5)}?${f(d.rows[y])}:(${expression})`;return `{float row=mod(pick,${f(d.height)});float mask=${expression};return mod(floor(mask/exp2(mod(end,${f(d.width)}))),2.)>.5?1.:-1.;}`;}
function branch(lo,hi){if(lo===hi)return lookup(WEAVE_LIBRARY[lo]);const mid=(lo+hi)>>1;return `if(type<${f(mid+.5)}){${branch(lo,mid)}}else{${branch(mid+1,hi)}}`;}
export const draftGLSL=`float warpCrossing(float end,float pick,float type){end=floor(end+.5);pick=floor(pick+.5);${branch(0,WEAVE_LIBRARY.length-1)}}\n`;

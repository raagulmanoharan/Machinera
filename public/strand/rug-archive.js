import {draftCrossing} from './photo-draft.js?v=156';
import {createWeavePattern} from './weaving-patterns.js?v=196';
import {transitionPick,THREAD_PITCH} from './weave-transition.js?v=156';
import {PICKS_PER_METRE,FABRIC_COLUMNS} from './fabric-coordinates.js?v=156';
import {WARP_ENDS} from './yarn-structure.js?v=156';
import {WEAVE_LIBRARY} from './weave-library.js?v=156';
import {paletteFromColours} from './yarn-palette.js?v=196';
export class RugArchive{
 constructor(){this.entries=[];this.length=0;this.transition=.42;}
 append(input,length=2.4,weave=null,metadata=null){
  const palette=Array.isArray(input)?paletteFromColours(input):input.palette,previous=this.entries.at(-1),end=this.length+length,firstPick=Math.ceil(this.length/THREAD_PITCH),lastPick=Math.floor(end/THREAD_PITCH),pickCount=Math.max(1,lastPick-firstPick+1),recipe=weave===null?null:WEAVE_LIBRARY[weave];
  // Count real warp ends and physical weft picks. Dominant dye lots own the most
  // yarns; complete yarns (not interpolated pixels) form coherent colour blocks.
  const plan=createWeavePattern({draftId:recipe?.id,seed:input.designSeed??(globalThis.crypto?.getRandomValues(new Uint32Array(1))[0]??Math.floor(Math.random()*4294967296)),palette,analysis:input.analysis,warpEnds:WARP_ENDS,weftPicks:pickCount,firstPick,symmetry:input.symmetry??'auto',composition:weave===null,recentFamilies:this.entries.slice(-2).map(e=>e.plan.motif?.family).filter(Boolean)}),{design,warp,weft}=plan;
  weave=plan.draftIndex;
  const entry={plan,design,palette:palette.map(c=>({...c,rgb:c.rgb.slice()})),length,end,weave,metadata,previous,firstPick,warp:warp.sequence,weft:weft.sequence,warpCounts:warp.counts,weftCounts:weft.counts};
  // Tie new warp ends in staggered groups, hiding each splice under tabby
  // weft. This metadata belongs only to this new section; older cloth is fixed.
  if(previous){entry.splices=new Uint16Array(WARP_ENDS);for(let end=0;end<WARP_ENDS;end++){const pair=Math.min(end,WARP_ENDS-1-end);let offset=2+pair%6;while(draftCrossing(WEAVE_LIBRARY[0],end,firstPick+offset))offset++;entry.splices[end]=offset;}entry.bindingPicks=Math.max(...entry.splices)+2;}
  entry.rows=Math.ceil(length*PICKS_PER_METRE)+1;entry.baked=new Uint8Array(entry.rows*FABRIC_COLUMNS*4);entry.drafts=new Uint8Array(entry.rows*4);entry.newYarn=new Uint8Array(entry.rows);
  for(let y=0;y<entry.rows;y++){
   const local=y/(entry.rows-1)*length,q=end-local,join=this.joinAt(entry,q);entry.newYarn[y]=+join.nextColour;const code=join.draft>=256?240:join.draft;entry.drafts.set([code,code,255,255],y*4);
   const loom=join.draft===weave?plan.draft:join.draft===previous?.weave?previous.plan.draft:WEAVE_LIBRARY[join.draft];const owner=join.nextColour?entry:previous,pick=Math.floor(q/THREAD_PITCH+.5);
   for(let x=0;x<FABRIC_COLUMNS;x++){const u=(x+.5)/FABRIC_COLUMNS,weftRGB=this.weftColour(owner,join.nextColour?q:previous.end,u),rgb=draftCrossing(loom,Math.floor(u*WARP_ENDS),pick)?this.warpColour(this.warpOwner(entry,q,Math.floor(u*WARP_ENDS)),u):weftRGB;const at=(y*FABRIC_COLUMNS+x)*4;entry.baked[at]=rgb[0];entry.baked[at+1]=rgb[1];entry.baked[at+2]=rgb[2];entry.baked[at+3]=255;}
  }
  this.entries.push(entry);this.length=end;return entry;
 }
 joinAt(entry,q){if(!entry.previous)return{draft:entry.weave,nextColour:true};if(!entry.splices)return transitionPick(q,entry.previous.end,entry.weave,entry.previous.weave,Math.min(this.transition,entry.length*.3));const offset=Math.floor(q/THREAD_PITCH+.5)-entry.firstPick;if(offset<0)return{draft:entry.previous.weave,nextColour:false};return{draft:offset<entry.bindingPicks?0:entry.weave,nextColour:offset>=2};}
 warpOwner(entry,q,end){if(!entry.previous)return entry;if(entry.splices)return Math.floor(q/THREAD_PITCH+.5)-entry.firstPick>=entry.splices[end]?entry:entry.previous;return entry.newYarn[this.entryRow(entry,entry.end-q)]?entry:entry.previous;}
 restore(snapshots){
  // Restore saved yarn inventories and baked pixels verbatim; never regenerate.
  const entries=[];let length=0;for(const snapshot of snapshots){if(Math.abs(snapshot.end-(length+snapshot.length))>1e-6)throw new Error('Saved cloth sections are out of order');const entry={...snapshot,previous:entries.at(-1)};entries.push(entry);length=entry.end;}
  this.entries=entries;this.length=length;return this;
 }
 locateMaterial(q){q=Math.max(0,Math.min(this.length,q));let lo=0,hi=this.entries.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(this.entries[mid].end<q)lo=mid+1;else hi=mid;}const entry=this.entries[lo];return entry?{entry,index:lo,local:Math.max(0,Math.min(entry.length,entry.end-q))}:null;}
 locate(distance){return this.locateMaterial(this.length-distance);}
 warpColour(entry,u){const end=Math.max(0,Math.min(WARP_ENDS-1,Math.floor(u*WARP_ENDS)));return entry.palette[entry.warp[end]].rgb;}
 weftColour(entry,q,u=.5){const pick=Math.max(0,Math.min(entry.weft.length-1,Math.floor(q/THREAD_PITCH+.5)-entry.firstPick));const motif=entry.plan.motif,end=Math.max(0,Math.min(WARP_ENDS-1,Math.floor(u*WARP_ENDS)));return entry.palette[motif?motif.map[pick*WARP_ENDS+end]:entry.weft[pick]].rgb;}
 entryRow(entry,local){return Math.max(0,Math.min(entry.rows-1,Math.round(local/entry.length*(entry.rows-1))));}
 materialYarns(q,u=.5){const f=this.locateMaterial(q);if(!f)return{warp:[180,170,150],weft:[180,170,150]};const row=this.entryRow(f.entry,f.local),own=!!f.entry.newYarn[row],owner=own?f.entry:f.entry.previous;return{warp:this.warpColour(this.warpOwner(f.entry,q,Math.max(0,Math.min(WARP_ENDS-1,Math.floor(u*WARP_ENDS)))),u),weft:this.weftColour(owner,own?q:owner.end,u)};}
 entryColour(entry,u,local){const y=this.entryRow(entry,local),x=Math.max(0,Math.min(FABRIC_COLUMNS-1,Math.floor(u*FABRIC_COLUMNS))),a=(y*FABRIC_COLUMNS+x)*4;return Array.from(entry.baked.subarray(a,a+3));}
 sampleMaterial(q,u=.5){const f=this.locateMaterial(q);return f?this.entryColour(f.entry,u,f.local):[180,170,150];}
 sample(distance,u=.5){return this.sampleMaterial(this.length-distance,u);}
 materialDraft(q){const f=this.locateMaterial(q);if(!f)return WEAVE_LIBRARY[0];const row=this.entryRow(f.entry,f.local),code=f.entry.drafts[row*4];return code===240?(f.entry.newYarn[row]?f.entry:f.entry.previous).plan.draft:WEAVE_LIBRARY[code];}
 materialWeave(q){const f=this.locateMaterial(q);if(!f)return[0,0,255,255];const y=this.entryRow(f.entry,f.local);return Array.from(f.entry.drafts.subarray(y*4,y*4+4));}
 sampleWeave(distance){return this.materialWeave(this.length-distance);}
}

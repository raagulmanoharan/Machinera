import {createWeavePattern} from './weaving-patterns.js?v=112';
import {transitionPick,THREAD_PITCH} from './weave-transition.js?v=112';
import {PICKS_PER_METRE,FABRIC_COLUMNS} from './fabric-coordinates.js?v=112';
import {WARP_ENDS} from './yarn-structure.js?v=112';
import {WEAVE_LIBRARY,warpOver} from './weave-library.js?v=112';
import {paletteFromColours} from './yarn-palette.js?v=112';
export class RugArchive{
 constructor(){this.entries=[];this.length=0;this.transition=.42;}
 append(input,length=2.4,weave=null,metadata=null){
  const palette=Array.isArray(input)?paletteFromColours(input):input.palette,previous=this.entries.at(-1),end=this.length+length,firstPick=Math.ceil(this.length/THREAD_PITCH),lastPick=Math.floor(end/THREAD_PITCH),pickCount=Math.max(1,lastPick-firstPick+1),recipe=weave===null?null:WEAVE_LIBRARY[weave];
  // Count real warp ends and physical weft picks. Dominant dye lots own the most
  // yarns; complete yarns (not interpolated pixels) form coherent colour blocks.
  const plan=createWeavePattern({draftId:recipe?.id,seed:input.designSeed,palette,analysis:input.analysis,warpEnds:WARP_ENDS,weftPicks:pickCount,firstPick,symmetry:input.symmetry??'auto'}),{design,warp,weft}=plan;
  weave=plan.draftIndex;
  const entry={plan,design,palette:palette.map(c=>({...c,rgb:c.rgb.slice()})),length,end,weave,metadata,previous,firstPick,warp:warp.sequence,weft:weft.sequence,warpCounts:warp.counts,weftCounts:weft.counts};
  entry.rows=Math.ceil(length*PICKS_PER_METRE)+1;entry.baked=new Uint8Array(entry.rows*FABRIC_COLUMNS*4);entry.drafts=new Uint8Array(entry.rows*4);entry.newYarn=new Uint8Array(entry.rows);
  for(let y=0;y<entry.rows;y++){
   const local=y/(entry.rows-1)*length,q=end-local,join=previous?transitionPick(q,previous.end,weave,previous.weave,Math.min(this.transition,length*.3)):{draft:weave,nextColour:true};entry.newYarn[y]=+join.nextColour;entry.drafts.set([join.draft,join.draft,255,255],y*4);
   const owner=join.nextColour?entry:previous,pick=Math.floor(q/THREAD_PITCH+.5);
   for(let x=0;x<FABRIC_COLUMNS;x++){const u=(x+.5)/FABRIC_COLUMNS,weftRGB=this.weftColour(owner,join.nextColour?q:previous.end,u),rgb=warpOver(Math.floor(u*WARP_ENDS),pick,join.draft)?this.warpColour(owner,u):weftRGB;entry.baked.set([...rgb,255],(y*FABRIC_COLUMNS+x)*4);}
  }
  this.entries.push(entry);this.length=end;return entry;
 }
 locateMaterial(q){q=Math.max(0,Math.min(this.length,q));let lo=0,hi=this.entries.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(this.entries[mid].end<q)lo=mid+1;else hi=mid;}const entry=this.entries[lo];return entry?{entry,index:lo,local:Math.max(0,Math.min(entry.length,entry.end-q))}:null;}
 locate(distance){return this.locateMaterial(this.length-distance);}
 warpColour(entry,u){const end=Math.max(0,Math.min(WARP_ENDS-1,Math.floor(u*WARP_ENDS)));return entry.palette[entry.warp[end]].rgb;}
 weftColour(entry,q,u=.5){const pick=Math.max(0,Math.min(entry.weft.length-1,Math.floor(q/THREAD_PITCH+.5)-entry.firstPick));return entry.palette[entry.weft[pick]].rgb;}
 entryRow(entry,local){return Math.max(0,Math.min(entry.rows-1,Math.round(local/entry.length*(entry.rows-1))));}
 materialYarns(q,u=.5){const f=this.locateMaterial(q);if(!f)return{warp:[180,170,150],weft:[180,170,150]};const row=this.entryRow(f.entry,f.local),own=!!f.entry.newYarn[row],owner=own?f.entry:f.entry.previous;return{warp:this.warpColour(owner,u),weft:this.weftColour(owner,own?q:owner.end,u)};}
 entryColour(entry,u,local){const y=this.entryRow(entry,local),x=Math.max(0,Math.min(FABRIC_COLUMNS-1,Math.floor(u*FABRIC_COLUMNS))),a=(y*FABRIC_COLUMNS+x)*4;return Array.from(entry.baked.subarray(a,a+3));}
 sampleMaterial(q,u=.5){const f=this.locateMaterial(q);return f?this.entryColour(f.entry,u,f.local):[180,170,150];}
 sample(distance,u=.5){return this.sampleMaterial(this.length-distance,u);}
 materialWeave(q){const f=this.locateMaterial(q);if(!f)return[0,0,255,255];const y=this.entryRow(f.entry,f.local);return Array.from(f.entry.drafts.subarray(y*4,y*4+4));}
 sampleWeave(distance){return this.materialWeave(this.length-distance);}
}

import {transitionPick,THREAD_PITCH} from './weave-transition.js?v=81';
import {PICKS_PER_METRE,FABRIC_COLUMNS,motifOffset} from './fabric-coordinates.js?v=81';
export class RugArchive{
 constructor(){this.entries=[];this.length=0;this.transition=.42;}
 append(colours,length=2.4,weave=0,metadata=null){const previous=this.entries.at(-1),entry={colours:colours.map(c=>c.slice()),length,end:this.length+length,weave,metadata};entry.rows=Math.ceil(length*PICKS_PER_METRE)+1;entry.baked=new Uint8Array(entry.rows*FABRIC_COLUMNS*4);entry.drafts=new Uint8Array(entry.rows*4);for(let y=0;y<entry.rows;y++){const local=y/(entry.rows-1)*length,q=entry.end-local,pick=previous?transitionPick(q,previous.end,weave,previous.weave,Math.min(this.transition,length*.3)):{draft:weave,nextColour:true,centre:Math.floor(q/THREAD_PITCH+.5)*THREAD_PITCH};entry.drafts.set([pick.draft,pick.draft,255,255],y*4);for(let x=0;x<FABRIC_COLUMNS;x++){const u=(x+.5)/FABRIC_COLUMNS,rgb=pick.nextColour?this.raw(entry,entry.end-pick.centre+motifOffset(u,pick.centre,weave)):this.entryColour(previous,u,0);entry.baked.set([...rgb.map(Math.round),255],(y*FABRIC_COLUMNS+x)*4);}}this.entries.push(entry);this.length+=length;return entry;}
 locateMaterial(q){q=Math.max(0,Math.min(this.length,q));let lo=0,hi=this.entries.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(this.entries[mid].end<q)lo=mid+1;else hi=mid;}const entry=this.entries[lo];return entry?{entry,index:lo,local:Math.max(0,Math.min(entry.length,entry.end-q))}:null;}
 locate(distance){return this.locateMaterial(this.length-distance);}
 raw(entry,local){const f=Math.max(0,Math.min(1,local/entry.length))*(entry.colours.length-1),a=Math.floor(f),b=Math.min(entry.colours.length-1,a+1),t=f-a;return entry.colours[a].map((c,k)=>c*(1-t)+entry.colours[b][k]*t);}
 entryColour(entry,u,local){const fy=Math.max(0,Math.min(1,local/entry.length))*(entry.rows-1),y=Math.floor(fy),z=Math.min(entry.rows-1,y+1),t=fy-y,x=Math.max(0,Math.min(FABRIC_COLUMNS-1,Math.floor(u*FABRIC_COLUMNS))),a=(y*FABRIC_COLUMNS+x)*4,b=(z*FABRIC_COLUMNS+x)*4;return[0,1,2].map(k=>entry.baked[a+k]*(1-t)+entry.baked[b+k]*t);}
 sampleMaterial(q,u=.5){const f=this.locateMaterial(q);return f?this.entryColour(f.entry,u,f.local):[180,170,150];}
 sample(distance,u=.5){return this.sampleMaterial(this.length-distance,u);}
 materialWeave(q){const f=this.locateMaterial(q);if(!f)return[0,0,255,255];const y=Math.max(0,Math.min(f.entry.rows-1,Math.round(f.local/f.entry.length*(f.entry.rows-1))));return Array.from(f.entry.drafts.subarray(y*4,y*4+4));}
 sampleWeave(distance){return this.materialWeave(this.length-distance);}
 pixels(rows){const out=new Uint8Array(rows*4);for(let y=0;y<rows;y++)out.set([...this.sample(y/Math.max(1,rows-1)*this.length).map(Math.round),255],y*4);return out;}
 weavePixels(rows){const out=new Uint8Array(rows*4);for(let y=0;y<rows;y++)out.set(this.sampleWeave(y/Math.max(1,rows-1)*this.length),y*4);return out;}
}

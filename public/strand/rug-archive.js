// Immutable photo sections: each retains its colour distribution and weave draft.
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export class RugArchive{
 constructor(){this.entries=[];this.length=0;this.transition=.42;}
 append(colours,length=2.4,weave=0,metadata=null){this.entries.push({colours:colours.map(c=>c.slice()),length,end:this.length+length,weave,metadata});this.length+=length;}
 locate(distance){const d=Math.max(0,Math.min(this.length,distance)),fromStart=this.length-d;let lo=0,hi=this.entries.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(this.entries[mid].end<fromStart)lo=mid+1;else hi=mid;}const entry=this.entries[lo];return entry?{entry,index:lo,local:Math.max(0,Math.min(entry.length,entry.end-fromStart))}:null;}
 raw(entry,local){const f=Math.max(0,Math.min(1,local/entry.length))*(entry.colours.length-1),a=Math.floor(f),b=Math.min(entry.colours.length-1,a+1),t=f-a;return entry.colours[a].map((c,k)=>c*(1-t)+entry.colours[b][k]*t);}
 sample(distance){const found=this.locate(distance);if(!found)return[180,170,150];const {entry,index,local}=found,rgb=this.raw(entry,local);if(!index)return rgb;const blend=smooth((entry.length-local)/Math.min(this.transition,entry.length*.3)),old=this.raw(this.entries[index-1],0);return rgb.map((v,k)=>old[k]*(1-blend)+v*blend);}
 sampleWeave(distance){const found=this.locate(distance);if(!found)return[0,0,255,255];const{entry,index,local}=found,previous=index?this.entries[index-1].weave:entry.weave,blend=index?smooth((entry.length-local)/Math.min(this.transition,entry.length*.3)):1;return[entry.weave,previous,Math.round(blend*255),255];}
 pixels(rows){const out=new Uint8Array(rows*4);for(let y=0;y<rows;y++)out.set([...this.sample(y/Math.max(1,rows-1)*this.length).map(Math.round),255],y*4);return out;}
 weavePixels(rows){const out=new Uint8Array(rows*4);for(let y=0;y<rows;y++)out.set(this.sampleWeave(y/Math.max(1,rows-1)*this.length),y*4);return out;}
}

// Store palettes, never source photographs. Growth does not resample old photos.
export class RugArchive{
 constructor(){this.entries=[];this.length=0;}
 append(colours,length=2.4){this.entries.push({colours:colours.map(c=>c.slice()),length,end:this.length+length});this.length+=length;}
 sample(distance){const fromStart=this.length-Math.max(0,Math.min(this.length,distance));let lo=0,hi=this.entries.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(this.entries[mid].end<fromStart)lo=mid+1;else hi=mid;}const e=this.entries[lo];if(!e)return[180,170,150];const local=Math.max(0,Math.min(1,(e.end-fromStart)/e.length)),f=local*(e.colours.length-1),a=Math.floor(f),b=Math.min(e.colours.length-1,a+1),t=f-a;return e.colours[a].map((c,k)=>c*(1-t)+e.colours[b][k]*t);}
 pixels(rows){const out=new Uint8Array(rows*4);for(let y=0;y<rows;y++){const c=this.sample(y/(rows-1)*this.length);out.set([...c.map(Math.round),255],y*4);}return out;}
}

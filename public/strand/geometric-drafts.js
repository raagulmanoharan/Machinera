// Original bounded-float geometric lift plans, inspired by block-woven motifs.
// Every column is threaded on its own shaft; the tie-up is the actual lift grid.
export function geometricDrafts(compile,existing=[]){
 const signature=d=>Array.from({length:48},(_,y)=>Array.from({length:48},(_,x)=>Math.floor(d.rows[y%d.height]/2**(x%d.width))%2).join('')).join(''),seen=new Set(existing.map(signature));
 const motifs=[
 ['diamond-rings',(x,y)=>Math.floor((x+y)/2)%2===0],
 ['stepped-cross',(x,y)=>Math.min(x,y)<2&&Math.max(x,y)>3],
 ['nested-squares',(x,y)=>Math.floor(Math.max(x,y)/2)%2===0],
 ['diamond-eye',(x,y)=>x+y<6&&x+y>2],
 ['hourglass',(x,y)=>x<=y],
 ['stepped-chevron',(x,y)=>Math.abs(x-y)<2],
 ['four-petals',(x,y)=>((x-3)**2+(y-3)**2)<7],
 ['window-grid',(x,y)=>x<2||y<2||x>5||y>5],
 ['cross-medallion',(x,y)=>x<2||y<2],
 ['offset-steps',(x,y)=>Math.floor(x/2)%2===Math.floor(y/2)%2],
 ['diamond-lattice',(x,y)=>(x+y)%6<3],
 ['corner-diamonds',(x,y)=>Math.abs(x-4)+Math.abs(y-4)<4]
 ];
 const result=[];for(const [name,motif] of motifs){const n=16,seq=Array.from({length:n},(_,i)=>i),tieUp=seq.map(y=>seq.map(x=>{const sx=Math.min(x,15-x),sy=Math.min(y,15-y),phase=(sx+sy)%4;return phase===0?false:phase===2?true:motif(sx,sy);}));
 try{const draft=compile({id:'geo-'+name,name:name.split('-').map(w=>w[0].toUpperCase()+w.slice(1)).join(' '),family:'geometric',shafts:n,threading:seq,treadling:seq,tieUp});const key=signature(draft);if(!seen.has(key)){seen.add(key);result.push(draft);}}catch(error){if(!(error instanceof RangeError))throw error;}}
 return result;
}

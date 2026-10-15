// Preserve the authored yarn layout while making every reused tile periodic.
// A non-integer ply rotation across the tile leaves open, misaligned yarn ends.
export function repairWeaveGeometry(geometry,warp,pitch=.016){
 const p=geometry.attributes.position,uv=geometry.attributes.uv,verticesPerPly=81*6,length=pitch*8,radius=pitch*(warp?.28:.47),cycles=Math.round(length/radius*1.15/(Math.PI*2));
 if(p.count!==24*verticesPerPly||!uv)throw Error('Unexpected authored weave topology');
 const ends=[];let maximumGap=0;
 for(let ply=0;ply<24;ply++){
  const base=ply*verticesPerPly,strand=Math.floor(ply/3),across=strand*pitch,lookup=new Map();
  for(let i=base;i<base+verticesPerPly;i++){const ring=Math.round(uv.getX(i)*80),side=Math.round((1-uv.getY(i))*6)%6;lookup.set(ring*6+side,i);}
  const first=lookup.get(0),offset=(warp?p.getX(first):p.getY(first))-across,baseHeight=Math.cos(Math.PI*(-.5+strand))*pitch*.32*(warp?-1:1),phase=Math.atan2((p.getZ(first)-baseHeight)/(radius*.72*.42),(offset/radius-.57)/.42);
  for(let i=base;i<base+verticesPerPly;i++){const t=uv.getX(i),side=Math.round((1-uv.getY(i))*6)%6,angle=side/6*Math.PI*2,turn=phase+t*cycles*Math.PI*2,along=(t*8-.5)*pitch,displacement=radius*(.42*Math.cos(turn)+.57*Math.cos(angle)),height=Math.cos(Math.PI*(t*8-.5+strand))*pitch*.32*(warp?-1:1)+radius*.72*(.42*Math.sin(turn)+.57*Math.sin(angle));p.setXYZ(i,warp?across+displacement:along,warp?along:across+displacement,height);}
  for(let side=0;side<6;side++){const a=lookup.get(side),b=lookup.get(80*6+side);ends.push([a,b]);maximumGap=Math.max(maximumGap,Math.hypot(p.getX(b)-p.getX(a)-(warp?0:length),p.getY(b)-p.getY(a)-(warp?length:0),p.getZ(b)-p.getZ(a)));}
 }
 geometry.computeVertexNormals();const n=geometry.attributes.normal;
 for(const[a,b]of ends){const x=n.getX(a)+n.getX(b),y=n.getY(a)+n.getY(b),z=n.getZ(a)+n.getZ(b),length=Math.hypot(x,y,z)||1;n.setXYZ(a,x/length,y/length,z/length);n.setXYZ(b,x/length,y/length,z/length);}
 p.needsUpdate=n.needsUpdate=true;geometry.computeBoundingSphere();
 if(maximumGap>1e-6)throw Error('The weave tile contains disconnected yarn boundaries');
 return maximumGap;
}

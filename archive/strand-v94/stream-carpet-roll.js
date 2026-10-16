import * as T from 'three';
import {wovenSurfaceGLSL} from './stream-weave-shader.js?v=55';
// A bounded, guided winding animation: physics for the loose sheet remains
// separate from storage, so rolling many metres cannot explode contact cost.
export class CarpetRoll{
 constructor(cloth){
  this.time=0;this.done=false;this.width=cloth.sim.width;this.length=cloth.totalLength;this.radius=Math.min(.48,Math.sqrt(.055**2+this.length*.012/Math.PI));const base=cloth.rolls.reduce((z,r)=>Math.max(z,r.center.z+r.radius),.025);this.center=new T.Vector3(0,-.83,base+this.radius);this.offset=0;this.velocity=0;
  const positions=[],colours=[],distances=[],indices=[],p=cloth.display,nx=cloth.sim.nx,ny=cloth.sim.ny,live=cloth.sim.renderLength??cloth.sim.length;
  const ctx=cloth.history.getContext('2d',{willReadFrequently:true}),pixels=ctx.getImageData(0,0,1,cloth.history.height).data,color=new T.Color();
  const dye=(data,index)=>{color.setRGB(data[index]/255,data[index+1]/255,data[index+2]/255,T.SRGBColorSpace);colours.push(color.r,color.g,color.b);};
  for(let y=0;y<ny;y++){const s=y/(ny-1)*live,row=Math.max(0,Math.min(cloth.history.height-1,Math.floor((1-s/cloth.historyLength)*cloth.history.height)));for(let x=0;x<nx;x++){const j=(y*nx+x)*3;positions.push(p[j],p[j+1],p[j+2]);distances.push(s);dye(pixels,row*4);}}
  const addGrid=(start,rows)=>{for(let y=0;y<rows-1;y++)for(let x=0;x<nx-1;x++){const a=start+y*nx+x;indices.push(a,a+nx,a+1,a+nx,a+nx+1,a+1);}};addGrid(0,ny);
  const pile=cloth.pile,g=pile.geometry,pa=g.attributes.position?.array;
  if(pa){const base=positions.length/3;for(let i=0;i<pile.vertexCount;i++){positions.push(pa[i*3],pa[i*3+1],pa[i*3+2]);const layer=g.attributes.pileLayer.array[i],v=g.attributes.uv.array[i*2+1],len=g.attributes.pileLength.array[i];let before=0;for(let k=layer+1;k<pile.count;k++)before+=pile.sectionLengths[k];distances.push(live+before+v*len);dye(pile.colours,(Math.min(255,Math.round(v*255))*pile.layers+layer)*4);}for(let i=0;i<pile.indexCount;i++)indices.push(base+g.index.array[i]);}
  this.source=new Float32Array(positions);this.distances=new Float32Array(distances);const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colours,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(distances.flatMap((s,i)=>[positions[i*3]/this.width+.5,s]),2));geometry.setIndex(indices);geometry.computeVertexNormals();
  this.material=new T.MeshStandardMaterial({vertexColors:true,roughness:1,side:T.DoubleSide});this.material.onBeforeCompile=shader=>{shader.vertexShader='varying vec2 rollUV;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nrollUV=uv;');shader.fragmentShader='varying vec2 rollUV;\n'+wovenSurfaceGLSL+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nvec2 fabric=wovenSurface(vec2(rollUV.x*80.,rollUV.y*52.08333));diffuseColor.rgb*=fabric.y;');shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nvec3 q0=dFdx(-vViewPosition),q1=dFdy(-vViewPosition),r1=cross(q1,normal),r2=cross(normal,q0);float det=dot(q0,r1);normal=normalize(abs(det)*normal-sign(det)*(dFdx(fabric.x)*r1+dFdy(fabric.x)*r2));');};this.material.customProgramCacheKey=()=> 'stored-carpet-roll56';
  this.mesh=new T.Mesh(geometry,this.material);this.mesh.castShadow=this.mesh.receiveShadow=true;this.mesh.frustumCulled=false;cloth.scene.add(this.mesh);this.scene=cloth.scene;
  // Retain only a strip of palette data for the exposed outer winding.
  this.outer=[];for(let y=0;y<ny;y++)this.outer.push(colours.slice(y*nx*3,y*nx*3+3));
 }
 update(dt){dt=Math.min(dt,.05);if(this.done){if(Math.abs(this.velocity)<.00002&&Math.abs(this.offset)<.00002)return false;this.velocity=(-this.offset*25*dt+this.velocity)*Math.exp(-7*dt);this.offset+=this.velocity*dt;this.mesh.position.y=this.center.y+this.offset;this.mesh.rotation.x=-this.offset/this.radius;return true;}
  this.time+=dt;const t=Math.min(1,this.time/2.5),ease=t*t*(3-2*t),p=this.mesh.geometry.attributes.position.array;
  for(let i=0;i<this.distances.length;i++){const s=this.distances[i],r=Math.sqrt(.055**2+Math.max(0,this.length-s)*.012/Math.PI),angle=(this.radius-r)*Math.PI*2/.012,rr=Math.min(this.radius,r),j=i*3;const x=this.source[j]+.08*Math.sin(Math.PI*t),y=this.center.y+Math.sin(angle)*rr,z=this.center.z+Math.cos(angle)*rr;p[j]=T.MathUtils.lerp(this.source[j],x,ease);p[j+1]=T.MathUtils.lerp(this.source[j+1],y,ease);p[j+2]=Math.max(.025,T.MathUtils.lerp(this.source[j+2],z,ease)-.16*Math.sin(Math.PI*t));}
  this.mesh.geometry.attributes.position.needsUpdate=true;this.mesh.geometry.computeVertexNormals();this.mesh.geometry.boundingSphere=null;
  if(t===1){this.done=true;this.finish();}return true;
 }
 finish(){
  const rings=96,across=16,geometry=new T.CylinderGeometry(this.radius,this.radius,this.width,rings,across,false);geometry.rotateZ(Math.PI/2);const p=geometry.attributes.position,uv=geometry.attributes.uv,colours=[];for(let i=0;i<p.count;i++){const angle=(Math.atan2(p.getY(i),p.getZ(i))+Math.PI*2)%(Math.PI*2),s=angle*this.radius,index=Math.min(this.outer.length-1,Math.round(s/this.length*(this.outer.length-1))),c=this.outer[index];colours.push(...c);uv.setXY(i,p.getX(i)/this.width+.5,s);}geometry.setAttribute('color',new T.Float32BufferAttribute(colours,3));this.mesh.geometry.dispose();this.mesh.geometry=geometry;this.mesh.position.copy(this.center);this.source=null;this.distances=null;
  // Concentric yarn edges make the ends read as tightly wound cloth.
  const lines=[];for(let end of [-1,1]){for(let k=0;k<12;k++){const r=.055+(this.radius-.055)*k/11;for(let a=0;a<64;a++){const u=a/64*Math.PI*2,v=(a+1)/64*Math.PI*2;lines.push(end*(this.width/2+.001),Math.sin(u)*r,Math.cos(u)*r,end*(this.width/2+.001),Math.sin(v)*r,Math.cos(v)*r);}}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(lines,3));const edges=new T.LineSegments(g,new T.LineBasicMaterial({color:'#584d3d',transparent:true,opacity:.32}));this.mesh.add(edges);
 }
 addCollider(field){for(let y=0;y<field.height;y++){const py=field.minY+y/(field.height-1)*(field.maxY-field.minY),dy=py-this.center.y;if(Math.abs(dy)>this.radius)continue;const height=this.center.z+Math.sqrt(this.radius*this.radius-dy*dy);for(let x=0;x<field.width;x++){const px=field.minX+x/(field.width-1)*(field.maxX-field.minX);if(Math.abs(px)<=this.width/2+.02){const i=y*field.width+x;field.data[i]=Math.max(field.data[i],height);}}}}
 nudge(){this.velocity+=.16;}
}

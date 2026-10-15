import {acceptClothPose} from './stream-intersections.js?v=37';
import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { repairWeaveGeometry } from './weave-model.js?v=27';
import { StreamPhysics } from './stream-physics.js?v=39';
const header=`uniform sampler2D streamPosition;uniform sampler2D streamNormal;uniform sampler2D streamTangent;uniform vec2 streamGrid;uniform float streamLength;
vec2 streamUV(vec3 p){return vec2(p.x/1.536+.5,clamp(-p.z/streamLength,0.,1.));}
vec2 streamTexel(vec2 uv){return(clamp(uv,0.,1.)*(streamGrid-1.)+.5)/streamGrid;}
vec3 streamPoint(vec2 uv){
 vec2 grid=clamp(uv,0.,1.)*(streamGrid-1.),base=min(floor(grid),streamGrid-2.),f=grid-base;
 vec3 b=texture2D(streamPosition,(base+vec2(1.5,.5))/streamGrid).xyz,c=texture2D(streamPosition,(base+vec2(.5,1.5))/streamGrid).xyz;
 if(f.x+f.y<=1.){vec3 a=texture2D(streamPosition,(base+.5)/streamGrid).xyz;return a+(b-a)*f.x+(c-a)*f.y;}
 vec3 d=texture2D(streamPosition,(base+1.5)/streamGrid).xyz;return d+(c-d)*(1.-f.x)+(b-d)*(1.-f.y);
}
vec3 streamN(vec2 uv){return normalize(texture2D(streamNormal,streamTexel(uv)).xyz);}
vec3 streamT(vec2 uv){return normalize(texture2D(streamTangent,streamTexel(uv)).xyz);}
`;
function simplify(source){const p=source.attributes.position,n=source.attributes.normal,uv=source.attributes.uv,pos=[],norm=[],tex=[],idx=[],sides=[0,2,4],stride=8;for(let ply=0;ply<24;ply++){const base=pos.length/3;for(let ring=0;ring<=80;ring+=stride)for(const side of sides){const v=ply*81*6+ring*6+side;pos.push(p.getX(v),p.getY(v),p.getZ(v));norm.push(n.getX(v),n.getY(v),n.getZ(v));tex.push(uv.getX(v),uv.getY(v))}for(let ring=0;ring<80/stride;ring++)for(let side=0;side<3;side++){const a=base+ring*3+side,b=base+ring*3+(side+1)%3;idx.push(a,b,b+3,a,b+3,a+3)}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(norm,3));g.setAttribute('uv',new T.Float32BufferAttribute(tex,2));g.setIndex(idx);return g;}
export class StreamCloth {
 constructor(scene,renderer){this.scene=scene;this.renderer=renderer;this.sim=new StreamPhysics();this.display=new Float32Array(this.sim.positions.length);this.sim.renderSafe=this.sim.positions.slice();this.uniforms={streamGrid:{value:new T.Vector2(this.sim.nx,this.sim.ny)},streamLength:{value:this.sim.length}};this.meshes=[];this.version=0;
  for(const name of ['Position','Normal','Tangent']){const tex=new T.DataTexture(new Float32Array(this.sim.nx*this.sim.ny*4),this.sim.nx,this.sim.ny,T.RGBAFormat,T.FloatType);tex.minFilter=tex.magFilter=renderer.extensions.has('OES_texture_float_linear')?T.LinearFilter:T.NearestFilter;tex.needsUpdate=true;this.uniforms['stream'+name]={value:tex};}
  const geometry=new T.PlaneGeometry(1.536,1,this.sim.nx-1,this.sim.ny-1);for(let i=0;i<geometry.attributes.uv.count;i++)geometry.attributes.uv.setY(i,1-geometry.attributes.uv.getY(i));this.hit=new T.Mesh(geometry,new T.MeshBasicMaterial({colorWrite:false,depthWrite:false,side:T.DoubleSide}));this.hit.castShadow=true;this.hit.material.shadowSide=T.DoubleSide;this.hit.frustumCulled=false;scene.add(this.hit);this.upload();
  this.history=document.createElement('canvas');this.history.width=128;this.history.height=2048;const c=this.history.getContext('2d');const colors=['#38595a','#c8b99a','#b18b35','#c8b99a','#ad503b','#38595a'];for(let i=0;i<24;i++){c.fillStyle=colors[i%6];c.fillRect(0,i*2048/24,128,2048/24+1)}this.historyLength=6.2;this.texture=new T.CanvasTexture(this.history);this.texture.colorSpace=T.SRGBColorSpace;this.texture.anisotropy=4;this.story={streamStory:{value:this.texture},streamHistoryLength:{value:this.historyLength},streamRemaining:{value:0}};
 }
 patch(material,{depth=false}={}){const prev=material.onBeforeCompile;material.onBeforeCompile=shader=>{prev?.(shader);Object.assign(shader.uniforms,this.uniforms,this.story);shader.vertexShader=header+'varying vec2 vStreamStory;\n'+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <defaultnormal_vertex>',`vec3 bindNormal=objectNormal;vec3 bindPoint=position;
 #ifdef USE_INSTANCING
 bindPoint=(instanceMatrix*vec4(bindPoint,1.)).xyz;bindNormal=mat3(instanceMatrix)*bindNormal;
 #endif
 vec2 bindUV=streamUV(bindPoint);vec3 sn=streamN(bindUV),st=streamT(bindUV),sb=normalize(cross(st,sn));vec3 transformedNormal=normalMatrix*(st*bindNormal.x-sn*bindNormal.y-sb*bindNormal.z);
 #ifdef FLIP_SIDED
 transformedNormal=-transformedNormal;
 #endif`);
 shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`vec3 streamRest=transformed;
 #ifdef USE_INSTANCING
 streamRest=(instanceMatrix*vec4(streamRest,1.)).xyz;
 #endif
 vec2 streamBind=streamUV(streamRest);vec3 streamWorld=streamPoint(streamBind)-streamN(streamBind)*streamRest.y;vStreamStory=vec2(streamBind.x,-streamRest.z);
 vec4 mvPosition=modelViewMatrix*vec4(streamWorld,1.);gl_Position=projectionMatrix*mvPosition;`);
 shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','vec4 worldPosition=modelMatrix*vec4(streamWorld,1.);');
 if(!depth){shader.fragmentShader='uniform sampler2D streamStory;uniform float streamLength;uniform float streamHistoryLength;uniform float streamRemaining;varying vec2 vStreamStory;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 if(vStreamStory.y>streamLength)discard;diffuseColor.rgb*=texture2D(streamStory,vec2(clamp(vStreamStory.x,0.,1.),clamp(1.-(vStreamStory.y+streamRemaining)/streamHistoryLength,0.,1.))).rgb;`);}
 };material.customProgramCacheKey=()=>`stream-cloth-${depth}-v34`;}
 async load(surfaces){const gltf=await new GLTFLoader().loadAsync('./assets/blender-poc/weave-tile.gltf?v=13');for(const source of gltf.scene.children){if(!source.isMesh)continue;repairWeaveGeometry(source.geometry,source.name.includes('warp'));source.geometry.scale(1.2,1.2,.936);const mat=new T.MeshStandardMaterial({color:source.name.includes('warp')?'#eeeeee':'#ffffff',side:T.DoubleSide,roughness:1,normalMap:surfaces.wool.nor_gl,normalScale:new T.Vector2(.55,.55)});this.patch(mat);const mesh=new T.InstancedMesh(simplify(source.geometry),mat,920);mesh.name='Continuous interlaced '+source.name;mesh.frustumCulled=false;mesh.receiveShadow=true;mesh.castShadow=false;this.scene.add(mesh);this.meshes.push({mesh});source.geometry.dispose();}this.tiles();}
 tiles(camera){let frustum;if(camera){camera.updateMatrixWorld();frustum=new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));}const centre=new T.Vector3(),sphere=new T.Sphere(centre,.23);const rows=Math.ceil(this.sim.length/.1536),q=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),-Math.PI/2),matrix=new T.Matrix4();for(const {mesh} of this.meshes){let i=0;for(let row=0;row<rows;row++)for(let x=0;x<10;x++){if(frustum){this.sample((x+.5)/10,Math.min(1,(row+.5)*.1536/this.sim.length),centre);if(!frustum.intersectsSphere(sphere))continue;}matrix.compose(new T.Vector3((x*8-39.5)*.0192,0,-row*.1536),q,new T.Vector3(1,1,1));mesh.setMatrixAt(i++,matrix);}mesh.count=i;mesh.instanceMatrix.needsUpdate=true;}}
 addPhoto(image){const section=1.35,old=document.createElement('canvas');old.width=128;old.height=2048;old.getContext('2d').drawImage(this.history,0,0);const nextLength=this.historyLength+section,px=2048*section/nextLength,c=this.history.getContext('2d');c.clearRect(0,0,128,2048);c.drawImage(old,0,px,128,2048-px);
  // Colour field retains spatial colour variation, with no six-swatch quantisation.
  const field=document.createElement('canvas');field.width=32;field.height=96;field.getContext('2d').drawImage(image,0,0,32,96);c.save();c.beginPath();c.rect(0,0,128,px+1);c.clip();c.filter='blur(6px)';c.drawImage(field,-16,-12,160,px+24);c.restore();
  // Feather the join into the existing cloth instead of making a new sheet.
  const band=Math.min(24,px*.25),newPixels=c.getImageData(0,Math.max(0,Math.floor(px-band)),128,Math.ceil(band*2)),data=newPixels.data;for(let y=0;y<newPixels.height;y++){const t=y/(newPixels.height-1),a=t*t*(3-2*t);for(let x=0;x<128;x++)for(let k=0;k<3;k++){const i=(y*128+x)*4+k,top=(x)*4+k,bottom=((newPixels.height-1)*128+x)*4+k;data[i]=data[top]*(1-a)+data[bottom]*a;}}c.putImageData(newPixels,0,Math.max(0,Math.floor(px-band)));
  this.historyLength=nextLength;this.story.streamHistoryLength.value=nextLength;this.texture.needsUpdate=true;this.story.streamRemaining.value=section;this.print={time:0,duration:4,from:this.sim.length,to:Math.min(14,this.sim.length+section),section};this.sim.feed=1;this.sim.active=true;this.version++;
 }
 upload(){const p=this.display,alpha=this.sim.active?Math.min(1,this.sim.accumulator*90):1;for(let i=0;i<p.length;i++)p[i]=this.sim.previous[i]+(this.sim.positions[i]-this.sim.previous[i])*alpha;acceptClothPose(this.sim,p);const {nx,ny}=this.sim,pos=this.uniforms.streamPosition.value.image.data,norm=this.uniforms.streamNormal.value.image.data,tan=this.uniforms.streamTangent.value.image.data,g=this.hit.geometry;for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){const i=y*nx+x,j=i*3,k=i*4,l=(y*nx+Math.max(0,x-1))*3,r=(y*nx+Math.min(nx-1,x+1))*3,a=(Math.max(0,y-1)*nx+x)*3,b=(Math.min(ny-1,y+1)*nx+x)*3,ux=p[r]-p[l],uy=p[r+1]-p[l+1],uz=p[r+2]-p[l+2],vx=p[b]-p[a],vy=p[b+1]-p[a+1],vz=p[b+2]-p[a+2],cx=vy*uz-vz*uy,cy=vz*ux-vx*uz,cz=vx*uy-vy*ux,ni=1/(Math.hypot(cx,cy,cz)||1),ti=1/(Math.hypot(ux,uy,uz)||1);pos.set([p[j],p[j+1],p[j+2],1],k);norm.set([cx*ni,cy*ni,cz*ni,1],k);tan.set([ux*ti,uy*ti,uz*ti,1],k);g.attributes.position.setXYZ(i,p[j],p[j+1],p[j+2]);g.attributes.normal.setXYZ(i,cx*ni,cy*ni,cz*ni);}for(const name of ['Position','Normal','Tangent'])this.uniforms['stream'+name].value.needsUpdate=true;g.attributes.position.needsUpdate=g.attributes.normal.needsUpdate=true;g.computeBoundingSphere();}
 sample(u,v,out){const{nx,ny}=this.sim,p=this.display,x=T.MathUtils.clamp(u*(nx-1),0,nx-1),y=T.MathUtils.clamp(v*(ny-1),0,ny-1),a=Math.floor(x),b=Math.floor(y),xx=Math.min(nx-1,a+1),yy=Math.min(ny-1,b+1),fx=x-a,fy=y-b;for(let c=0;c<3;c++)out.setComponent(c,(p[(b*nx+a)*3+c]*(1-fx)+p[(b*nx+xx)*3+c]*fx)*(1-fy)+(p[(yy*nx+a)*3+c]*(1-fx)+p[(yy*nx+xx)*3+c]*fx)*fy);return out;}
 settle(steps){for(let i=0;i<steps;i++){this.sim.step();if(i%2===1){this.display.set(this.sim.positions);acceptClothPose(this.sim,this.display);}}this.upload();}
 update(dt,distance=8,camera){let feeding=false;if(this.print){const f=this.print;f.time+=dt;const t=Math.min(1,f.time/f.duration),ease=t*t*(3-2*t);this.sim.setLength(f.from+(f.to-f.from)*ease);this.story.streamRemaining.value=f.section*(1-ease);this.uniforms.streamLength.value=this.sim.length;feeding=true;if(t>=1){this.print=null;this.sim.feed=0;}}
 const changed=this.sim.advance(dt);if(changed||feeding)this.upload();this.tiles(camera);return changed||feeding;}
}

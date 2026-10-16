import {yarnPhase,YARN_TILE} from './fabric-coordinates.js?v=68';
import {wovenSurfaceGLSL} from './stream-weave-shader.js?v=67';
import {applyMatteTextile} from './matte-textile.js?v=64';
import {textileAOGLSL} from './textile-ambient-occlusion.js?v=60';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {repairWeaveGeometry} from './weave-model.js?v=27';
const header=`uniform sampler2D yarnPosition;uniform sampler2D yarnNormal;uniform sampler2D yarnTangent;uniform vec2 yarnGrid;uniform float streamLength;
vec2 yarnUV(vec3 p){return vec2(p.x/1.536+.5,clamp(-p.z/streamLength,0.,1.));}
vec2 yarnTexel(vec2 uv){return(clamp(uv,0.,1.)*(yarnGrid-1.)+.5)/yarnGrid;}
vec3 yarnPoint(vec2 uv){vec2 g=clamp(uv,0.,1.)*(yarnGrid-1.),b=min(floor(g),yarnGrid-2.),f=g-b;vec3 q=texture2D(yarnPosition,(b+vec2(1.5,.5))/yarnGrid).xyz,r=texture2D(yarnPosition,(b+vec2(.5,1.5))/yarnGrid).xyz;if(f.x+f.y<=1.){vec3 p=texture2D(yarnPosition,(b+.5)/yarnGrid).xyz;return p+(q-p)*f.x+(r-p)*f.y;}vec3 p=texture2D(yarnPosition,(b+1.5)/yarnGrid).xyz;return p+(r-p)*(1.-f.x)+(q-p)*(1.-f.y);}
vec3 yarnN(vec2 uv){return normalize(texture2D(yarnNormal,yarnTexel(uv)).xyz);}vec3 yarnT(vec2 uv){return normalize(texture2D(yarnTangent,yarnTexel(uv)).xyz);}
`;
// Six-sided yarns, five curve samples per crossing. Four crossing profiles share
// the same topology, so transitions alter actual relief without rebuilding meshes.
function yarnGeometry(source,warp,sides=6){
 const p=source.attributes.position,pos=[],norm=[],uv=[],idx=[],radials=[];
 for(let strand=0;strand<8;strand++){
  const base=pos.length/3,centres=[];
  for(let ring=0;ring<=80;ring+=2){const c=[0,0,0];for(let ply=0;ply<3;ply++)for(let side=0;side<6;side++){const i=(strand*3+ply)*81*6+ring*6+side;c[0]+=p.getX(i)/18;c[1]+=p.getY(i)/18;}centres.push(c);}
  for(let ring=0;ring<centres.length;ring++){
   const c=centres[ring],along=c[warp?1:0]/.0192;
   for(let side=0;side<sides;side++){const angle=side/sides*Math.PI*2,across=Math.cos(angle),up=Math.sin(angle),irregular=1+.04*Math.sin(ring/40*Math.PI*16+strand*2.7)+.02*Math.sin(ring/40*Math.PI*48+side*1.7);pos.push(c[0]+(warp?across*.0085*irregular:0),c[1]+(warp?0:across*.0085*irregular),up*.004*irregular);norm.push(warp?across:0,warp?0:across,up);uv.push(ring/40,side/sides);radials.push(across,up,warp?1:0);}
  }
  for(let ring=0;ring<40;ring++)for(let side=0;side<sides;side++){const a=base+ring*sides+side,b=base+ring*sides+(side+1)%sides;idx.push(a,b,b+sides,a,b+sides,a+sides);}
 }
 const g=new T.BufferGeometry();for(const [name,data,size] of [['position',pos,3],['normal',norm,3],['uv',uv,2],['yarnRadial',radials,3]])g.setAttribute(name,new T.Float32BufferAttribute(data,size));g.setIndex(idx);return g;
}
const sectionGLSL=`
attribute vec3 yarnRadial;
uniform sampler2D streamWeave;uniform float streamHistoryLength;uniform float streamRemaining;uniform float streamHead;uniform float streamAtlasBase;
float draftAtPick(float pick){float q=pick*.0192;return floor(texture2D(streamWeave,vec2(.5,clamp((q-streamAtlasBase)/streamHistoryLength,0.,1.))).r*255.+.5);}
float warpCrossing(float x,float pick,float type){if(type>2.5)return mod(x+abs(mod(pick,8.)-4.),4.)<2.?1.:-1.;if(type>1.5)return mod(floor(x/2.)+floor(pick/2.),2.)<1.?1.:-1.;if(type>.5)return mod(x+pick,4.)<2.?1.:-1.;return mod(x+pick,2.)<1.?1.:-1.;}
vec2 yarnCrossings(){vec3 at=position;
#ifdef USE_INSTANCING
at=(instanceMatrix*vec4(at,1.)).xyz;
#endif
vec2 grid=vec2(at.x/.0192+39.5,(streamHead+at.z)/.0192);bool warp=yarnRadial.z>.5;float along=warp?grid.y:grid.x,a=floor(along),t=fract(along),fixedCell=floor((warp?grid.x:grid.y)+.5);float p0=warp?a:fixedCell,p1=warp?a+1.:fixedCell;float h0=warpCrossing(warp?fixedCell:a,p0,draftAtPick(p0))*.0065*(warp?1.:-1.);float h1=warpCrossing(warp?fixedCell:a+1.,p1,draftAtPick(p1))*.0065*(warp?1.:-1.);float ease=.5-.5*cos(t*3.14159265);float slope=(h1-h0)*1.57079633*sin(t*3.14159265)/.0192*(warp?-1.:1.);return vec2(mix(h0,h1,ease),slope);}
`;
export async function addRaisedYarn(cloth){const {nx,ny}=cloth.renderGrid,uniforms={yarnGrid:{value:new T.Vector2(nx,ny)}};for(const name of ['Position','Normal','Tangent']){const half=name!=='Position',tex=new T.DataTexture(half?new Uint16Array(nx*ny*4):new Float32Array(nx*ny*4),nx,ny,T.RGBAFormat,half?T.HalfFloatType:T.FloatType);tex.minFilter=tex.magFilter=half?T.LinearFilter:T.NearestFilter;uniforms['yarn'+name]={value:tex};}const fibreMap=await new T.TextureLoader().loadAsync('./assets/yarn/wool-normal-256.png');fibreMap.wrapS=fibreMap.wrapT=T.RepeatWrapping;fibreMap.anisotropy=4;const sides=6;const meshes=[],gltf=await new GLTFLoader().loadAsync('./assets/blender-poc/weave-tile.gltf?v=13');
 for(const source of gltf.scene.children){if(!source.isMesh)continue;repairWeaveGeometry(source.geometry,source.name.includes('warp'));source.geometry.scale(1.2,1.2,.936);const material=new T.MeshStandardMaterial({color:'#ffffff',roughness:1,normalMap:fibreMap,normalScale:new T.Vector2(.14,.14),side:T.DoubleSide});material.onBeforeCompile=shader=>{Object.assign(shader.uniforms,uniforms,cloth.story,cloth.uniforms);shader.vertexShader=header+sectionGLSL+'varying float yarnHeight;varying vec2 vYarnStory;varying vec2 vYarnFiber;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>',`vec2 crossing=yarnCrossings();float yarnRelief=crossing.x,yarnSlope=crossing.y;float radialAcross=yarnRadial.x/.0085,radialUp=yarnRadial.y/.004;vec3 objectNormal=normalize(yarnRadial.z>.5?vec3(radialAcross,-radialUp*yarnSlope,radialUp):vec3(-radialUp*yarnSlope,radialAcross,radialUp));`);shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','vec3 transformed=position;transformed.z+=yarnRelief;');shader.vertexShader=shader.vertexShader.replace('#include <defaultnormal_vertex>',`vec3 bn=objectNormal,bp=position;
#ifdef USE_INSTANCING
bp=(instanceMatrix*vec4(bp,1.)).xyz;bn=mat3(instanceMatrix)*bn;
#endif
vec2 bu=yarnUV(bp);vec3 yn=yarnN(bu),yt=yarnT(bu),yb=normalize(cross(yt,yn));vec3 transformedNormal=normalMatrix*(yt*bn.x+yn*bn.y-yb*bn.z);
#ifdef FLIP_SIDED
transformedNormal=-transformedNormal;
#endif`);shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`vec3 rp=transformed;
#ifdef USE_INSTANCING
rp=(instanceMatrix*vec4(rp,1.)).xyz;
#endif
vYarnFiber=uv;vec2 yu=yarnUV(rp);vec3 yw=yarnPoint(yu)+yn*(rp.y+.006);vYarnStory=vec2(yu.x,-rp.z);yarnHeight=yw.z;vec4 mvPosition=modelViewMatrix*vec4(yw,1.);gl_Position=projectionMatrix*mvPosition;`);shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','vec4 worldPosition=modelMatrix*vec4(yw,1.);');shader.fragmentShader=wovenSurfaceGLSL+textileAOGLSL+'varying float yarnHeight;uniform sampler2D streamStory;uniform sampler2D streamWeave;uniform float streamLength;uniform float streamHistoryLength;uniform float streamRemaining;uniform float streamHead;uniform float streamAtlasBase;varying vec2 vYarnStory;varying vec2 vYarnFiber;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
if(vYarnStory.y>streamLength||vYarnStory.y<0.)discard;float materialQ=streamHead-vYarnStory.y;float materialV=(materialQ-streamAtlasBase)/streamHistoryLength;vec3 dye=texture2D(streamStory,vec2(vYarnStory.x,materialV)).rgb;float dyeLuma=dot(dye,vec3(.2126,.7152,.0722));diffuseColor.rgb*=max(vec3(0.),mix(vec3(dyeLuma),dye,1.18))*1.16;float grainPhase=vYarnStory.x*3600.+materialQ*2400.;float grainVisibility=1.-smoothstep(.7,2.,fwidth(grainPhase));diffuseColor.rgb*=.98+.02*sin(grainPhase)*grainVisibility;`);shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
float plyPhase=vYarnFiber.x*12.+vYarnFiber.y*3.;float plyVisible=1.-smoothstep(.3,.95,fwidth(plyPhase));float plyHeight=sin(plyPhase*6.2831853)*.00065*plyVisible;vec3 plyDx=dFdx(-vViewPosition),plyDy=dFdy(-vViewPosition),plyR1=cross(plyDy,normal),plyR2=cross(normal,plyDx);float plyDet=dot(plyDx,plyR1);normal=normalize(abs(plyDet)*normal-sign(plyDet)*(dFdx(plyHeight)*plyR1+dFdy(plyHeight)*plyR2));`);shader.fragmentShader=shader.fragmentShader.replace('#include <lights_physical_fragment>','#include <lights_physical_fragment>\nmaterial.specularColor=vec3(0.);');shader.fragmentShader=shader.fragmentShader.replace('#include <aomap_fragment>','#include <aomap_fragment>\nfloat yarnAO=weaveAmbientOcclusion(vec2(vYarnStory.x*80.-.5,materialQ*52.08333));reflectedLight.indirectDiffuse*=yarnAO;reflectedLight.indirectSpecular*=yarnAO;');};material.customProgramCacheKey=()=> 'studio-palette-yarn-smooth-v74';applyMatteTextile(material,'vec2(vYarnStory.x*1.536,materialQ)');const geometry=yarnGeometry(source.geometry,source.name.includes('warp'),sides);const mesh=new T.InstancedMesh(geometry,material,920);mesh.frustumCulled=false;mesh.receiveShadow=true;mesh.castShadow=false;cloth.scene.add(mesh);meshes.push(mesh);source.geometry.dispose();}
 const m=new T.Matrix4(),q=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),-Math.PI/2),offset=new T.Vector3(),scale=new T.Vector3(1,1,1);let lastLength=-1,lastMask='',lastPhase=-1;
 const api={feed(){this.update(false);},setWeave(){/* Section recipes are immutable in streamWeave; selection affects new yarn only. */},setVisible(visible){for(const mesh of meshes)mesh.visible=visible;},update(positionsChanged=true){const {nx,ny}=cloth.renderGrid;if(positionsChanged){const p=cloth.renderGrid.positions,pos=uniforms.yarnPosition.value.image.data,nor=uniforms.yarnNormal.value.image.data,tan=uniforms.yarnTangent.value.image.data,n=cloth.surface.geometry.attributes.normal;for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){const i=y*nx+x,j=i*3,k=i*4,l=(y*nx+Math.max(0,x-1))*3,r=(y*nx+Math.min(nx-1,x+1))*3;pos[k]=p[j];pos[k+1]=p[j+1];pos[k+2]=p[j+2];nor[k]=T.DataUtils.toHalfFloat(n.getX(i));nor[k+1]=T.DataUtils.toHalfFloat(n.getY(i));nor[k+2]=T.DataUtils.toHalfFloat(n.getZ(i));const dx=p[r]-p[l],dy=p[r+1]-p[l+1],dz=p[r+2]-p[l+2],inv=1/(Math.hypot(dx,dy,dz)||1);tan[k]=T.DataUtils.toHalfFloat(dx*inv);tan[k+1]=T.DataUtils.toHalfFloat(dy*inv);tan[k+2]=T.DataUtils.toHalfFloat(dz*inv);}for(const name of ['Position','Normal','Tangent'])uniforms['yarn'+name].value.needsUpdate=true;}const phase=yarnPhase(cloth.story.streamHead.value);const length=cloth.sim.renderLength??cloth.sim.length,key=cloth.viewportMask.join('');if(length===lastLength&&key===lastMask&&phase===lastPhase)return;lastLength=length;lastMask=key;lastPhase=phase;const rows=Math.ceil(length/YARN_TILE)+2;for(let mi=0;mi<meshes.length;mi++){let mesh=meshes[mi];if(rows*10>mesh.instanceMatrix.count){const replacement=new T.InstancedMesh(mesh.geometry,mesh.material,2**Math.ceil(Math.log2(rows*10)));replacement.frustumCulled=false;replacement.receiveShadow=true;cloth.scene.remove(mesh);mesh.dispose();mesh=meshes[mi]=replacement;cloth.scene.add(mesh);}let count=0;for(let row=0;row<rows;row++){const gridRow=Math.max(0,Math.min(cloth.sim.ny-1,Math.floor((phase+(row-.5)*YARN_TILE)/length*(cloth.sim.ny-1))));if(!cloth.viewportMask[gridRow])continue;for(let x=0;x<10;x++){offset.set((x*8-39.5)*.0192,0,-(phase+(row-1)*YARN_TILE));m.compose(offset,q,scale);mesh.setMatrixAt(count++,m);}}mesh.count=count;mesh.instanceMatrix.needsUpdate=true;}}};return api;
}

import {acceptClothPose} from './stream-intersections.js?v=52';
import {StreamWorkerClient} from './stream-worker-client.js?v=52';
import * as T from 'three';
import {paintPalette} from './palette-strands.js?v=44';
import {addRaisedYarn} from './stream-yarn.js?v=51';
import { StreamPhysics } from './stream-physics.js?v=52';
export class StreamCloth {
 constructor(scene,renderer){this.scene=scene;this.renderer=renderer;this.sim=new StreamPhysics();this.display=new Float32Array(this.sim.positions.length);this.sim.renderSafe=this.sim.positions.slice();this.uniforms={streamGrid:{value:new T.Vector2(this.sim.nx,this.sim.ny)},streamLength:{value:this.sim.length}};this.meshes=[];this.version=0;
  const geometry=new T.PlaneGeometry(1.536,1,this.sim.nx-1,this.sim.ny-1);for(let i=0;i<geometry.attributes.uv.count;i++)geometry.attributes.uv.setY(i,1-geometry.attributes.uv.getY(i));this.hit=new T.Mesh(geometry,new T.MeshBasicMaterial({colorWrite:false,depthWrite:false,side:T.DoubleSide}));this.hit.castShadow=true;this.hit.material.shadowSide=T.DoubleSide;this.hit.frustumCulled=false;scene.add(this.hit);this.upload();
  this.history=document.createElement('canvas');this.history.width=128;this.history.height=2048;const c=this.history.getContext('2d',{willReadFrequently:true});const colors=['#38595a','#c8b99a','#b18b35','#c8b99a','#ad503b','#38595a'];for(let i=0;i<24;i++){c.fillStyle=colors[i%6];c.fillRect(0,i*2048/24,128,2048/24+1)}this.historyLength=6.2;this.texture=new T.CanvasTexture(this.history);this.texture.colorSpace=T.SRGBColorSpace;this.texture.anisotropy=4;this.story={streamStory:{value:this.texture},streamHistoryLength:{value:this.historyLength},streamRemaining:{value:0}};
 }
 async load(){
  // One continuous sheet avoids disconnected low-poly tube ends and millions
  // of deformed vertices. Fine interlacing is shaded at physical yarn scale.
  const mat=new T.MeshStandardMaterial({color:'#ffffff',side:T.DoubleSide,roughness:1});
  mat.onBeforeCompile=shader=>{Object.assign(shader.uniforms,this.story,this.uniforms);shader.vertexShader='varying vec2 vClothUV;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nvClothUV=uv;');
   shader.fragmentShader=`uniform sampler2D streamStory;uniform float streamLength;uniform float streamHistoryLength;uniform float streamRemaining;varying vec2 vClothUV;
float yarnRelief(vec2 p){vec2 f=fract(p);float a=pow(max(0.,sin(f.x*3.14159265)),.65),b=pow(max(0.,sin(f.y*3.14159265)),.65);float over=mod(floor(p.x)+floor(p.y),2.);return mix(max(a*.48,b),max(a,b*.48),over);}
`+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
vec2 weave=vec2(vClothUV.x*80.,vClothUV.y*streamLength*52.083333);
float footprint=max(fwidth(weave.x),fwidth(weave.y)),detail=1.-smoothstep(.65,2.,footprint);
float relief=yarnRelief(weave),grain=sin(weave.x*31.+sin(weave.y*7.))*sin(weave.y*29.)*(1.-smoothstep(.3,1.,max(fwidth(weave.x*31.),fwidth(weave.y*29.))));
float fiberHeight=(relief*.0026+grain*.00006)*detail;
vec3 dye=texture2D(streamStory,vec2(vClothUV.x,clamp(1.-(vClothUV.y*streamLength+streamRemaining)/streamHistoryLength,0.,1.))).rgb;float dyeLuma=dot(dye,vec3(.2126,.7152,.0722));diffuseColor.rgb*=max(vec3(0.),mix(vec3(dyeLuma),dye,1.12))*1.10;
diffuseColor.rgb*=mix(.94,.78+.22*relief,detail)*(1.+grain*.025*detail);`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
vec3 q0=dFdx(-vViewPosition),q1=dFdy(-vViewPosition),r1=cross(q1,normal),r2=cross(normal,q0);
float determinant=dot(q0,r1);
normal=normalize(abs(determinant)*normal-sign(determinant)*(dFdx(fiberHeight)*r1+dFdy(fiberHeight)*r2));`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <lights_physical_fragment>','#include <lights_physical_fragment>\nmaterial.specularColor*=.2;');};mat.customProgramCacheKey=()=> 'continuous-woven-surface-v51';
  this.surfaceGeometry=new T.BufferGeometry();for(const key of ['position','normal','uv'])this.surfaceGeometry.setAttribute(key,this.hit.geometry.attributes[key]);this.surfaceGeometry.setIndex(this.hit.geometry.index.clone());this.surfaceGeometry.setDrawRange(0,this.hit.geometry.index.count);this.viewportTick=0;this.viewportMask=new Uint8Array(this.sim.ny).fill(1);this.nextViewportMask=new Uint8Array(this.sim.ny);this.clipPoint=new T.Vector3();this.rowBounds=new Float32Array(this.sim.ny*4);this.surface=new T.Mesh(this.surfaceGeometry,mat);this.surface.frustumCulled=false;this.surface.receiveShadow=true;this.scene.add(this.surface);this.yarn=await addRaisedYarn(this);this.yarn.update();
 }
 addPhoto(image){const section=2.4,old=document.createElement('canvas');old.width=128;old.height=2048;old.getContext('2d').drawImage(this.history,0,0);const nextLength=this.historyLength+section,px=2048*section/nextLength,c=this.history.getContext('2d',{willReadFrequently:true});c.clearRect(0,0,128,2048);c.drawImage(old,0,px,128,2048-px);
  const field=document.createElement('canvas');field.width=128;field.height=Math.max(1,Math.ceil(px));this.lastStrands=paintPalette(field,image);c.drawImage(field,0,0,128,px+1);
  // Feather the join into the existing cloth instead of making a new sheet.
  const band=Math.min(24,px*.25),newPixels=c.getImageData(0,Math.max(0,Math.floor(px-band)),128,Math.ceil(band*2)),data=newPixels.data;for(let y=0;y<newPixels.height;y++){const t=y/(newPixels.height-1),a=t*t*(3-2*t);for(let x=0;x<128;x++)for(let k=0;k<3;k++){const i=(y*128+x)*4+k,top=(x)*4+k,bottom=((newPixels.height-1)*128+x)*4+k;data[i]=data[top]*(1-a)+data[bottom]*a;}}c.putImageData(newPixels,0,Math.max(0,Math.floor(px-band)));
  this.historyLength=nextLength;this.story.streamHistoryLength.value=nextLength;this.texture.needsUpdate=true;this.story.streamRemaining.value=section;this.print={time:0,duration:5.5,from:this.sim.length,to:Math.min(14,this.sim.length+section),section};this.sim.feed=1;this.sim.active=true;this.version++;
 }
 refreshViewport(camera){if(!camera||!this.surfaceGeometry)return;if(this.viewportTick++%8!==0)return;camera.updateMatrixWorld();const {nx,ny}=this.sim,bounds=this.rowBounds,p=this.display,point=this.clipPoint,mask=this.nextViewportMask,margin=1.35;mask.fill(0);
  for(let y=0;y<ny;y++){let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;for(let x=0;x<nx;x++){const j=(y*nx+x)*3;point.set(p[j],p[j+1],p[j+2]).project(camera);minX=Math.min(minX,point.x);maxX=Math.max(maxX,point.x);minY=Math.min(minY,point.y);maxY=Math.max(maxY,point.y);}const k=y*4;bounds[k]=minX;bounds[k+1]=maxX;bounds[k+2]=minY;bounds[k+3]=maxY;}
  for(let y=0;y<ny-1;y++){const a=y*4,b=a+4;if(Math.min(bounds[a],bounds[b])<=margin&&Math.max(bounds[a+1],bounds[b+1])>=-margin&&Math.min(bounds[a+2],bounds[b+2])<=margin&&Math.max(bounds[a+3],bounds[b+3])>=-margin)mask[y]=mask[y+1]=1;}
  let changed=false;for(let y=0;y<ny;y++)if(mask[y]!==this.viewportMask[y]){changed=true;break;}if(!changed)return;this.viewportMask.set(mask);// Visibility only culls drawing; keep the full strip physically active.
  const dst=this.surfaceGeometry.index.array,src=this.hit.geometry.index.array;let count=0;for(let y=0;y<ny-1;y++)if(mask[y]||mask[y+1]){const start=y*(nx-1)*6,end=start+(nx-1)*6;dst.set(src.subarray(start,end),count);count+=end-start;}this.surfaceGeometry.index.needsUpdate=true;this.surfaceGeometry.setDrawRange(0,count);this.yarn?.update();
 }
 async startWorker(onFrame){if(typeof Worker==='undefined')return false;const seed=this.sim;try{const client=await StreamWorkerClient.create(seed,onFrame,()=>{const fallback=new StreamPhysics({nx:client.nx,ny:client.ny,length:client.renderLength});fallback.positions.set(client.positions);fallback.previous.set(client.positions);fallback.renderSafe=client.positions.slice();this.sim=fallback;onFrame();});this.sim=client;return true;}catch(error){console.warn('Using local cloth simulation:',error.message);return false;}}
 upload(){const p=this.display;if(this.sim.isWorker){p.set(this.sim.positions);this.uniforms.streamLength.value=this.sim.renderLength;}else{const alpha=this.sim.active?Math.min(1,this.sim.accumulator*90):1;for(let i=0;i<p.length;i++)p[i]=this.sim.previous[i]+(this.sim.positions[i]-this.sim.previous[i])*alpha;acceptClothPose(this.sim,p);}const g=this.hit.geometry;g.attributes.position.array.set(p);g.attributes.position.needsUpdate=true;g.computeVertexNormals();g.computeBoundingSphere();this.yarn?.update();}
 sample(u,v,out){const{nx,ny}=this.sim,p=this.display,x=T.MathUtils.clamp(u*(nx-1),0,nx-1),y=T.MathUtils.clamp(v*(ny-1),0,ny-1),a=Math.floor(x),b=Math.floor(y),xx=Math.min(nx-1,a+1),yy=Math.min(ny-1,b+1),fx=x-a,fy=y-b;for(let c=0;c<3;c++)out.setComponent(c,(p[(b*nx+a)*3+c]*(1-fx)+p[(b*nx+xx)*3+c]*fx)*(1-fy)+(p[(yy*nx+a)*3+c]*(1-fx)+p[(yy*nx+xx)*3+c]*fx)*fy);return out;}
 settle(steps){for(let i=0;i<steps;i++){this.sim.step();if(i%2===1){this.display.set(this.sim.positions);acceptClothPose(this.sim,this.display);}}this.upload();}
 update(dt,distance=8,camera){let feeding=false;if(this.print){const f=this.print;f.time+=dt;const t=Math.min(1,f.time/f.duration),ease=t*t*(3-2*t);this.sim.setLength(f.from+(f.to-f.from)*ease);this.story.streamRemaining.value=f.section*(1-ease);this.uniforms.streamLength.value=this.sim.length;feeding=true;if(t>=1){this.print=null;this.sim.feed=0;}}
 const changed=this.sim.advance(dt);if(changed||feeding)this.upload();this.refreshViewport(camera);return changed||feeding;}
}

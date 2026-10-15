import {acceptClothPose} from './stream-intersections.js?v=42';
import {StreamWorkerClient} from './stream-worker-client.js?v=42';
import * as T from 'three';
import { StreamPhysics } from './stream-physics.js?v=42';
export class StreamCloth {
 constructor(scene,renderer){this.scene=scene;this.renderer=renderer;this.sim=new StreamPhysics();this.display=new Float32Array(this.sim.positions.length);this.sim.renderSafe=this.sim.positions.slice();this.uniforms={streamGrid:{value:new T.Vector2(this.sim.nx,this.sim.ny)},streamLength:{value:this.sim.length}};this.meshes=[];this.version=0;
  const geometry=new T.PlaneGeometry(1.536,1,this.sim.nx-1,this.sim.ny-1);for(let i=0;i<geometry.attributes.uv.count;i++)geometry.attributes.uv.setY(i,1-geometry.attributes.uv.getY(i));this.hit=new T.Mesh(geometry,new T.MeshBasicMaterial({colorWrite:false,depthWrite:false,side:T.DoubleSide}));this.hit.castShadow=true;this.hit.material.shadowSide=T.DoubleSide;this.hit.frustumCulled=false;scene.add(this.hit);this.upload();
  this.history=document.createElement('canvas');this.history.width=128;this.history.height=2048;const c=this.history.getContext('2d');const colors=['#38595a','#c8b99a','#b18b35','#c8b99a','#ad503b','#38595a'];for(let i=0;i<24;i++){c.fillStyle=colors[i%6];c.fillRect(0,i*2048/24,128,2048/24+1)}this.historyLength=6.2;this.texture=new T.CanvasTexture(this.history);this.texture.colorSpace=T.SRGBColorSpace;this.texture.anisotropy=4;this.story={streamStory:{value:this.texture},streamHistoryLength:{value:this.historyLength},streamRemaining:{value:0}};
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
vec2 weave=vec2(vClothUV.x*160.,vClothUV.y*streamLength*104.);
float footprint=max(fwidth(weave.x),fwidth(weave.y)),detail=1.-smoothstep(.65,2.,footprint);
float relief=yarnRelief(weave),grain=sin(weave.x*31.+sin(weave.y*7.))*sin(weave.y*29.);
float fiberHeight=(relief*.0026+grain*.00006)*detail;
diffuseColor.rgb*=texture2D(streamStory,vec2(vClothUV.x,clamp(1.-(vClothUV.y*streamLength+streamRemaining)/streamHistoryLength,0.,1.))).rgb;
diffuseColor.rgb*=mix(.94,.78+.22*relief,detail)*(1.+grain*.025*detail);`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
vec3 q0=dFdx(-vViewPosition),q1=dFdy(-vViewPosition),r1=cross(q1,normal),r2=cross(normal,q0);
float determinant=dot(q0,r1);
normal=normalize(abs(determinant)*normal-sign(determinant)*(dFdx(fiberHeight)*r1+dFdy(fiberHeight)*r2));`);
  };mat.customProgramCacheKey=()=> 'continuous-woven-surface-v40';
  this.surface=new T.Mesh(this.hit.geometry,mat);this.surface.frustumCulled=false;this.surface.receiveShadow=true;this.scene.add(this.surface);
 }
 addPhoto(image){const section=1.35,old=document.createElement('canvas');old.width=128;old.height=2048;old.getContext('2d').drawImage(this.history,0,0);const nextLength=this.historyLength+section,px=2048*section/nextLength,c=this.history.getContext('2d');c.clearRect(0,0,128,2048);c.drawImage(old,0,px,128,2048-px);
  // Colour field retains spatial colour variation, with no six-swatch quantisation.
  const field=document.createElement('canvas');field.width=32;field.height=96;field.getContext('2d').drawImage(image,0,0,32,96);c.save();c.beginPath();c.rect(0,0,128,px+1);c.clip();c.filter='blur(6px)';c.drawImage(field,-16,-12,160,px+24);c.restore();
  // Feather the join into the existing cloth instead of making a new sheet.
  const band=Math.min(24,px*.25),newPixels=c.getImageData(0,Math.max(0,Math.floor(px-band)),128,Math.ceil(band*2)),data=newPixels.data;for(let y=0;y<newPixels.height;y++){const t=y/(newPixels.height-1),a=t*t*(3-2*t);for(let x=0;x<128;x++)for(let k=0;k<3;k++){const i=(y*128+x)*4+k,top=(x)*4+k,bottom=((newPixels.height-1)*128+x)*4+k;data[i]=data[top]*(1-a)+data[bottom]*a;}}c.putImageData(newPixels,0,Math.max(0,Math.floor(px-band)));
  this.historyLength=nextLength;this.story.streamHistoryLength.value=nextLength;this.texture.needsUpdate=true;this.story.streamRemaining.value=section;this.print={time:0,duration:4,from:this.sim.length,to:Math.min(14,this.sim.length+section),section};this.sim.feed=1;this.sim.active=true;this.version++;
 }
 async startWorker(onFrame){if(typeof Worker==='undefined')return false;const seed=this.sim;try{const client=await StreamWorkerClient.create(seed,onFrame,()=>{const fallback=new StreamPhysics({nx:client.nx,ny:client.ny,length:client.renderLength});fallback.positions.set(client.positions);fallback.previous.set(client.positions);fallback.renderSafe=client.positions.slice();this.sim=fallback;onFrame();});this.sim=client;return true;}catch(error){console.warn('Using local cloth simulation:',error.message);return false;}}
 upload(){const p=this.display;if(this.sim.isWorker){p.set(this.sim.positions);this.uniforms.streamLength.value=this.sim.renderLength;}else{const alpha=this.sim.active?Math.min(1,this.sim.accumulator*90):1;for(let i=0;i<p.length;i++)p[i]=this.sim.previous[i]+(this.sim.positions[i]-this.sim.previous[i])*alpha;acceptClothPose(this.sim,p);}const g=this.hit.geometry;g.attributes.position.array.set(p);g.attributes.position.needsUpdate=true;g.computeVertexNormals();g.computeBoundingSphere();}
 sample(u,v,out){const{nx,ny}=this.sim,p=this.display,x=T.MathUtils.clamp(u*(nx-1),0,nx-1),y=T.MathUtils.clamp(v*(ny-1),0,ny-1),a=Math.floor(x),b=Math.floor(y),xx=Math.min(nx-1,a+1),yy=Math.min(ny-1,b+1),fx=x-a,fy=y-b;for(let c=0;c<3;c++)out.setComponent(c,(p[(b*nx+a)*3+c]*(1-fx)+p[(b*nx+xx)*3+c]*fx)*(1-fy)+(p[(yy*nx+a)*3+c]*(1-fx)+p[(yy*nx+xx)*3+c]*fx)*fy);return out;}
 settle(steps){for(let i=0;i<steps;i++){this.sim.step();if(i%2===1){this.display.set(this.sim.positions);acceptClothPose(this.sim,this.display);}}this.upload();}
 update(dt,distance=8,camera){let feeding=false;if(this.print){const f=this.print;f.time+=dt;const t=Math.min(1,f.time/f.duration),ease=t*t*(3-2*t);this.sim.setLength(f.from+(f.to-f.from)*ease);this.story.streamRemaining.value=f.section*(1-ease);this.uniforms.streamLength.value=this.sim.length;feeding=true;if(t>=1){this.print=null;this.sim.feed=0;}}
 const changed=this.sim.advance(dt);if(changed||feeding)this.upload();return changed||feeding;}
}

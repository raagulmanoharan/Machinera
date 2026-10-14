import * as T from 'three';
import { ClothSimulation } from './cloth-simulation.js?v=9';
const header=`uniform sampler2D uClothState;uniform sampler2D uClothNormals;uniform vec2 uClothSize;uniform vec2 uClothGrid;uniform vec2 uClothDrape;uniform float uClothEnabled;
vec2 clothTexel(vec2 uv){return (clamp(uv,vec2(0.),vec2(1.))*(uClothGrid-1.)+.5)/uClothGrid;}
vec3 clothSample(vec2 uv){return texture2D(uClothState,clothTexel(uv)).xyz;}
vec3 clothNormal(vec2 uv){return normalize(texture2D(uClothNormals,clothTexel(uv)).xyz);}
vec3 clothPoint(vec3 p){vec2 uv=p.xy/uClothSize+.5;float base=uClothDrape.x*sin(p.x*3.4)+uClothDrape.y*sin(p.y*3.2);return clothSample(uv)+clothNormal(uv)*(p.z-base);}`;
export class AttachedCloth {
 constructor(fabric,width,height,bothEdges=true){this.fabric=fabric;this.sim=new ClothSimulation(width,height,bothEdges);this.width=width;this.height=height;this.texture=new T.DataTexture(new Uint16Array(this.sim.nx*this.sim.ny*4),this.sim.nx,this.sim.ny,T.RGBAFormat,T.HalfFloatType);this.texture.minFilter=this.texture.magFilter=T.LinearFilter;this.texture.needsUpdate=true;this.normalTexture=new T.DataTexture(new Uint16Array(this.texture.image.data.length),this.sim.nx,this.sim.ny,T.RGBAFormat,T.HalfFloatType);this.normalTexture.minFilter=this.normalTexture.magFilter=T.LinearFilter;this.normalTexture.needsUpdate=true;this.uniforms={uClothState:{value:this.texture},uClothNormals:{value:this.normalTexture},uClothSize:{value:new T.Vector2(width,height)},uClothGrid:{value:new T.Vector2(this.sim.nx,this.sim.ny)},uClothDrape:{value:new T.Vector2(fabric.wool?.105:.035,fabric.wool?.045:.022)},uClothEnabled:{value:0}};this.hit=fabric.hit;this.hit.geometry.dispose();this.hit.geometry=new T.PlaneGeometry(width,height,this.sim.nx-1,this.sim.ny-1);fabric.group.traverse(n=>{if(!n.material||n===this.hit)return;n.frustumCulled=false;n.material.side=T.DoubleSide;this.patch(n.material,n.isLine);if(n.isMesh){const depth=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,side:T.DoubleSide});this.patch(depth,false,true);n.customDepthMaterial=depth;}});this.upload();}
 patch(material,line=false,depth=false){const previous=material.onBeforeCompile;material.onBeforeCompile=shader=>{previous?.(shader);Object.assign(shader.uniforms,this.uniforms);shader.vertexShader=header+'\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`vec3 clothPosition=transformed;
#ifdef USE_INSTANCING
clothPosition=(instanceMatrix*vec4(clothPosition,1.)).xyz;
#endif
if(uClothEnabled>.5)clothPosition=clothPoint(clothPosition);
vec4 mvPosition=modelViewMatrix*vec4(clothPosition,1.);gl_Position=projectionMatrix*mvPosition;`);
// Shadow world positions must use the same deformation as the visible yarn.
shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>',`vec4 worldPosition=modelMatrix*vec4(clothPosition,1.);`);
if(!line&&!depth)shader.vertexShader=shader.vertexShader.replace('#include <defaultnormal_vertex>',`vec3 bindPosition=position;
#ifdef USE_INSTANCING
bindPosition=(instanceMatrix*vec4(bindPosition,1.)).xyz;
#endif
vec3 transformedNormal=objectNormal;
if(uClothEnabled>.5){vec2 uv=bindPosition.xy/uClothSize+.5;vec2 e=1./(uClothGrid-1.);vec3 n=clothNormal(uv);vec3 t=normalize(vec3(1.,0.,0.)-n*n.x);vec3 b=normalize(cross(n,t));transformedNormal=mat3(t,b,n)*objectNormal;}transformedNormal=normalMatrix*transformedNormal;
#ifdef FLIP_SIDED
transformedNormal=-transformedNormal;
#endif
#ifdef USE_TANGENT
vec3 transformedTangent=normalMatrix*objectTangent;
#endif`);};const key=material.customProgramCacheKey?.bind(material);material.customProgramCacheKey=()=>`attached-${line}-${depth}-${key?.()||''}`;material.needsUpdate=true;}
 upload(){const a=this.texture.image.data,p=this.sim.positions;for(let i=0;i<this.sim.pinned.length;i++){a[i*4]=T.DataUtils.toHalfFloat(p[i*3]);a[i*4+1]=T.DataUtils.toHalfFloat(p[i*3+1]);a[i*4+2]=T.DataUtils.toHalfFloat(p[i*3+2]);a[i*4+3]=15360;}const normals=this.normalTexture.image.data;for(let y=0;y<this.sim.ny;y++)for(let x=0;x<this.sim.nx;x++){const l=(y*this.sim.nx+Math.max(0,x-1))*3,r=(y*this.sim.nx+Math.min(this.sim.nx-1,x+1))*3,b=(Math.max(0,y-1)*this.sim.nx+x)*3,t=(Math.min(this.sim.ny-1,y+1)*this.sim.nx+x)*3;const tx=p[r]-p[l],ty=p[r+1]-p[l+1],tz=p[r+2]-p[l+2],bx=p[t]-p[b],by=p[t+1]-p[b+1],bz=p[t+2]-p[b+2];const nx=ty*bz-tz*by,ny=tz*bx-tx*bz,nz=tx*by-ty*bx,len=Math.max(1e-8,Math.hypot(nx,ny,nz)),j=(y*this.sim.nx+x)*4;normals[j]=T.DataUtils.toHalfFloat(nx/len);normals[j+1]=T.DataUtils.toHalfFloat(ny/len);normals[j+2]=T.DataUtils.toHalfFloat(nz/len);normals[j+3]=15360;}this.normalTexture.needsUpdate=true;this.texture.needsUpdate=true;const g=this.hit.geometry,uv=g.attributes.uv,pos=g.attributes.position;for(let i=0;i<pos.count;i++){const x=Math.round(uv.getX(i)*(this.sim.nx-1)),y=Math.round(uv.getY(i)*(this.sim.ny-1)),j=(y*this.sim.nx+x)*3;pos.setXYZ(i,p[j],p[j+1],p[j+2]);}pos.needsUpdate=true;g.computeVertexNormals();g.computeBoundingSphere();}
 enable(value){this.uniforms.uClothEnabled.value=value?1:0;this.fabric.fringe.visible=!value&&!this.fabric.ribbon;}
 update(dt){if(this.sim.advance(dt)){this.upload();return true}return false;}
 dispose(){this.normalTexture.dispose();this.texture.dispose();this.fabric.group.traverse(n=>n.customDepthMaterial?.dispose());}
}

import * as T from 'three';
import { HangingPhysics } from './hanging-physics.js?v=23';
const header=`uniform sampler2D uHangPosition;uniform sampler2D uHangNormal;uniform sampler2D uHangTangent;uniform vec2 uHangGrid;
vec2 hangTexel(vec2 uv){return(clamp(uv,0.0,1.0)*(uHangGrid-1.0)+.5)/uHangGrid;}
vec3 hangPoint(vec2 uv){return texture2D(uHangPosition,hangTexel(uv)).xyz;}
vec3 hangNormal(vec2 uv){return normalize(texture2D(uHangNormal,hangTexel(uv)).xyz);}
vec2 hangUV(vec3 p){return vec2(p.x/1.536+.5,(p.z-.648)/2.304);}
vec3 hangTangent(vec2 uv){return normalize(texture2D(uHangTangent,hangTexel(uv)).xyz);}
vec3 hangDeform(vec3 rest){vec2 uv=hangUV(rest);vec3 n=hangNormal(uv),t=hangTangent(uv),b=normalize(cross(n,t));vec3 result=hangPoint(uv)+n*(-.014-rest.y)+b*min(0.0,rest.z-.648);result.y=min(result.y,.028);return result;}
`;
export class HangingCloth {
 constructor(scene,renderer){this.floatLinear=renderer.extensions.has('OES_texture_float_linear');this.sim=new HangingPhysics();const{nx,ny}=this.sim;const texture=()=>{const t=new T.DataTexture((this.floatLinear?new Float32Array(nx*ny*4):new Uint16Array(nx*ny*4)),nx,ny,T.RGBAFormat,this.floatLinear?T.FloatType:T.HalfFloatType);t.minFilter=t.magFilter=T.LinearFilter;t.needsUpdate=true;return t};this.position=texture();this.normal=texture();this.tangent=texture();this.display=new Float32Array(this.sim.positions.length);this.surfaceNormals=new Float32Array(this.sim.positions.length);this.uniforms={uHangPosition:{value:this.position},uHangNormal:{value:this.normal},uHangTangent:{value:this.tangent},uHangGrid:{value:new T.Vector2(nx,ny)}};
  const g=new T.PlaneGeometry(1.536,2.304,nx-1,ny-1);this.hit=new T.Mesh(g,new T.MeshBasicMaterial({colorWrite:false,depthWrite:false,side:T.DoubleSide}));this.hit.name='Cloth interaction and moving shadow surface';this.hit.castShadow=true;this.hit.frustumCulled=false;scene.add(this.hit);
  this.upload();
 }
 patch(material,{line=false,depth=false,yarn=false}={}){if(material.userData.hangingPatched)return;material.userData.hangingPatched=true;const previous=material.onBeforeCompile;material.onBeforeCompile=shader=>{previous?.(shader);Object.assign(shader.uniforms,this.uniforms);shader.vertexShader=header+'\n'+shader.vertexShader;
  const bind=`vec3 hangRest=transformed;vec3 hangRestNormal=normal;
#ifdef USE_INSTANCING
hangRest=(instanceMatrix*vec4(hangRest,1.0)).xyz;hangRestNormal=mat3(instanceMatrix)*hangRestNormal;
#endif
${yarn?'hangRest+=hangRestNormal*(.0003+.0003*sin(hangRest.x*271.0+sin(hangRest.z*163.0)*2.0)*sin(hangRest.z*317.0+hangRest.x*31.0));':''}
${!line&&!depth?'vec3 hangWorld=hangPoint(hangUV(hangRest))+hangSurfaceNormal*(-.014-hangRest.y)+hangV*min(0.,hangRest.z-.648);hangWorld.y=min(hangWorld.y,.028);':'vec3 hangWorld=hangDeform(hangRest);'}`;
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`${bind}\nvec4 mvPosition=modelViewMatrix*vec4(hangWorld,1.0);gl_Position=projectionMatrix*mvPosition;`);
  shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','vec4 worldPosition=modelMatrix*vec4(hangWorld,1.0);');
  if(!line&&!depth)shader.vertexShader=shader.vertexShader.replace('#include <defaultnormal_vertex>',`vec3 hangBind=position;vec3 hangN=objectNormal;
#ifdef USE_INSTANCING
hangBind=(instanceMatrix*vec4(hangBind,1.0)).xyz;hangN=mat3(instanceMatrix)*hangN;
#endif
vec2 hangNormalUV=hangUV(hangBind);vec3 hangSurfaceNormal=hangNormal(hangNormalUV),hangU=hangTangent(hangNormalUV),hangV=normalize(cross(hangSurfaceNormal,hangU));
vec3 transformedNormal=normalMatrix*(hangU*hangN.x+hangV*hangN.z-hangSurfaceNormal*hangN.y);
#ifdef FLIP_SIDED
transformedNormal=-transformedNormal;
#endif
#ifdef USE_TANGENT
vec3 transformedTangent=normalMatrix*objectTangent;
#endif`);
 };const key=material.customProgramCacheKey.bind(material);material.customProgramCacheKey=()=>`hang-${line}-${depth}-${yarn}-${key()}`;material.needsUpdate=true;}
 attach(mesh,options={}){this.patch(mesh.material,options);mesh.frustumCulled=false;if(mesh.isMesh){mesh.customDepthMaterial=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,side:T.DoubleSide});this.patch(mesh.customDepthMaterial,{...options,depth:true});}}
 upload(){const{positions:current,previous,nx,ny,accumulator,active}=this.sim,p=this.display,alpha=active?Math.min(1,accumulator*90):1;
  for(let i=0;i<p.length;i++)p[i]=previous[i]+(current[i]-previous[i])*alpha;
  const normals=this.surfaceNormals,a=this.position.image.data,n=this.normal.image.data,tan=this.tangent.image.data,encode=this.floatLinear?v=>v:T.DataUtils.toHalfFloat;
  for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){const i=y*nx+x,j=i*3,k=i*4,l=(y*nx+Math.max(x-1,0))*3,r=(y*nx+Math.min(x+1,nx-1))*3,b=(Math.max(y-1,0)*nx+x)*3,t=(Math.min(y+1,ny-1)*nx+x)*3;
   const ux=p[r]-p[l],uy=p[r+1]-p[l+1],uz=p[r+2]-p[l+2],vx=p[t]-p[b],vy=p[t+1]-p[b+1],vz=p[t+2]-p[b+2],cx=uy*vz-uz*vy,cy=uz*vx-ux*vz,cz=ux*vy-uy*vx,inv=1/(Math.hypot(cx,cy,cz)||1),ti=1/(Math.hypot(ux,uy,uz)||1);
   normals[j]=cx*inv;normals[j+1]=cy*inv;normals[j+2]=cz*inv;for(let c=0;c<3;c++)a[k+c]=encode(p[j+c]);a[k+3]=encode(1);n[k]=encode(cx*inv);n[k+1]=encode(cy*inv);n[k+2]=encode(cz*inv);n[k+3]=encode(1);tan[k]=encode(ux*ti);tan[k+1]=encode(uy*ti);tan[k+2]=encode(uz*ti);tan[k+3]=encode(1);
  }
  this.position.needsUpdate=this.normal.needsUpdate=this.tangent.needsUpdate=true;const g=this.hit.geometry,uv=g.attributes.uv;
  for(let i=0;i<uv.count;i++){const x=Math.round(uv.getX(i)*(nx-1)),y=Math.round(uv.getY(i)*(ny-1)),j=(y*nx+x)*3;g.attributes.position.setXYZ(i,p[j],p[j+1],p[j+2]);g.attributes.normal.setXYZ(i,normals[j],normals[j+1],normals[j+2]);}
  g.attributes.position.needsUpdate=g.attributes.normal.needsUpdate=true;g.computeBoundingSphere();
 }
 sample(u,v,out){const{nx,ny,positions:p}=this.sim,x=Math.max(0,Math.min(nx-1,u*(nx-1))),y=Math.max(0,Math.min(ny-1,v*(ny-1))),x0=Math.floor(x),y0=Math.floor(y),x1=Math.min(nx-1,x0+1),y1=Math.min(ny-1,y0+1),fx=x-x0,fy=y-y0;for(let c=0;c<3;c++){const a=p[(y0*nx+x0)*3+c]*(1-fx)+p[(y0*nx+x1)*3+c]*fx,b=p[(y1*nx+x0)*3+c]*(1-fx)+p[(y1*nx+x1)*3+c]*fx;out.setComponent(c,a*(1-fy)+b*fy);}return out;}
 update(dt){const changed=this.sim.advance(dt);if(changed||this.sim.active){this.upload();return true;}return false;}
}

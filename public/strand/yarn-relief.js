import {THREAD_PITCH,YARN_RADIUS,YARN_HEIGHT,CROSSING_HEIGHT,draftGLSL} from './yarn-structure.js?v=98';
// Shared by displaced yarn centres and the directional visibility height field.
// Coordinates are permanent end/pick indices, not time or recycled tile UVs.
export const yarnNoiseGLSL=`
float yarnHash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float yarnNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(yarnHash(i),yarnHash(i+vec2(1.,0.)),f.x),mix(yarnHash(i+vec2(0.,1.)),yarnHash(i+1.),f.x),f.y);}
float yarnLift(vec2 p){return (yarnNoise(p*.24)-.5)*${THREAD_PITCH/12}+(yarnNoise(p*.071+17.)-.5)*${THREAD_PITCH/20};}
float yarnSizeFor(vec2 p,bool warp){
 float strand=floor((warp?p.x:p.y)+.5),along=warp?p.y:p.x;
 float seed=yarnHash(vec2(strand,warp?19.:73.));
 float spinning=yarnNoise(vec2(strand*1.73+11.,along*.12));
 float slub=smoothstep(.67,.88,spinning);
 return clamp(.94+.09*seed+.035*slub+.025*(spinning-.5),.91,1.06);
}
`;
export const yarnShadowFunctionsGLSL=yarnNoiseGLSL+`
uniform float yarnSelfShadowStrength;
float shadowDraft(float pick){return floor(texture2D(streamWeave,vec2(.5,clamp((pick*${THREAD_PITCH}-streamAtlasBase)/streamHistoryLength,0.,1.))).r*255.+.5);}
float yarnEnvelope(vec2 p){
 vec2 cell=floor(p+.5),a=floor(p),f=p-a,e=.5-.5*cos(f*3.14159265);
 float d0=shadowDraft(a.y),d1=shadowDraft(a.y+1.),dc=f.y<.5?d0:d1,lift=yarnLift(p);
 float wh0=warpCrossing(cell.x,a.y,d0)*${CROSSING_HEIGHT},wh1=warpCrossing(cell.x,a.y+1.,d1)*${CROSSING_HEIGHT};
 // The opposite strand uses the same crossings, with its relief sign reversed.
 float fh0=-warpCrossing(a.x,cell.y,dc)*${CROSSING_HEIGHT};
 float fh1=-warpCrossing(a.x+1.,cell.y,dc)*${CROSSING_HEIGHT};
 vec2 across=p-cell,size=vec2(yarnSizeFor(p,true),yarnSizeFor(p,false)),radius=vec2(${YARN_RADIUS/THREAD_PITCH})*size;
 vec2 dome=sqrt(max(vec2(0.),1.-pow(across/radius,vec2(2.))));
 float warp=abs(across.x)<radius.x?mix(wh0,wh1,e.y)+lift+dome.x*${YARN_HEIGHT}*size.x:-.02;
 float weft=abs(across.y)<radius.y?mix(fh0,fh1,e.x)+lift+dome.y*${YARN_HEIGHT}*size.y:-.02;
 return max(warp,weft);
}
float yarnDirectionalVisibility(vec2 p,vec3 light,vec3 baseNormal,vec3 tangent){
 float resolved=1.-smoothstep(.55,1.5,max(fwidth(p.x),fwidth(p.y)));
 if(resolved<.001||yarnSelfShadowStrength<=0.)return 1.;
 vec3 n=normalize(baseNormal),t=normalize(tangent-n*dot(tangent,n)),b=normalize(cross(n,t));
 vec2 along=vec2(dot(light,t),dot(light,b));float sideways=length(along),toward=dot(light,n);
 if(toward<=.03||sideways<.04)return 1.;
 vec2 direction=along/sideways;float rise=${THREAD_PITCH}*toward/sideways;
 float origin=yarnEnvelope(p)+${THREAD_PITCH*.025},visibility=1.;
 // Six bounded cone samples, not another geometry render or screen-space pass.
 // Cone width grows with distance to soften the penumbra from a broad source.
 for(int i=0;i<6;i++){
  float distance=.15+float(i)*.22;
  float blocker=yarnEnvelope(p+direction*distance),ray=origin+distance*rise;
  float softness=${THREAD_PITCH/30}+distance*${THREAD_PITCH*7/120};
  visibility=min(visibility,smoothstep(-softness,softness,ray-blocker));
 }
 return mix(1.,.28+.72*visibility,resolved*yarnSelfShadowStrength);
}
`;
export const yarnShadowGLSL=draftGLSL+yarnShadowFunctionsGLSL;
// Keep macro cloth shadows from Three.js; attenuate only the directional key.
// HDRI and softboxes still illuminate cavities, so occlusion never becomes black.
export function applyYarnDirectionalShadow(shader,chunks,{point,normal,tangent}){
 shader.uniforms.yarnSelfShadowStrength={value:1};
 const lightChunk=chunks.lights_fragment_begin.replace(
  'getDirectionalLightInfo( directionalLight, directLight );',
  `getDirectionalLightInfo( directionalLight, directLight );\ndirectLight.color*=yarnDirectionalVisibility(${point},directLight.direction,${normal},${tangent});`);
 shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_begin>',lightChunk);
}

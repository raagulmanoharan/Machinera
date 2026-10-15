// Layer a scanned height field over an existing tangent-space normal map.
// Fragment derivatives preserve fine relief without subdividing the mesh.
export function applySurfaceRelief(material,height,depth){
 if(!height)return;
 const before=material.onBeforeCompile,key=material.customProgramCacheKey.bind(material);
 material.onBeforeCompile=function(shader,renderer){
  before.call(this,shader,renderer);
  shader.uniforms.surfaceHeight={value:height};shader.uniforms.surfaceReliefDepth={value:depth};
  shader.fragmentShader='uniform sampler2D surfaceHeight;uniform float surfaceReliefDepth;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
  #if defined(USE_NORMALMAP_TANGENTSPACE)
   float relief=texture2D(surfaceHeight,vNormalMapUv).r*surfaceReliefDepth;
   vec3 surfaceDx=dFdx(-vViewPosition),surfaceDy=dFdy(-vViewPosition);
   vec3 reliefX=cross(surfaceDy,normal),reliefY=cross(normal,surfaceDx);
   float reliefDet=dot(surfaceDx,reliefX);
   vec3 reliefGradient=dFdx(relief)*reliefX+dFdy(relief)*reliefY;
   normal=normalize(normal-reliefGradient*sign(reliefDet)/max(abs(reliefDet),1e-10));
  #endif`);
 };
 material.customProgramCacheKey=()=>key()+'-scanned-relief-v1';material.needsUpdate=true;
}

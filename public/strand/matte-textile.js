// Fabric-space grain: stable under motion, faded before it can alias.
// Keep diffuse room lighting and shadow receiving; suppress glossy lobes.
const grainGLSL=`
float textileHash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float textileNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(textileHash(i),textileHash(i+vec2(1.,0.)),f.x),mix(textileHash(i+vec2(0.,1.)),textileHash(i+1.),f.x),f.y);}
float textileGrain(vec2 p){vec2 broad=p*90.;float broadVisibility=1.-smoothstep(.45,1.3,max(fwidth(broad.x),fwidth(broad.y)));float coarse=mix(.5,textileNoise(broad),broadVisibility);vec2 fine=p*720.;float visible=1.-smoothstep(.35,1.25,max(fwidth(fine.x),fwidth(fine.y)));return (coarse-.5)*.16+(textileNoise(fine)-.5)*.14*visible;}
`;
export function applyMatteTextile(material,coordinates){
 material.roughness=1;material.metalness=0;material.envMapIntensity=1;
 const previous=material.onBeforeCompile,key=material.customProgramCacheKey.bind(material);
 material.onBeforeCompile=function(shader,renderer){
  previous.call(this,shader,renderer);
  shader.fragmentShader=grainGLSL+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>\nfloat matteGrain=textileGrain(${coordinates});diffuseColor.rgb*=.98+matteGrain;`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>\nfloat matteHeight=matteGrain*.0007;vec3 matteDx=dFdx(-vViewPosition),matteDy=dFdy(-vViewPosition),matteR1=cross(matteDy,normal),matteR2=cross(normal,matteDx);float matteDet=dot(matteDx,matteR1);normal=normalize(abs(matteDet)*normal-sign(matteDet)*(dFdx(matteHeight)*matteR1+dFdy(matteHeight)*matteR2));`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <lights_physical_fragment>','#include <lights_physical_fragment>\nmaterial.specularColor=vec3(0.);material.specularF90=0.;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>','#include <lights_fragment_end>\nreflectedLight.directSpecular=vec3(0.);reflectedLight.indirectSpecular=vec3(0.);');
 };
 material.customProgramCacheKey=()=>key()+'-matte-grain77';
 return material;
}

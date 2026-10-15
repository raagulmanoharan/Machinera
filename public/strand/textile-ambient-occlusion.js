// Local material/contact AO. Fixed-cost shading, no screen-space buffers or
// extra scene renders. Cavity frequencies fade before reaching pixel scale.
export const textileAOGLSL=`
float weaveAmbientOcclusion(vec2 p){
 vec2 footprint=fwidth(p);
 vec2 waves=cos(p*6.2831853)*(1.-smoothstep(vec2(.2),vec2(.65),footprint));
 return 1.-.18*max(0.,-waves.x)*max(0.,-waves.y);
}
`;
export function applyRoomAmbientOcclusion(material,kind){
 const previous=material.onBeforeCompile,key=material.customProgramCacheKey.bind(material);
 material.onBeforeCompile=function(shader,renderer){previous.call(this,shader,renderer);shader.vertexShader='varying vec3 roomAOPosition;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nroomAOPosition=(modelMatrix*vec4(transformed,1.)).xyz;');shader.fragmentShader='varying vec3 roomAOPosition;\n'+shader.fragmentShader;
 const term=kind==='wall'?`float corner=.16*exp(-max(0.,roomAOPosition.z-.16)*9.);float textile=.10*(1.-smoothstep(.70,1.,abs(roomAOPosition.x)))*smoothstep(.35,.7,roomAOPosition.z);float localAO=1.-max(corner,textile);`:kind==='floor'?`float corner=.16*exp(-abs(roomAOPosition.y)*10.);float textile=.12*(1.-smoothstep(.70,.94,abs(roomAOPosition.x)))*(1.-smoothstep(-.75,-.48,roomAOPosition.y));float localAO=1.-max(corner,textile);`:`float localAO=.95-.06*exp(-abs(roomAOPosition.z-.02)*18.);`;
 shader.fragmentShader=shader.fragmentShader.replace('#include <aomap_fragment>','#include <aomap_fragment>\n'+term+'\nreflectedLight.indirectDiffuse*=localAO;reflectedLight.indirectSpecular*=localAO;');};material.customProgramCacheKey=()=>key()+'-local-ambient-occlusion60-'+kind;
}

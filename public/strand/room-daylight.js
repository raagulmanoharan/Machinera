// Art-directed, baked-style window illumination in room coordinates.
// Positive Gaussian pools preserve the live cloth shadows and have no pane edges.
export function applyRoomDaylight(material){
 const previous=material.onBeforeCompile,key=material.customProgramCacheKey.bind(material);
 material.onBeforeCompile=function(shader,renderer){
  previous.call(this,shader,renderer);
  shader.vertexShader='varying vec3 vRoomDaylightPosition;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvRoomDaylightPosition=(modelMatrix*vec4(transformed,1.0)).xyz;');
  shader.fragmentShader='varying vec3 vRoomDaylightPosition;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`vec3 daylightP=vRoomDaylightPosition;
   float daylightU=daylightP.x+.48*(daylightP.z-1.8)+.5*min(daylightP.y,0.0);
   float daylightA=(daylightU+1.45+.025*sin(daylightP.z*2.0))/.14;
   float daylightB=(daylightU+.75+.035*sin(daylightP.z*1.5))/.19;
   float daylightC=(daylightU+.05)/.16;
   float studioU=(daylightP.x+1.65)/2.7,studioV=(daylightP.z-4.9)/3.5;float studioGlow=.10*exp(-.5*(studioU*studioU+studioV*studioV));
   float roomDaylight=studioGlow+.67*exp(-.5*daylightA*daylightA)+.56*exp(-.5*daylightB*daylightB)+.42*exp(-.5*daylightC*daylightC);
   outgoingLight*=vec3(.85)+roomDaylight*vec3(1.8,1.64,1.37);
   #include <opaque_fragment>`);
 };
 material.customProgramCacheKey=()=>key()+'-soft-room-daylight-v60';
}

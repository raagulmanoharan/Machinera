import {draftGLSL,THREAD_PITCH,YARN_HEIGHT} from './yarn-structure.js?v=87';
// The backing uses the same binary loom draft as the raised yarn, rather than
// a sinusoidal approximation to a different pattern. Filter subpixel fibres.
export const wovenSurfaceGLSL=draftGLSL+`
uniform float rugWeaveType;
float weaveWave(float phase,float span){return cos(phase*6.2831853)*(1.-smoothstep(.20,.65,span));}
float weaveOverType(vec2 p,float type){float visible=1.-smoothstep(.4,1.2,max(fwidth(p.x),fwidth(p.y)));return .5+.5*warpCrossing(floor(p.x+.5),floor(p.y+.5),type)*visible;}
float weaveOver(vec2 p){return weaveOverType(p,rugWeaveType);}
vec2 wovenSurfaceType(vec2 p,float type){
 vec2 span=fwidth(p),crossSection=fract(p+.5)-.5;
 vec2 dome=sqrt(max(vec2(0.),1.-pow(crossSection/.45,vec2(2.))));
 dome=mix(vec2(.5),dome,1.-smoothstep(vec2(.35),vec2(1.1),span));
 float over=weaveOverType(p,type),relief=mix(dome.y,dome.x,over);
 float fibres=weaveWave(p.x*5.+p.y*.25,span.x*5.+span.y*.25)*weaveWave(p.y*5.,span.y*5.);
 return vec2(relief*${YARN_HEIGHT}+fibres*.000025,.91+relief*.09+fibres*.01);
}
vec2 wovenSurface(vec2 p){return wovenSurfaceType(p,rugWeaveType);}
vec2 wovenSurfaceDraft(vec2 p,vec3 draft){return wovenSurfaceType(p,floor(draft.r*255.+.5));}
`;

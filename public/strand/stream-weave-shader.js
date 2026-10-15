// Band-limit every yarn frequency before shading it. In particular, the
// alternating over/under pattern must disappear smoothly below pixel scale.
export const wovenSurfaceGLSL=`
uniform float rugWeaveType;
float weaveWave(float phase,float span){
 float visibility=1.-smoothstep(.20,.65,span);
 return cos(phase*6.2831853)*visibility;
}
float weaveOver(vec2 p){vec2 span=fwidth(p);if(rugWeaveType>1.5)return .5+.5*weaveWave(p.x*.25,span.x*.25)*weaveWave(p.y*.25,span.y*.25);if(rugWeaveType>.5)return .5+.5*weaveWave((p.x+p.y)*.25,(span.x+span.y)*.25);return .5+.5*weaveWave(p.x*.5,span.x*.5)*weaveWave(p.y*.5,span.y*.5);}
vec2 wovenSurface(vec2 p){
 vec2 span=fwidth(p);
 float warp=weaveWave(p.x,span.x),weft=weaveWave(p.y,span.y);
 float over=weaveOver(p);
 float relief=mix(warp*.30+weft,warp+weft*.30,over);
 float fibres=weaveWave(p.x*5.3+p.y*.2,span.x*5.3+span.y*.2)*weaveWave(p.y*4.7,span.y*4.7);
 return vec2(relief*.00105+fibres*.000035,.94+relief*.065+fibres*.012);
}
`;

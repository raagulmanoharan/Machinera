// Screen-space derivatives band-limit each thread and ply before aliasing.
export const wovenSurfaceGLSL=`
uniform float rugWeaveType;
float weaveWave(float phase,float span){return cos(phase*6.2831853)*(1.-smoothstep(.20,.65,span));}
float weaveOverType(vec2 p,float type){vec2 span=fwidth(p);if(type>2.5){float turn=abs(mod(p.y,8.)-4.);return .5+.5*weaveWave((p.x+turn)*.25,(span.x+span.y)*.25);}if(type>1.5)return .5+.5*weaveWave(p.x*.25,span.x*.25)*weaveWave(p.y*.25,span.y*.25);if(type>.5)return .5+.5*weaveWave((p.x+p.y)*.25,(span.x+span.y)*.25);return .5+.5*weaveWave(p.x*.5,span.x*.5)*weaveWave(p.y*.5,span.y*.5);}
float weaveOver(vec2 p){return weaveOverType(p,rugWeaveType);}
vec2 wovenSurfaceType(vec2 p,float type){vec2 span=fwidth(p);float warp=weaveWave(p.x,span.x),weft=weaveWave(p.y,span.y),over=weaveOverType(p,type);float relief=mix(warp*.30+weft,warp+weft*.30,over);float fibres=weaveWave(p.x*5.3+p.y*.2,span.x*5.3+span.y*.2)*weaveWave(p.y*4.7,span.y*4.7);return vec2(relief*.00105+fibres*.000035,.94+relief*.065+fibres*.012);}
vec2 wovenSurface(vec2 p){return wovenSurfaceType(p,rugWeaveType);}
vec2 wovenSurfaceDraft(vec2 p,vec3 draft){return mix(wovenSurfaceType(p,floor(draft.g*255.+.5)),wovenSurfaceType(p,floor(draft.r*255.+.5)),draft.b);}
float weaveMotif(vec2 p,float type){if(type<.5)return 0.;if(type<1.5)return (abs(fract(p.x/20.)-.5)*2.-.5)*.32;if(type<2.5)return (step(.5,fract(p.x/16.))+step(.5,fract(p.y/16.))-1.)*.12;return (abs(fract(p.x/32.)-.5)+abs(fract(p.y/32.)-.5)-.5)*.52;}
float weaveMotifDraft(vec2 p,vec3 draft){return mix(weaveMotif(p,floor(draft.g*255.+.5)),weaveMotif(p,floor(draft.r*255.+.5)),draft.b);}
`;

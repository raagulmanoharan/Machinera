// Rounded yarn sections and crimp follow the same discrete crossings as 3D.
// Normals are in fabric space, independent of viewport size and pixel ratio.
export const cottonPlaybackGLSL=`
float cottonHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float cottonOver(float x,float y,float type){if(type>2.5)return mod(x+abs(mod(y,8.)-4.),4.)<2.?1.:-1.;if(type>1.5)return mod(floor(x/2.)+floor(y/2.),2.)<1.?1.:-1.;if(type>.5)return mod(x+y,4.)<2.?1.:-1.;return mod(x+y,2.)<1.?1.:-1.;}
float cottonDraft(float pick){float q=pick*.0192,row=clamp(1.-q/totalLength,0.,1.)*(paletteRows-1.);float i=floor(row+.5);return floor(texture2D(weavePalette,(vec2(mod(i,weaveSize.x),floor(i/weaveSize.x))+.5)/weaveSize).r*255.+.5);}
vec3 cottonShading(vec2 p){
 vec2 cell=floor(p+.5),local=p-cell;
 float x=local.x-.018*sin(cell.x*17.13)-.010*sin(p.y*.8+cell.x*5.1);
 float y=local.y-.018*sin(cell.y*19.7)-.010*sin(p.x*.8+cell.y*3.2);
 float dx=x/.47,dy=y/.47,cx=sqrt(max(.003,1.-dx*dx)),cy=sqrt(max(.003,1.-dy*dy));
 float a=floor(p.y),t=fract(p.y),h0=cottonOver(cell.x,a,cottonDraft(a)),h1=cottonOver(cell.x,a+1.,cottonDraft(a+1.));
 float crimpWarp=.18*mix(h0,h1,.5-.5*cos(t*3.14159265)),slopeWarp=.18*(h1-h0)*1.57079633*sin(t*3.14159265);
 a=floor(p.x);t=fract(p.x);float draft=cottonDraft(cell.y);h0=-cottonOver(a,cell.y,draft);h1=-cottonOver(a+1.,cell.y,draft);
 float crimpWeft=.18*mix(h0,h1,.5-.5*cos(t*3.14159265)),slopeWeft=.18*(h1-h0)*1.57079633*sin(t*3.14159265);
 float hw=abs(dx)<1.?cx*.28+crimpWarp:-1.,hh=abs(dy)<1.?cy*.28+crimpWeft:-1.;
 float front=smoothstep(-.025,.025,hw-hh);
 vec3 nw=normalize(vec3(dx*.60,-slopeWarp*cx,cx)),nh=normalize(vec3(-slopeWeft*cy,dy*.60,cy));
 vec3 n=normalize(mix(nh,nw,front));
 vec3 wool=texture2D(fibreNormal,p*.19).xyz*2.-1.;n=normalize(n+vec3(wool.xy*.26,0.));
 float phase=mix(p.x,p.y,front)*1.7+mix(atan(dy*.6,cy),atan(dx*.6,cx),front)*3.;float detail=1.-smoothstep(.4,1.2,fwidth(phase));
 n=normalize(n+vec3(cos(phase*6.2831853),sin(phase*6.2831853),0.)*.045*detail);
 float diffuse=max(0.,dot(n,normalize(vec3(-.55,.65,1.3))));
 float cavity=.79+.21*smoothstep(.01,.40,max(hw,hh));float cover=1.-smoothstep(.46,.51,min(abs(x),abs(y)));
 float grain=texture2D(fibreNormal,p*.71).r;float irregular=.94+.09*cottonHash(cell);irregular*=.84+.32*grain;float fibre=sin(mix(p.y,p.x,front)*73.+sin(mix(p.x,p.y,front)*9.)*.6);float fibreAA=1.-smoothstep(.6,1.8,fwidth(mix(p.y,p.x,front)*73.));irregular*=1.+.045*fibre*fibreAA;float shade=(.38+.77*diffuse)*cavity*(.64+.36*cover)*irregular;
 float visibility=1.-smoothstep(.35,.85,max(fwidth(p.x),fwidth(p.y)));shade=mix(.94,shade,visibility);
 return vec3(shade);
}
`;

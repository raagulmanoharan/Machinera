// Local material/contact AO. Fixed-cost shading, no screen-space buffers or
// extra scene renders. Cavity frequencies fade before reaching pixel scale.
export const textileAOGLSL=`
float weaveAmbientOcclusion(vec2 p){
 vec2 footprint=fwidth(p);
 vec2 waves=cos(p*6.2831853)*(1.-smoothstep(vec2(.2),vec2(.65),footprint));
 return 1.-.26*max(0.,-waves.x)*max(0.,-waves.y);
}
`;

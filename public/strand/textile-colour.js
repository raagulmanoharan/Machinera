// A reflectance toe keeps carbon-dark natural yarn from becoming mathematical
// zero. It changes display shading only; original photograph/archive bytes stay
// intact. A modest saturation and brightness lift keeps the yarn colours vivid.
export const textileColourGLSL=`
vec3 textileDye(vec3 dye){
 float value=dot(dye,vec3(.2126,.7152,.0722));
 float reflectance=.012*(1.-smoothstep(.004,.10,value));
 return max(vec3(0.),mix(vec3(value),dye,1.06))*1.10+vec3(reflectance);
}
`;

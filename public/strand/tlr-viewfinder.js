import * as T from 'three';
// Preview-only circular-aperture defocus with a radial focus field. Without a
// depth map this is an optical approximation, not scene-depth-based bokeh.
// Fine, uniform (non-Gaussian) grain is screen-locked and applies a neutral
// common RGB gain. Source RGB used for weaving remains untouched.
export class TLRViewfinder{
 constructor(host,video){this.host=host;this.video=video;this.running=false;this.last=0;}
 start(){this.stop();this.width=0;this.height=0;this.renderer=new T.WebGLRenderer({alpha:false,antialias:false,powerPreference:'low-power'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.domElement.className='finder-image';this.host.prepend(this.renderer.domElement);this.texture=new T.VideoTexture(this.video);this.texture.colorSpace=T.NoColorSpace;this.texture.needsUpdate=true;this.feedReady=false;this.uniforms={feed:{value:this.texture},cover:{value:new T.Vector2(1,1)},resolution:{value:new T.Vector2()},pixelRatio:{value:this.renderer.getPixelRatio()}};this.geometry=new T.PlaneGeometry(2,2);this.material=new T.ShaderMaterial({uniforms:this.uniforms,vertexShader:'varying vec2 uvFinder;void main(){uvFinder=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`precision highp float;varying vec2 uvFinder;uniform sampler2D feed;uniform vec2 cover,resolution;uniform float pixelRatio;
void main(){
 vec2 p=uvFinder-.5;float field=length(p*resolution)/min(resolution.x,resolution.y);
 float coc=10.*pixelRatio*smoothstep(.16,.72,field);vec3 rgb=vec3(0.);
 if(coc<.25){rgb=texture2D(feed,clamp(p*cover+.5,.001,.999)).rgb;}
 else{for(int i=0;i<24;i++){
 // Reuse the same 24 reads: a dense aperture core plus a faint wide diffusion
 // skirt. Normalised weights soften edges without additive bloom or grading.
 float k=float(i),halo=step(17.5,k),n=mix(k+.5,k-17.5,halo),count=mix(18.,6.,halo);
 float angle=n*2.39996323,radius=sqrt(n/count)*mix(1.,2.35,halo),weight=mix(.88/18.,.12/6.,halo);
 vec2 aperture=vec2(cos(angle),sin(angle))*radius;
 vec2 q=(p+aperture*coc/resolution)*cover+.5;rgb+=texture2D(feed,clamp(q,.001,.999)).rgb*weight;
 }}
 vec3 seed=fract(vec3(floor(gl_FragCoord.xy).xyx)*vec3(.1031,.1030,.0973));seed+=dot(seed,seed.yzx+33.33);float grain=fract((seed.x+seed.y)*seed.z)-.5;
 // Preview contrast and achromatic fine grain share the existing pass.
 // Additive grain remains visible in shadows; no extra texture reads.
 rgb=clamp((rgb-.5)*1.10+.5,0.,1.);
 gl_FragColor=vec4(clamp(rgb+grain*.065,0.,1.),1.);
}
`});this.scene=new T.Scene();this.scene.add(new T.Mesh(this.geometry,this.material));this.camera=new T.Camera();this.running=true;this.last=0;this.host.classList.add('has-feed');this.tick=stamp=>{if(!this.running)return;if(!document.hidden&&!this.suspended&&stamp-this.last>=1000/24){this.last=stamp;if(!this.feedReady&&this.video.readyState>=2){this.texture.needsUpdate=true;this.feedReady=true;}this.resize();this.renderer.render(this.scene,this.camera);}this.frame=requestAnimationFrame(this.tick);};this.frame=requestAnimationFrame(this.tick);}
 resize(){const w=Math.max(1,this.host.clientWidth),h=Math.max(1,this.host.clientHeight);if(w!==this.width||h!==this.height){this.width=w;this.height=h;this.renderer.setSize(w,h);this.uniforms.resolution.value.set(w*this.renderer.getPixelRatio(),h*this.renderer.getPixelRatio());}const source=(this.video.videoWidth||w)/(this.video.videoHeight||h),view=w/h;this.uniforms.cover.value.set(source>view?view/source:1,source>view?1:source/view);}
 stop(){this.running=false;if(this.frame)cancelAnimationFrame(this.frame);this.host.classList.remove('has-feed');if(this.renderer){this.renderer.domElement.remove();this.texture.dispose();this.material.dispose();this.geometry.dispose();this.renderer.dispose();this.renderer.forceContextLoss();this.renderer=null;}}
}

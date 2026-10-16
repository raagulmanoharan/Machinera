import * as T from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

// Scale the scene target explicitly; never multiply by canvas DPR a second time.
// Preserve OutputPass before FXAA. Fusing AgX into every FXAA neighbour would
// repeat expensive tone mapping and change nonlinear bilinear filtering.
export function createStreamPipeline(renderer, scene, camera,profile={samples:0,renderScale:1}) {
 const composer = new EffectComposer(renderer, new T.WebGLRenderTarget(1, 1, {type:T.HalfFloatType,samples:profile.samples}));
 composer.setPixelRatio(1);
 composer.addPass(new RenderPass(scene, camera));
 composer.addPass(new OutputPass());
 // Dither only after tone mapping and FXAA, immediately before the 8-bit
 // display. Screen-locked noise avoids temporal sparkle and costs no pass.
 const paperGLSL=`
 uniform sampler2D paperMap;
 uniform float paperScale;
 uniform vec2 paperTone;
 float paperHash(vec2 p){vec3 q=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973));q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
 vec2 paperOffset(vec2 p){return vec2(paperHash(p),paperHash(p+19.7))*17.;}
 float paperNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(paperHash(i),paperHash(i+vec2(1.,0.)),f.x),mix(paperHash(i+vec2(0.,1.)),paperHash(i+1.),f.x),f.y);}
 vec3 charcoalPaper(vec2 pixel){
  vec2 p=pixel/paperScale,i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  // Independently offset patches crossfade continuously; the source image no
  // longer repeats at a fixed screen interval. No animation or temporal noise.
  vec2 uv=p*.83;
  float grain=mix(mix(texture2D(paperMap,uv+paperOffset(i)).r,texture2D(paperMap,uv+paperOffset(i+vec2(1.,0.))).r,f.x),mix(texture2D(paperMap,uv+paperOffset(i+vec2(0.,1.))).r,texture2D(paperMap,uv+paperOffset(i+1.)).r,f.x),f.y);
  float sparse=smoothstep(.40,.78,paperNoise(p*6.7+11.));
  float tone=grain*paperTone.x+paperTone.y;
  return vec3(clamp(mix(20./255.,tone,.12+.88*sparse),0.,1.));
 }
 `;
 const outputAA={...FXAAShader,fragmentShader:(paperGLSL+FXAAShader.fragmentShader).replace(
  'gl_FragColor = ApplyFXAA( tDiffuse, resolution.xy, vUv );',
  `gl_FragColor = ApplyFXAA( tDiffuse, resolution.xy, vUv );
   float outputNoise=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))))-.5;
   gl_FragColor.rgb=clamp(gl_FragColor.rgb+vec3(outputNoise/255.),0.,1.);
   ${profile.paperBackground?'if(gl_FragColor.a<.999){vec3 paper=charcoalPaper(gl_FragCoord.xy);gl_FragColor.rgb=mix(paper,gl_FragColor.rgb,gl_FragColor.a);}gl_FragColor.a=1.;':profile.whiteBackground?'gl_FragColor.rgb=mix(vec3(1.),gl_FragColor.rgb,gl_FragColor.a);gl_FragColor.a=1.;':''}`)};
 const aa = new ShaderPass(outputAA);
 let paperTexture=null;let paperReady=Promise.resolve();
 if(profile.paperBackground){
  const fallback=new T.DataTexture(new Uint8Array([20,20,20,255]),1,1);fallback.needsUpdate=true;
  aa.uniforms.paperMap={value:fallback};aa.uniforms.paperScale={value:640*(profile.renderScale??1)};aa.uniforms.paperTone={value:new T.Vector2(1,0)};
  paperReady=new T.TextureLoader().loadAsync('./assets/background/charcoal-paper.webp').then(texture=>{texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.colorSpace=T.NoColorSpace;aa.uniforms.paperTone.value.set(0.38,0.02937255);texture.generateMipmaps=false;texture.minFilter=texture.magFilter=T.LinearFilter;paperTexture=texture;aa.uniforms.paperMap.value=texture;fallback.dispose();}).catch(error=>{console.warn('Paper texture unavailable',error);});
 }

 composer.addPass(aa);
 const metrics = {width:1, height:1, renderScale:profile.renderScale??1, canvasDpr:renderer.getPixelRatio(),deviceProfile:profile.name??'standard', samples:profile.samples, outputDither:true, postPasses:2};
 function resize(width, height) {
  const w = Math.max(1, Math.round(width*metrics.renderScale)), h = Math.max(1, Math.round(height*metrics.renderScale));
  composer.setSize(w, h);
  aa.uniforms.resolution.value.set(1 / w, 1 / h);
  metrics.width = w; metrics.height = h;
 }
 const size = renderer.getSize(new T.Vector2());
 resize(size.x, size.y);
 return {composer, metrics, resize, paperReady, render:()=>composer.render(), dispose:()=>{
  for(const pass of composer.passes)pass.dispose?.();
  paperTexture?.dispose();composer.dispose();
 }};
}

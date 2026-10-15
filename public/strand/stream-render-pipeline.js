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
 const outputAA={...FXAAShader,fragmentShader:FXAAShader.fragmentShader.replace(
  'gl_FragColor = ApplyFXAA( tDiffuse, resolution.xy, vUv );',
  `gl_FragColor = ApplyFXAA( tDiffuse, resolution.xy, vUv );
   float outputNoise=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))))-.5;
   gl_FragColor.rgb=clamp(gl_FragColor.rgb+vec3(outputNoise/255.),0.,1.);`)};
 const aa = new ShaderPass(outputAA);
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
 return {composer, metrics, resize, render:()=>composer.render(), dispose:()=>{
  for(const pass of composer.passes)pass.dispose?.();
  composer.dispose();
 }};
}

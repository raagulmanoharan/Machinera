import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

// Nostalgic film grade: warm tint, lifted blacks, gentle desaturation,
// vignette and animated grain. Runs last, on the tonemapped sRGB image.
const NostalgiaShader = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, amount: { value: 1.0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float time; uniform float amount; varying vec2 vUv;
    float rand(vec2 c){ return fract(sin(dot(c, vec2(12.9898,78.233)))*43758.5453); }
    void main(){
      vec3 col = texture2D(tDiffuse, vUv).rgb;
      vec3 graded = col;
      graded.r *= 1.06; graded.b *= 0.95;                 // warmth
      graded = mix(vec3(0.055,0.05,0.042), graded, 0.93);  // lift blacks -> faded film
      float l = dot(graded, vec3(0.299,0.587,0.114));
      graded = mix(vec3(l), graded, 0.86);                 // slight desaturation
      graded += vec3(0.03,0.018,0.0)*smoothstep(0.55,1.0,l); // warm highlights
      vec2 d = vUv-0.5; float vig = smoothstep(0.9,0.32,length(d));
      graded *= mix(0.80,1.0,vig);                         // vignette
      float g = rand(vUv + fract(time))-0.5;
      graded += g*0.04;                                    // grain
      gl_FragColor = vec4(mix(col, graded, amount), 1.0);
    }`,
};

// Full-screen effect stack: ambient occlusion -> bloom -> anti-alias -> tonemap.
export class Pipeline {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    const size = renderer.getSize(new THREE.Vector2());

    this.composer = new EffectComposer(renderer);
    this.composer.setPixelRatio(renderer.getPixelRatio());
    this.composer.setSize(size.x, size.y);

    this.composer.addPass(new RenderPass(scene, camera));

    // ground-truth ambient occlusion for contact shadows / crevices
    this.gtao = new GTAOPass(scene, camera, size.x, size.y);
    this.gtao.blendIntensity = 0.9;
    try {
      this.gtao.updateGtaoMaterial({ radius: 0.4, distanceExponent: 1.0, thickness: 1.0, scale: 1.0, samples: 16, screenSpaceRadius: false });
    } catch (e) { /* keep defaults across minor version diffs */ }
    this.composer.addPass(this.gtao);

    // gentle bloom only on the brightest highlights (sun glints, headlights)
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.12, 0.5, 0.95);
    this.composer.addPass(this.bloom);

    this.composer.addPass(new SMAAPass(size.x, size.y));
    this.composer.addPass(new OutputPass());

    this.grade = new ShaderPass(NostalgiaShader);
    this.composer.addPass(this.grade);
    this._t = 0;
  }

  setGrade(amount) { this.grade.uniforms.amount.value = amount; }

  setCamera(camera) {
    for (const p of this.composer.passes) {
      if (p.camera) p.camera = camera;
    }
  }

  setSize(w, h) {
    this.composer.setSize(w, h);
  }

  render(dt) {
    this._t += dt || 0.016;
    this.grade.uniforms.time.value = this._t;
    this.composer.render(dt);
  }
}

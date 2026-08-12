import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

// Cinematic grade: filmic S-curve contrast, teal-orange split-tone (cool
// shadows, warm highlights), gentle saturation lift, vignette and fine grain.
// A `night` uniform cools and deepens the image for mood after dark. Runs last,
// on the tonemapped sRGB image.
const CinematicShader = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, amount: { value: 1.0 }, night: { value: 0.0 }, tint: { value: new THREE.Color(1, 1, 1) } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float time; uniform float amount; uniform float night; uniform vec3 tint; varying vec2 vUv;
    float rand(vec2 c){ return fract(sin(dot(c, vec2(12.9898,78.233)))*43758.5453); }
    void main(){
      // subtle analog chromatic aberration — RGB split grows toward the edges
      vec2 dir = vUv - 0.5;
      float ca = 0.0022 * dot(dir, dir) * 4.0;
      vec3 col;
      col.r = texture2D(tDiffuse, vUv + dir * ca).r;
      col.g = texture2D(tDiffuse, vUv).g;
      col.b = texture2D(tDiffuse, vUv - dir * ca).b;
      vec3 g = col;

      // filmic S-curve contrast around mid-grey (richer blacks, controlled highs)
      g = clamp((g - 0.5) * 1.14 + 0.5, 0.0, 1.0);
      g = mix(g, g*g*(3.0-2.0*g), 0.22);

      float l = dot(g, vec3(0.2126,0.7152,0.0722));
      // teal-orange split-tone: push shadows cool, highlights warm
      vec3 shadowTint = vec3(0.90, 1.00, 1.10);
      vec3 highTint   = vec3(1.10, 1.02, 0.90);
      g *= mix(shadowTint, highTint, smoothstep(0.15, 0.85, l));

      // saturation lift (a touch more colourful, cinematic)
      g = mix(vec3(l), g, 1.12);

      // warm glow in the brights (sun, lamps)
      g += vec3(0.035,0.022,0.0) * smoothstep(0.7, 1.0, l);

      // night mood: cool the image and drain a little colour (no heavy crush —
      // the world is already dark; headlights and street lamps carry it)
      vec3 nightG = mix(vec3(dot(g, vec3(0.299,0.587,0.114))), g, 0.85) * vec3(0.86,0.94,1.12);
      nightG = clamp((nightG - 0.5) * 1.02 + 0.5, 0.0, 1.0);
      g = mix(g, nightG, night);

      // vignette
      vec2 d = vUv - 0.5; float vig = smoothstep(0.95, 0.30, length(d));
      g *= mix(mix(0.86, 1.0, vig), mix(0.80, 1.0, vig), night);

      // per-mood colour cast (liminal grade)
      g *= tint;

      // film grain — a touch heavier for the gritty analog look
      g += (rand(vUv + fract(time)) - 0.5) * 0.032;

      gl_FragColor = vec4(mix(col, g, amount), 1.0);
    }`,
};

// Full-screen effect stack: AO -> bloom -> anti-alias -> tonemap -> grade.
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

    // bloom on the brightest highlights (sun glints, headlights, street lamps)
    // bloom carries the street-lamp / headlight glow through the fog
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.5, 0.7, 0.7);
    this.composer.addPass(this.bloom);

    this.composer.addPass(new SMAAPass(size.x, size.y));
    this.composer.addPass(new OutputPass());

    this.grade = new ShaderPass(CinematicShader);
    this.composer.addPass(this.grade);
    this._t = 0;
  }

  setGrade(amount) { this.grade.uniforms.amount.value = amount; }
  setNight(n) { this.grade.uniforms.night.value = n; }
  setTint(r, g, b) { this.grade.uniforms.tint.value.setRGB(r, g, b); }

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

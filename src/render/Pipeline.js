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
      vec3 col = texture2D(tDiffuse, vUv).rgb;
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

      // fine film grain
      g += (rand(vUv + fract(time)) - 0.5) * 0.022;

      gl_FragColor = vec4(mix(col, g, amount), 1.0);
    }`,
};

// Volumetric light scattering ("god rays" / Tyndall): radial samples toward the
// sun's screen position accumulate the bright parts of the frame (sky glow,
// haze) into soft shafts. Driven by mood (rays) and the sun's on-screen state.
const GodRaysShader = {
  uniforms: {
    tDiffuse: { value: null },
    sunScreen: { value: new THREE.Vector2(0.5, 0.9) },
    rays: { value: 0.0 },          // overall intensity (mood-driven)
    onScreen: { value: 0.0 },      // 1 when the sun is in front / on screen
    density: { value: 0.6 }, weight: { value: 0.32 }, decay: { value: 0.95 }, threshold: { value: 0.82 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform vec2 sunScreen; uniform float rays, onScreen, density, weight, decay, threshold;
    varying vec2 vUv;
    #define SAMPLES 48
    void main(){
      vec3 base = texture2D(tDiffuse, vUv).rgb;
      float amt = rays * onScreen;
      if (amt < 0.001) { gl_FragColor = vec4(base, 1.0); return; }
      vec2 delta = (vUv - sunScreen) * (density / float(SAMPLES));
      vec2 coord = vUv;
      float illum = 1.0;
      vec3 acc = vec3(0.0);
      for (int i = 0; i < SAMPLES; i++) {
        coord -= delta;
        vec3 s = texture2D(tDiffuse, coord).rgb;
        s = max(s - threshold, 0.0);            // only bright sky/sun scatters
        acc += s * illum * weight;
        illum *= decay;
      }
      // fade shafts as the sun leaves the screen centre
      float edge = smoothstep(1.4, 0.2, length(sunScreen - 0.5));
      vec3 shaft = acc * amt * edge;
      shaft = shaft / (1.0 + shaft * 0.7);   // soft-clamp so bright skies don't blow out
      gl_FragColor = vec4(base + shaft, 1.0);
    }`,
};

// Full-screen effect stack: AO -> bloom -> god rays -> anti-alias -> tonemap.
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
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.28, 0.6, 0.82);
    this.composer.addPass(this.bloom);

    // volumetric light shafts through the mist
    this.godrays = new ShaderPass(GodRaysShader);
    this.composer.addPass(this.godrays);

    this.composer.addPass(new SMAAPass(size.x, size.y));
    this.composer.addPass(new OutputPass());

    this.grade = new ShaderPass(CinematicShader);
    this.composer.addPass(this.grade);
    this._t = 0;
  }

  setGrade(amount) { this.grade.uniforms.amount.value = amount; }
  setNight(n) { this.grade.uniforms.night.value = n; }
  setTint(r, g, b) { this.grade.uniforms.tint.value.setRGB(r, g, b); }
  setRays(intensity) { this.godrays.uniforms.rays.value = intensity; }
  setSunScreen(x, y, onScreen) {
    this.godrays.uniforms.sunScreen.value.set(x, y);
    this.godrays.uniforms.onScreen.value = onScreen;
  }

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

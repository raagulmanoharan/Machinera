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
      float ca = 0.0004 * dot(dir, dir) * 2.0;
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

// Volumetric light: march the view ray (from the camera to the scene depth)
// through the fog and accumulate in-scattering from a set of coloured, directional
// lights — street lamps (warm, pooling down), headlights (white, beaming forward)
// and tail-lights (red, behind the car). A true 3D effect, occluded by geometry
// (via the depth buffer) and added on top of the scene (fog handles extinction).
const MAX_LIGHTS = 8;
const vecArr = () => Array.from({ length: MAX_LIGHTS }, () => new THREE.Vector3());
const VolumetricLightShader = {
  uniforms: {
    tDiffuse: { value: null }, tDepth: { value: null },
    uProjInv: { value: new THREE.Matrix4() }, uCamWorld: { value: new THREE.Matrix4() },
    uCamPos: { value: new THREE.Vector3() }, uFog: { value: 0.02 }, uStrength: { value: 0 }, uTime: { value: 0 },
    uPos: { value: vecArr() }, uCol: { value: vecArr() }, uDir: { value: vecArr() },
    uCone: { value: new Array(MAX_LIGHTS).fill(0) }, uAtt: { value: new Array(MAX_LIGHTS).fill(0.1) },
    uCount: { value: 0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */`
    #include <packing>
    uniform sampler2D tDiffuse, tDepth;
    uniform mat4 uProjInv, uCamWorld; uniform vec3 uCamPos;
    uniform float uFog, uStrength, uTime;
    uniform vec3 uPos[${MAX_LIGHTS}]; uniform vec3 uCol[${MAX_LIGHTS}]; uniform vec3 uDir[${MAX_LIGHTS}];
    uniform float uCone[${MAX_LIGHTS}]; uniform float uAtt[${MAX_LIGHTS}]; uniform int uCount;
    varying vec2 vUv;
    float rnd(vec2 c){ return fract(sin(dot(c, vec2(12.9898,78.233)))*43758.5453); }
    void main(){
      vec3 scene = texture2D(tDiffuse, vUv).rgb;
      float d = unpackRGBAToDepth(texture2D(tDepth, vUv));   // [0,1] non-linear
      vec4 clip = vec4(vUv*2.0-1.0, d*2.0-1.0, 1.0);
      vec4 vp = uProjInv * clip; vp /= vp.w;
      vec3 P = (uCamWorld * vp).xyz;
      if (uStrength <= 0.0 || uCount == 0) { gl_FragColor = vec4(scene, 1.0); return; }
      vec4 clipF = vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
      vec4 vpF = uProjInv * clipF; vpF /= vpF.w;
      vec3 dir = normalize((uCamWorld * vpF).xyz - uCamPos);
      float tMax = (d <= 0.0011) ? 78.0 : min(distance(uCamPos, P), 130.0);
      const int STEPS = 14;
      float stepLen = tMax / float(STEPS);
      float jit = rnd(vUv + fract(uTime)) * stepLen;
      vec3 acc = vec3(0.0);
      for (int i = 0; i < STEPS; i++){
        float t = jit + float(i) * stepLen;
        vec3 p = uCamPos + dir * t;
        vec3 s = vec3(0.0);
        for (int l = 0; l < ${MAX_LIGHTS}; l++){
          if (l >= uCount) break;
          vec3 fromL = p - uPos[l]; float dl = length(fromL); fromL /= max(dl, 0.001);
          float att = 1.0 / (1.0 + uAtt[l] * dl * dl);
          float align = dot(fromL, uDir[l]);                 // p relative to the light's emission dir
          float cone = smoothstep(uCone[l], mix(uCone[l], 1.0, 0.55), align);
          s += uCol[l] * (att * cone);
        }
        acc += s * exp(-uFog * t * 2.6) * stepLen;
      }
      acc = min(acc, vec3(60.0));
      gl_FragColor = vec4(scene + acc * uStrength, 1.0);
    }`,
};

// Full-screen effect stack: AO -> volumetric light -> bloom -> AA -> tonemap -> grade.
export class Pipeline {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    const size = renderer.getSize(new THREE.Vector2());

    this.scene = scene; this.camera = camera;
    // scene depth, packed into RGBA in a plain colour target via a depth prepass
    // (robust everywhere — no DepthTexture) so the volumetric pass can occlude
    // its glow against the geometry
    this.depthRT = new THREE.WebGLRenderTarget(size.x, size.y);
    this.depthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });

    this.composer = new EffectComposer(renderer);
    this.composer.setPixelRatio(renderer.getPixelRatio());
    this.composer.setSize(size.x, size.y);

    this.composer.addPass(new RenderPass(scene, camera));

    // ground-truth ambient occlusion for contact shadows / crevices
    this.gtao = new GTAOPass(scene, camera, size.x, size.y);
    this.gtao.blendIntensity = 0.5;   // subtler AO — avoids grazing-angle sample noise
    try {
      this.gtao.updateGtaoMaterial({ radius: 0.5, distanceExponent: 1.2, thickness: 1.0, scale: 1.0, samples: 16, screenSpaceRadius: false });
    } catch (e) { /* keep defaults across minor version diffs */ }
    this.composer.addPass(this.gtao);

    // volumetric street-lamp light scattering through the fog (true 3D)
    this.volumetric = new ShaderPass(VolumetricLightShader);
    this.volumetric.uniforms.tDepth.value = this.depthRT.texture;
    this.composer.addPass(this.volumetric);

    // bloom — glows the headlight beams and their scatter through the smog, and
    // the dusk horizon. Lower threshold + more strength so the diffused beams
    // read as light blooming in the fog.
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.6, 0.8, 0.85);
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

  // feed the volumetric pass the camera + a list of coloured directional lights.
  // Each light: { pos:Vector3, color:Vector3 (already ×intensity), dir:Vector3
  // (unit emission dir), cone:number (cos outer half-angle), att:number (falloff k) }.
  updateVolumetric(camera, lights, { strength = 0, fog = 0.02 } = {}) {
    const u = this.volumetric.uniforms;
    const n = Math.min(lights ? lights.length : 0, MAX_LIGHTS);
    u.uStrength.value = strength;
    if (strength <= 0 || n === 0) { u.uCount.value = 0; return; }
    camera.updateMatrixWorld();
    u.uProjInv.value.copy(camera.projectionMatrixInverse);
    u.uCamWorld.value.copy(camera.matrixWorld);
    camera.getWorldPosition(u.uCamPos.value);
    u.uFog.value = fog;
    u.uTime.value = this._t;
    for (let i = 0; i < n; i++) {
      const L = lights[i];
      u.uPos.value[i].copy(L.pos);
      u.uCol.value[i].copy(L.color);
      u.uDir.value[i].copy(L.dir);
      u.uCone.value[i] = L.cone;
      u.uAtt.value[i] = L.att;
    }
    u.uCount.value = n;
  }

  setSize(w, h) {
    this.composer.setSize(w, h);
    if (this.depthRT) this.depthRT.setSize(w, h);
  }

  render(dt) {
    this._t += dt || 0.016;
    this.grade.uniforms.time.value = this._t;
    // depth prepass (only when the volumetric glow is active) so it can occlude
    if (this.volumetric.uniforms.uCount.value > 0) {
      const r = this.renderer;
      const prevRT = r.getRenderTarget();
      const prevOverride = this.scene.overrideMaterial;
      const prevBg = this.scene.background;
      const prevClear = r.getClearColor(new THREE.Color()); const prevAlpha = r.getClearAlpha();
      // exclude sky/dust/etc so they don't write depth (would wash the glow)
      const ex = this.depthExcludes || [];
      const vis = ex.map((o) => o.visible);
      ex.forEach((o) => { o.visible = false; });
      this.scene.overrideMaterial = this.depthMaterial;
      this.scene.background = null;
      r.setRenderTarget(this.depthRT);
      r.setClearColor(0x000000, 1); r.clear();     // cleared -> depth 0 -> "open air"
      r.render(this.scene, this.camera);
      this.scene.overrideMaterial = prevOverride;
      this.scene.background = prevBg;
      ex.forEach((o, i) => { o.visible = vis[i]; });
      r.setClearColor(prevClear, prevAlpha);
      r.setRenderTarget(prevRT);
    }
    this.composer.render(dt);
  }
}

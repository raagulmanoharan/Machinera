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
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, amount: { value: 1.0 }, night: { value: 0.0 }, speed: { value: 0.0 }, tint: { value: new THREE.Color(1, 1, 1) } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float time; uniform float amount; uniform float night; uniform float speed; uniform vec3 tint; varying vec2 vUv;
    float rand(vec2 c){ return fract(sin(dot(c, vec2(12.9898,78.233)))*43758.5453); }
    void main(){
      vec2 dir = vUv - 0.5;
      // subtle analog chromatic aberration — RGB split grows toward the edges
      float ca = 0.0004 * dot(dir, dir) * 2.0;
      // forward motion blur: a short radial smear toward the screen centre that
      // grows with speed and toward the edges — velocity reads on screen while
      // the car (centre) stays crisp. The chromatic split rides along each tap.
      float mb = clamp(speed, 0.0, 1.0);
      vec3 col = vec3(0.0);
      const int TAPS = 6;
      for (int i = 0; i < TAPS; i++){
        float sc = 1.0 - (float(i) / float(TAPS)) * mb * 0.16;   // pull toward centre
        vec2 uv = 0.5 + dir * sc;
        col.r += texture2D(tDiffuse, uv + dir * ca).r;
        col.g += texture2D(tDiffuse, uv).g;
        col.b += texture2D(tDiffuse, uv - dir * ca).b;
      }
      col /= float(TAPS);
      vec3 g = col;

      // filmic S-curve: strong contrast so the image has real tonal range —
      // lit surfaces read against the haze instead of dissolving into it
      g = clamp((g - 0.5) * 1.5 + 0.44, 0.0, 1.0);
      g = mix(g, g*g*(3.0-2.0*g), 0.5);

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
      vec3 nightG = mix(vec3(dot(g, vec3(0.299,0.587,0.114))), g, 0.82) * vec3(0.84,0.93,1.14);
      nightG = clamp((nightG - 0.5) * 1.24 + 0.43, 0.0, 1.0);   // real contrast + deep blacks at night
      g = mix(g, nightG, night);

      // vignette
      vec2 d = vUv - 0.5; float vig = smoothstep(0.95, 0.30, length(d));
      g *= mix(mix(0.93, 1.0, vig), mix(0.90, 1.0, vig), night);

      // per-mood colour cast (liminal grade)
      g *= tint;

      // film grain — a touch heavier for the gritty analog look
      g += (rand(vUv + fract(time)) - 0.5) * 0.032;

      // A whisper of warm lift so nothing crushes to pure black — kept tiny, a
      // heavier lift washes the whole frame out and kills contrast.
      vec3 haze = vec3(0.018, 0.011, 0.006);
      g = haze + g * (1.0 - haze);

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
    // interleaved gradient noise — a structured dither that reads far cleaner
    // than white noise for breaking up raymarch banding
    float ign(vec2 p){ return fract(52.9829189 * fract(0.06711056 * p.x + 0.00583715 * p.y)); }
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
      const int STEPS = 20;
      float stepLen = tMax / float(STEPS);
      float jit = ign(gl_FragCoord.xy) * stepLen;   // stable structured dither (no flicker)
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
          float cone = smoothstep(uCone[l], mix(uCone[l], 1.0, 0.78), align);
          s += uCol[l] * (att * cone);
        }
        acc += s * exp(-uFog * t * 2.6) * stepLen;
      }
      acc = min(acc, vec3(60.0));
      gl_FragColor = vec4(scene + acc * uStrength, 1.0);
    }`,
};

// Post chain, matching webgl_shaders_ocean exactly: bloom, then tone-map. That
// is the whole of it — the example runs no AO, no scattering, no antialias pass
// and no colour grade.
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

    // HDR working buffer — the example's `outputBufferType: HalfFloatType`. The
    // bloom threshold of 0.85 only means anything if values above 1 survive to
    // reach it, which an 8-bit buffer would clip away.
    const hdr = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType });
    this.composer = new EffectComposer(renderer, hdr);
    this.composer.setPixelRatio(renderer.getPixelRatio());
    this.composer.setSize(size.x, size.y);

    // The ocean example's post chain, which is one bloom pass:
    //   bloomPass = new UnrealBloomPass( resolution, 1.5, 0.4, 0.85 );
    //   renderer.setEffects( [ bloomPass ] );
    // setEffects is master-only and absent from the pinned three.js, so the same
    // pass runs through EffectComposer: render to HDR (the example's
    // outputBufferType: HalfFloatType), bloom there, then OutputPass to tone-map
    // and convert — what setEffects does internally.
    this.composer.addPass(new RenderPass(scene, camera));

    // Ceiling on the HDR buffer before bloom. Two problems it solves at once:
    // the Preetham sun disc emits radiance orders of magnitude past half-float's
    // 65504 limit, so blooming it raw overflows to Inf, turns NaN and takes the
    // frame to black; and the pass's 0.85 threshold only separates highlights
    // from midtones when values sit in a sane range — against raw radiance
    // everything clears it and the frame blows white.
    this.composer.addPass(new ShaderPass({
      uniforms: { tDiffuse: { value: null }, uMax: { value: 4.0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `uniform sampler2D tDiffuse; uniform float uMax; varying vec2 vUv;
        void main(){ vec4 c = texture2D(tDiffuse, vUv);
          gl_FragColor = vec4(min(c.rgb, vec3(uMax)), c.a); }`,
    }));

    // The example's strength is 1.5, tuned for a camera that views its sun past
    // a cube and through cloud. Ours looks straight down the road at an
    // unobstructed disc on the horizon, which at 1.5 swallows the frame whole.
    // Radius and threshold are the example's.
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.28, 0.4, 0.85);
    this.composer.addPass(this.bloom);

    // Tone-map last, so bloom stays in linear light as the example intends.
    this.composer.addPass(new OutputPass());

    // Everything below stays constructed but out of the chain — the example runs
    // no AO, no scattering, no antialias pass and no colour grade.
    this.gtao = new GTAOPass(scene, camera, size.x, size.y);
    this.gtao.enabled = false;
    this.volumetric = new ShaderPass(VolumetricLightShader);
    this.volumetric.enabled = false;
    this.volumetric.uniforms.tDepth.value = this.depthRT.texture;
    this.grade = new ShaderPass(CinematicShader);
    this.grade.enabled = false;
    this._t = 0;
  }

  setGrade(amount) { this.grade.uniforms.amount.value = amount; }
  setNight(n) { this.grade.uniforms.night.value = n; }
  setSpeed(s) { this.grade.uniforms.speed.value = s; }   // 0..1 → motion blur
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

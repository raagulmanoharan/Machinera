"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

// The mind, rendered as a living glass orb. At rest it is a warm plasma of light;
// when the mind imagines something, the generated image blooms *inside* the orb —
// a dream suspended in glass, refracted through a crystal-ball lens. Everything
// keys off the view-space normal, so the orb can breathe and shimmer without the
// dream swimming. Pure three.js, no heavy React-three layer.

interface Props {
  texture?: string; // the vision to hold (image dataURL, or an SVG data: URL)
  activity?: number; // 0..1 — quickens the light while thinking / listening / speaking
  grow?: number; // 0..1 — the mind's maturity, gently sizing the orb
  className?: string;
}

const VERT = /* glsl */ `
  varying vec3 vNV;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vNV = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// the glass orb — a clear scene held inside a crystal sphere, refracted through
// a crystal-ball lens with a bright fresnel edge and specular glints
const ORB_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uImage;
  uniform float uHasImage;
  uniform float uTime;
  uniform float uActivity;
  varying vec3 vNV;
  varying vec2 vUv;

  void main() {
    float facing = clamp(vNV.z, 0.0, 1.0);
    vec2 base = vNV.xy;              // -1..1 across the visible sphere
    float radius = length(base);

    // gentle crystal-ball refraction, upright, bending a little more at the rim
    float bend = 1.0 + pow(1.0 - facing, 2.0) * 0.28;
    vec2 iuv = 0.5 + base * 0.47 * bend;
    vec3 img = texture2D(uImage, clamp(iuv, 0.0, 1.0)).rgb;
    // bright, luminous, and dreamy: a soft lift so nothing is harsh, but gentle
    // enough that pale dreams don't blow out to white
    img = pow(img, vec3(0.92)) * 1.03;
    img = img * 0.92 + 0.06;

    // a soft crystalline body when the mind is holding nothing yet
    vec3 empty = mix(vec3(0.30, 0.38, 0.46), vec3(0.78, 0.86, 0.94), pow(facing, 1.3));
    vec3 col = mix(empty, img, uHasImage);
    // a gentle atmospheric haze inside the glass — the dream is soft, not sharp
    col = mix(col, vec3(0.86, 0.89, 0.94), 0.07);
    // frosted translucent sheen over the upper glass, light diffusing within it
    float sheen = smoothstep(0.95, 0.0, length(base - vec2(-0.22, 0.30)));
    col = mix(col, col + vec3(0.92, 0.95, 1.0) * 0.45, sheen * 0.32);

    // soft bright fresnel rim — the glass edge catching light
    float fres = pow(1.0 - facing, 2.6);
    col = mix(col, vec3(0.96, 0.98, 1.0), fres * 0.7);
    // soft specular glints — a hint of light on the glass, not hard dots
    col += vec3(1.0) * smoothstep(0.2, 0.0, length(base - vec2(-0.34, 0.42))) * 0.4;
    col += vec3(1.0) * smoothstep(0.12, 0.0, length(base - vec2(0.28, -0.24))) * 0.2;

    // the very edge fades so the bubble melts into the mist
    float a = mix(smoothstep(1.0, 0.90, radius), 1.0, 0.4);
    gl_FragColor = vec4(col, a);
  }
`;

// the smoke — wispy, warm-lit tendrils curling around the sphere. Domain-warped
// fbm, alive and drifting; it hugs the rim and thins into the dark, veiling the
// glass edge while leaving the scene inside clear. This is the dreaming.
const SMOKE_VERT = /* glsl */ `
  varying vec2 vL;
  void main() {
    vL = position.xy;             // plane-local coords; orb rim sits at radius 1
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const SMOKE_FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uActivity;
  varying vec2 vL;
  float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vn(vec2 p){
    vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
    return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y);
  }
  float fbm(vec2 p){
    float s = 0.0, a = 0.5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
    for (int i = 0; i < 6; i++) { s += a * vn(p); p = m * p; a *= 0.5; }
    return s;
  }
  void main() {
    vec2 p = vL;
    float r = length(p);
    float ang = atan(p.y, p.x);
    float t = uTime * 0.05;
    // large, slow, domain-warped billows — soft airy veils, not dense turbulence
    vec2 sw = vec2(cos(t), sin(t)) * 0.2;
    vec2 q = vec2(fbm(p*1.1 + sw + t*0.6), fbm(p*1.1 + vec2(3.2,1.3) - t*0.6));
    vec2 w = vec2(fbm(p*1.1 + q*1.8 + vec2(1.7,9.2) + t), fbm(p*1.1 + q*1.8 + vec2(8.3,2.8) - t));
    float f = fbm(p*1.6 + w*2.0 + ang*0.1);
    // carve delicate wisps: keep the bright filaments, let the gaps go clear
    float wisp = smoothstep(0.46, 0.72, f);
    float inner = smoothstep(0.66, 0.98, r);        // gathers around the bubble
    float outer = 1.0 - smoothstep(1.05, 1.95, r);  // thins softly into the dark
    float a = clamp(wisp * inner * outer * 0.6, 0.0, 1.0);
    // pale mist, glowing warm where it hugs the bubble (backlit), cooling outward
    vec3 warm = vec3(1.0, 0.86, 0.62);
    vec3 pale = vec3(0.84, 0.86, 0.90);
    vec3 col = mix(pale, warm, smoothstep(1.25, 0.82, r) * 0.7);
    gl_FragColor = vec4(col, a * (0.9 + 0.2 * uActivity));
  }
`;

// a soft radial-gradient sprite behind the bubble — the warm glow that backlights
// the mist. Two are used: a broad diffuse wash and a brighter ring hugging the rim.
function makeGlowTexture(stops: [number, string][]): THREE.Texture {
  const s = 256;
  const cv = document.createElement("canvas");
  cv.width = cv.height = s;
  const ctx = cv.getContext("2d")!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  for (const [o, c] of stops) g.addColorStop(o, c);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export default function DreamOrb({ texture, activity = 0, grow = 0.4, className }: Props) {
  const mount = useRef<HTMLDivElement>(null);
  // live values the animation loop reads without re-initialising the scene
  const live = useRef({ activity, grow, targetHasImage: texture ? 1 : 0 });
  live.current.activity = activity;
  live.current.grow = grow;

  const api = useRef<{
    setTexture: (url?: string) => void;
  } | null>(null);

  // build the scene once
  useEffect(() => {
    const el = mount.current;
    if (!el) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, premultipliedAlpha: false });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    el.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 3.25);

    const uniforms = {
      uImage: { value: null as THREE.Texture | null },
      uHasImage: { value: 0 },
      uTime: { value: 0 },
      uActivity: { value: 0 },
    };
    const group = new THREE.Group();
    scene.add(group);

    // broad soft warm wash, far behind
    const glowTexA = makeGlowTexture([
      [0.0, "rgba(255,214,158,0.5)"],
      [0.45, "rgba(255,182,120,0.3)"],
      [0.8, "rgba(255,165,115,0.08)"],
      [1.0, "rgba(0,0,0,0)"],
    ]);
    const glowMatA = new THREE.MeshBasicMaterial({
      map: glowTexA, transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, depthTest: false, opacity: 0.9,
    });
    const glowA = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 5.4), glowMatA);
    glowA.position.z = -1.0;
    glowA.renderOrder = -3;
    group.add(glowA);

    // a brighter gold ring hugging the bubble's rim — the backlight
    const glowTexB = makeGlowTexture([
      [0.0, "rgba(0,0,0,0)"],
      [0.55, "rgba(255,216,170,0)"],
      [0.74, "rgba(255,218,175,0.4)"],
      [0.9, "rgba(255,200,150,0.09)"],
      [1.0, "rgba(0,0,0,0)"],
    ]);
    const glowMatB = new THREE.MeshBasicMaterial({
      map: glowTexB, transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, depthTest: false, opacity: 1.0,
    });
    const glowB = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 3.3), glowMatB);
    glowB.position.z = -0.5;
    glowB.renderOrder = -2;
    group.add(glowB);

    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(1, 128, 128),
      new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: ORB_FRAG, uniforms, transparent: true })
    );
    orb.renderOrder = 0;
    group.add(orb);

    // the dreaming smoke, drawn in front so it veils the rim
    const smokeMat = new THREE.ShaderMaterial({
      vertexShader: SMOKE_VERT,
      fragmentShader: SMOKE_FRAG,
      uniforms: { uTime: uniforms.uTime, uActivity: uniforms.uActivity },
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });
    const smoke = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2), smokeMat);
    smoke.position.z = 0.5;
    smoke.renderOrder = 2;
    group.add(smoke);

    // a placeholder transparent pixel so the sampler is always valid
    const blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1, THREE.RGBAFormat);
    blank.needsUpdate = true;
    uniforms.uImage.value = blank;

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    let texToken = 0;
    const setTexture = (url?: string) => {
      live.current.targetHasImage = url ? 1 : 0;
      if (!url) return;
      const my = ++texToken;
      loader.load(
        url,
        (tex) => {
          if (my !== texToken) { tex.dispose(); return; }
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.minFilter = THREE.LinearFilter;
          const prev = uniforms.uImage.value;
          uniforms.uImage.value = tex;
          if (prev && prev !== blank) prev.dispose();
          live.current.targetHasImage = 1;
        },
        undefined,
        () => { /* keep the plasma if the dream fails to load */ }
      );
    };
    api.current = { setTexture };
    setTexture(texture);

    const resize = () => {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    let raf = 0;
    const clock = new THREE.Clock();
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      uniforms.uTime.value += dt;
      // ease activity + the plasma↔dream dissolve
      uniforms.uActivity.value += (live.current.activity - uniforms.uActivity.value) * Math.min(1, dt * 4);
      uniforms.uHasImage.value += (live.current.targetHasImage - uniforms.uHasImage.value) * Math.min(1, dt * 2.2);
      // breathe, and size gently with maturity
      const s = (0.62 + live.current.grow * 0.1) * (1 + 0.02 * Math.sin(uniforms.uTime.value * 0.9));
      group.scale.setScalar(s);
      // the glow breathes softly, brighter while the mind is active
      const pulse = 0.86 + 0.1 * Math.sin(uniforms.uTime.value * 1.1);
      glowMatA.opacity = pulse * (0.85 + 0.4 * uniforms.uActivity.value);
      glowMatB.opacity = pulse * (0.9 + 0.4 * uniforms.uActivity.value);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      api.current = null;
      orb.geometry.dispose();
      (orb.material as THREE.Material).dispose();
      glowA.geometry.dispose();
      glowMatA.dispose();
      glowTexA.dispose();
      glowB.geometry.dispose();
      glowMatB.dispose();
      glowTexB.dispose();
      smoke.geometry.dispose();
      smokeMat.dispose();
      const t = uniforms.uImage.value;
      if (t && t !== blank) t.dispose();
      blank.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
    };
  }, []);

  // swap the dream when the vision changes
  useEffect(() => {
    api.current?.setTexture(texture);
  }, [texture]);

  return <div ref={mount} className={className} aria-hidden />;
}

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

    // crystal-ball refraction: an upright fisheye that bends harder near the rim
    float bend = 1.0 + pow(1.0 - facing, 2.0) * 0.35;
    vec2 iuv = 0.5 + base * 0.46 * bend;
    vec3 img = texture2D(uImage, clamp(iuv, 0.0, 1.0)).rgb;

    // a cool crystalline body when the mind is holding nothing yet
    vec3 empty = mix(vec3(0.10, 0.16, 0.22), vec3(0.5, 0.62, 0.72), pow(facing, 1.5));
    vec3 col = mix(empty, img, uHasImage);
    col *= 1.02;

    // bright fresnel rim — the glass edge catching light
    float fres = pow(1.0 - facing, 3.0);
    col = mix(col, vec3(0.95, 0.97, 1.0), fres * 0.6);
    // a darker ring just inside the rim, reading as glass thickness
    col *= 1.0 - 0.25 * smoothstep(0.72, 0.99, radius);
    // specular glints, like light on the curve of the glass
    float g1 = smoothstep(0.34, 0.0, length(base - vec2(-0.36, 0.40)));
    col += vec3(1.0) * g1 * facing * 0.5;
    float g2 = smoothstep(0.13, 0.0, length(base - vec2(0.30, -0.28)));
    col += vec3(1.0) * g2 * 0.28;

    gl_FragColor = vec4(col, 1.0);
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
    for (int i = 0; i < 5; i++) { s += a * vn(p); p = m * p; a *= 0.5; }
    return s;
  }
  void main() {
    vec2 p = vL;
    float r = length(p);
    float ang = atan(p.y, p.x);
    float t = uTime * 0.06;
    vec2 sw = vec2(cos(t*1.3), sin(t*1.3)) * 0.15;
    vec2 q = vec2(fbm(p*1.8 + sw + t), fbm(p*1.8 + vec2(5.2,1.3) - t));
    vec2 w = vec2(fbm(p*1.8 + q*2.2 + vec2(1.7,9.2) + t*1.1), fbm(p*1.8 + q*2.2 + vec2(8.3,2.8) - t*0.9));
    float smoke = fbm(p*3.1 + w*2.6 + ang*0.2);
    smoke = pow(clamp(smoke, 0.0, 1.0), 2.1);
    float inner = smoothstep(0.80, 1.02, r);        // veils the rim, clear inside
    float outer = 1.0 - smoothstep(1.04, 1.52, r);  // gone before the corners
    float a = clamp(smoke * inner * outer * 1.35, 0.0, 1.0);
    vec3 pale = vec3(0.78, 0.78, 0.80);
    float backlit = smoothstep(1.16, 0.98, r);
    vec3 col = mix(pale, vec3(1.0, 0.70, 0.34), backlit * 0.9);
    col *= 0.7 + 0.55 * smoke;
    gl_FragColor = vec4(col, a * (0.85 + 0.3 * uActivity));
  }
`;

// a soft radial-gradient sprite standing behind the orb — the orb occludes its
// bright centre, leaving a warm bloom that hugs the silhouette and fades outward
function makeGlowTexture(): THREE.Texture {
  const s = 256;
  const cv = document.createElement("canvas");
  cv.width = cv.height = s;
  const ctx = cv.getContext("2d")!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0.0, "rgba(255,190,120,0.5)");
  g.addColorStop(0.4, "rgba(255,150,90,0.28)");
  g.addColorStop(0.75, "rgba(255,140,90,0.06)");
  g.addColorStop(1.0, "rgba(0,0,0,0.0)");
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

    // the bloom halo, drawn first and behind so the orb occludes its centre
    const glowTex = makeGlowTexture();
    const glowMat = new THREE.MeshBasicMaterial({
      map: glowTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      opacity: 0.9,
    });
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2), glowMat);
    glow.position.z = -0.8;
    glow.renderOrder = -2;
    group.add(glow);

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
    const smoke = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 4.0), smokeMat);
    smoke.position.z = 0.6;
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
      const s = (0.78 + live.current.grow * 0.12) * (1 + 0.02 * Math.sin(uniforms.uTime.value * 0.9));
      group.scale.setScalar(s);
      // the halo pulses softly, brighter while the mind is active
      glowMat.opacity =
        (0.72 + 0.14 * Math.sin(uniforms.uTime.value * 1.3)) * (0.85 + 0.5 * uniforms.uActivity.value);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      api.current = null;
      orb.geometry.dispose();
      (orb.material as THREE.Material).dispose();
      glow.geometry.dispose();
      glowMat.dispose();
      glowTex.dispose();
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

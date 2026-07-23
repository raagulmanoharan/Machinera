"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

// The mind, rendered as a crystal orb holding a half-formed memory. A real glass
// sphere (MeshPhysicalMaterial transmission) refracts and reflects an inner
// projection of what the mind imagines; the projection drifts and dissolves like
// a thought only partly conjured; a soft warm glow and delicate mist wreathe it.
// Physically-based: environment map for glass reflections, ACES tone mapping.

interface Props {
  texture?: string; // the vision to hold (image dataURL, or an SVG data: URL)
  activity?: number; // 0..1 — quickens the glow while thinking / listening / speaking
  grow?: number; // 0..1 — the mind's maturity, gently sizing the orb
  className?: string;
}

// shared fbm noise
const NOISE = /* glsl */ `
  float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vn(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
  float fbm(vec2 p){ float s=0.0,a=0.5; mat2 m=mat2(1.6,1.2,-1.2,1.6);
    for(int i=0;i<5;i++){ s+=a*vn(p); p=m*p; a*=0.5; } return s; }
`;

// view-space normal, used by the inner projection and the halo
const NORMAL_VERT = /* glsl */ `
  varying vec3 vNV;
  void main() { vNV = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

// the half-formed thought, painted on an inner sphere the glass then refracts
const INNER_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uImage;
  uniform float uTime;
  varying vec3 vNV;
  ${NOISE}
  void main() {
    vec2 base = vNV.xy;
    float t = uTime * 0.08;
    // the projection drifts, half-formed
    vec2 warp = vec2(fbm(base*2.2 + t), fbm(base*2.2 + vec2(4.0,2.0) - t)) - 0.5;
    vec2 iuv = clamp(0.5 + base*0.5 + warp*0.05, 0.0, 1.0);
    vec2 ca = base * 0.005;                 // subtle chromatic aberration
    vec3 img = vec3(texture2D(uImage, iuv+ca).r, texture2D(uImage, iuv).g, texture2D(uImage, iuv-ca).b);
    img = img / (1.0 + 0.35 * max(max(img.r, img.g), img.b));  // tame highlights
    img = pow(img, vec3(0.95)) * 1.25;
    // dissolve into drifting mist where the thought hasn't formed, and near the rim
    float d = fbm(base*3.0 + t*0.6)*0.6 + fbm(base*6.0 - t)*0.4;
    float form = smoothstep(0.32, 0.72, d) * smoothstep(1.02, 0.35, length(base));
    vec3 mist = vec3(0.62, 0.66, 0.72) * 0.55;
    gl_FragColor = vec4(mix(mist, img, clamp(form + 0.22, 0.0, 1.0)), 1.0);
  }
`;

// a faint warm fresnel rim glow
const HALO_FRAG = /* glsl */ `
  precision highp float;
  varying vec3 vNV;
  void main() {
    float facing = clamp(vNV.z, 0.0, 1.0);
    float glow = pow(1.0 - facing, 3.6);
    vec3 c = mix(vec3(1.0, 0.72, 0.42), vec3(1.0, 0.88, 0.62), glow);
    gl_FragColor = vec4(c, glow * 0.22);
  }
`;

// delicate mist curling around the orb
const MIST_VERT = /* glsl */ `
  varying vec2 vL;
  void main() { vL = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const MIST_FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  varying vec2 vL;
  ${NOISE}
  void main() {
    vec2 p = vL; float r = length(p); float t = uTime * 0.05;
    vec2 sw = vec2(cos(t), sin(t)) * 0.2;
    vec2 q = vec2(fbm(p*1.1 + sw + t*0.6), fbm(p*1.1 + vec2(3.2,1.3) - t*0.6));
    vec2 w = vec2(fbm(p*1.1 + q*1.8 + vec2(1.7,9.2) + t), fbm(p*1.1 + q*1.8 + vec2(8.3,2.8) - t));
    float f = fbm(p*1.6 + w*2.0);
    float wisp = smoothstep(0.30, 0.86, f);
    float inr = smoothstep(0.40, 0.86, r);
    float outr = 1.0 - smoothstep(0.98, 1.85, r);
    float a = clamp(wisp * inr * outr * 0.5, 0.0, 1.0);
    vec3 col = mix(vec3(0.84, 0.86, 0.90), vec3(1.0, 0.86, 0.62), smoothstep(1.25, 0.82, r) * 0.7);
    gl_FragColor = vec4(col, a);
  }
`;

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

// a dim studio with a warm horizon — what the glass reflects and refracts
function makeEnvEquirect(): THREE.Texture {
  const w = 512, ht = 256;
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = ht;
  const c = cv.getContext("2d")!;
  const g = c.createLinearGradient(0, 0, 0, ht);
  g.addColorStop(0, "#080b10");
  g.addColorStop(0.44, "#1b2027");
  g.addColorStop(0.5, "#7a5c38");
  g.addColorStop(0.56, "#1a140e");
  g.addColorStop(1, "#050606");
  c.fillStyle = g; c.fillRect(0, 0, w, ht);
  const rg = c.createRadialGradient(w * 0.32, ht * 0.36, 0, w * 0.32, ht * 0.36, 90);
  rg.addColorStop(0, "rgba(255,236,205,0.5)");
  rg.addColorStop(1, "rgba(255,236,205,0)");
  c.fillStyle = rg; c.fillRect(0, 0, w, ht);
  const tex = new THREE.CanvasTexture(cv);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export default function DreamOrb({ texture, activity = 0, grow = 0.4, className }: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const live = useRef({ activity, grow });
  live.current.activity = activity;
  live.current.grow = grow;
  const api = useRef<{ setTexture: (url?: string) => void } | null>(null);

  useEffect(() => {
    const el = mount.current;
    if (!el) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, premultipliedAlpha: false });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.56;
    el.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 3.25);

    // environment for realistic glass reflections/refractions
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const equirect = makeEnvEquirect();
    const envMap = pmrem.fromEquirectangular(equirect).texture;
    scene.environment = envMap;
    scene.add(new THREE.AmbientLight(0xffffff, 0.12));
    const key = new THREE.DirectionalLight(0xffe6c0, 0.45);
    key.position.set(-2, 2, 3);
    scene.add(key);

    const uTime = { value: 0 };
    const uImage = { value: null as THREE.Texture | null };
    const group = new THREE.Group();
    scene.add(group);

    // soft warm glow, far behind
    const glowTex = makeGlowTexture([
      [0.0, "rgba(255,208,152,0.72)"],
      [0.38, "rgba(255,182,122,0.4)"],
      [0.72, "rgba(255,168,118,0.12)"],
      [1.0, "rgba(0,0,0,0)"],
    ]);
    const glowMat = new THREE.MeshBasicMaterial({
      map: glowTex, transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, depthTest: false, opacity: 0.9,
    });
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 5.2), glowMat);
    glow.position.z = -1.0; glow.renderOrder = -3;
    group.add(glow);

    // the inner projection — the half-formed memory (opaque, refracted by the glass)
    const blank = new THREE.DataTexture(new Uint8Array([120, 120, 120, 255]), 1, 1, THREE.RGBAFormat);
    blank.needsUpdate = true;
    uImage.value = blank;
    const inner = new THREE.Mesh(
      new THREE.SphereGeometry(0.99, 96, 96),
      new THREE.ShaderMaterial({ vertexShader: NORMAL_VERT, fragmentShader: INNER_FRAG, uniforms: { uImage, uTime } })
    );
    inner.renderOrder = 0;
    group.add(inner);

    // the glass shell — real physical glass, a thin bubble
    const glass = new THREE.Mesh(
      new THREE.SphereGeometry(1.0, 96, 96),
      new THREE.MeshPhysicalMaterial({
        roughness: 0.12, metalness: 0.0, transmission: 1.0, thickness: 0.12, ior: 1.33,
        transparent: true, envMapIntensity: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.18,
        attenuationColor: new THREE.Color(0xcfe6ff), attenuationDistance: 6.0,
      })
    );
    glass.renderOrder = 1;
    group.add(glass);

    // faint warm rim glow + delicate mist
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(1.2, 64, 64),
      new THREE.ShaderMaterial({
        vertexShader: NORMAL_VERT, fragmentShader: HALO_FRAG,
        transparent: true, blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false,
      })
    );
    halo.renderOrder = 2;
    group.add(halo);
    const mistMat = new THREE.ShaderMaterial({
      vertexShader: MIST_VERT, fragmentShader: MIST_FRAG, uniforms: { uTime },
      transparent: true, depthWrite: false, depthTest: false,
    });
    const mist = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2), mistMat);
    mist.position.z = 0.6; mist.renderOrder = 3;
    group.add(mist);

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    let texToken = 0;
    const setTexture = (url?: string) => {
      if (!url) return;
      const my = ++texToken;
      loader.load(url, (tex) => {
        if (my !== texToken) { tex.dispose(); return; }
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearFilter;
        const prev = uImage.value;
        uImage.value = tex;
        if (prev && prev !== blank) prev.dispose();
      }, undefined, () => { /* keep the current dream if it fails to load */ });
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
    let act = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      uTime.value += clock.getDelta();
      act += (live.current.activity - act) * 0.05;
      const s = (0.6 + live.current.grow * 0.12) * (1 + 0.02 * Math.sin(uTime.value * 0.9));
      group.scale.setScalar(s);
      glowMat.opacity = (0.82 + 0.1 * Math.sin(uTime.value * 1.1)) * (0.85 + 0.5 * act);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      api.current = null;
      inner.geometry.dispose(); (inner.material as THREE.Material).dispose();
      glass.geometry.dispose(); (glass.material as THREE.Material).dispose();
      halo.geometry.dispose(); (halo.material as THREE.Material).dispose();
      mist.geometry.dispose(); mistMat.dispose();
      glow.geometry.dispose(); glowMat.dispose(); glowTex.dispose();
      const t = uImage.value; if (t && t !== blank) t.dispose();
      blank.dispose();
      envMap.dispose(); equirect.dispose(); pmrem.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    api.current?.setTexture(texture);
  }, [texture]);

  return <div ref={mount} className={className} aria-hidden />;
}

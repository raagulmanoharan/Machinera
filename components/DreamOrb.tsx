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

const ORB_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uImage;
  uniform float uHasImage;
  uniform float uTime;
  uniform float uActivity;
  varying vec3 vNV;
  varying vec2 vUv;

  const vec3 AMBER = vec3(1.0, 0.72, 0.47);
  const vec3 CORAL = vec3(1.0, 0.55, 0.45);
  const vec3 CREAM = vec3(1.0, 0.95, 0.88);

  float n2(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
  float sm(vec2 p){
    vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
    return mix(mix(n2(i), n2(i+vec2(1,0)), f.x), mix(n2(i+vec2(0,1)), n2(i+vec2(1,1)), f.x), f.y);
  }

  void main() {
    float facing = clamp(vNV.z, 0.0, 1.0);
    float rim = pow(1.0 - facing, 2.3);

    // the dream, as a crystal-ball fisheye of the image — kept luminous
    vec2 wob = vec2(sin(uTime*0.5 + vNV.y*3.0), cos(uTime*0.4 + vNV.x*3.0)) * 0.012;
    vec2 iuv = clamp(0.5 + vNV.xy * 0.52 + wob, 0.0, 1.0);
    vec3 img = texture2D(uImage, iuv).rgb * 1.18;

    // the resting mind — a slow warm plasma
    float t = uTime * 0.22;
    float pl = sm(vNV.xy*2.5 + t)*0.6 + sm(vNV.xy*5.0 - t*1.2)*0.4;
    vec3 plasma = mix(CORAL*0.5, AMBER, pl);
    plasma += CREAM * pow(facing, 2.5) * (0.5 + 0.15*sin(uTime*1.1));

    vec3 col = mix(plasma, img, uHasImage);

    // the orb always glows from within, like lit glass — a warm ambient floor and
    // a soft inner core keep even a dim dream luminous, never a dark hole
    col += AMBER * 0.14;
    col += CREAM * pow(facing, 3.0) * 0.22 * (1.0 - 0.4 * uHasImage);

    // warm glass rim catching the light
    col += mix(AMBER, CREAM, 0.35) * rim * (0.5 + 0.5*uActivity);
    // only the extreme edge falls into the dusk
    col *= 0.88 + 0.12*facing;

    gl_FragColor = vec4(col, 1.0);
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
  g.addColorStop(0.0, "rgba(255,196,140,0.95)");
  g.addColorStop(0.35, "rgba(255,150,120,0.55)");
  g.addColorStop(0.7, "rgba(255,130,110,0.14)");
  g.addColorStop(1.0, "rgba(255,120,110,0.0)");
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
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), glowMat);
    glow.position.z = -0.6;
    glow.renderOrder = -1;
    group.add(glow);

    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(1, 128, 128),
      new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: ORB_FRAG, uniforms, transparent: true })
    );
    orb.renderOrder = 1;
    group.add(orb);

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
      const s = (0.6 + live.current.grow * 0.22) * (1 + 0.02 * Math.sin(uniforms.uTime.value * 0.9));
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

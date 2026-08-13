import * as THREE from 'three';
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js';

const noise = new ImprovedNoise();

function fbm(x, y, oct, freq, z = 0) {
  let sum = 0, amp = 0.5, f = freq;
  for (let i = 0; i < oct; i++) {
    sum += amp * noise.noise(x * f, y * f, z);
    f *= 2; amp *= 0.5;
  }
  return sum;
}

// Tangent-space normal map derived from procedural fractal height.
export function makeNormalMap(size = 512, { freq = 0.03, oct = 5, strength = 2.2, z = 0 } = {}) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const h = (x, y) => fbm((x + size) % size, (y + size) % size, oct, freq, z);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = h(x + 1, y) - h(x - 1, y);
      const dy = h(x, y + 1) - h(x, y - 1);
      let nx = -dx * strength, ny = -dy * strength, nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len; ny /= len; nz /= len;
      const i = (y * size + x) * 4;
      img.data[i] = (nx * 0.5 + 0.5) * 255;
      img.data[i + 1] = (ny * 0.5 + 0.5) * 255;
      img.data[i + 2] = (nz * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

// Grayscale roughness variation.
export function makeRoughnessMap(size = 512, { freq = 0.02, oct = 4, base = 0.7, range = 0.3, z = 3 } = {}) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm((x + size) % size, (y + size) % size, oct, freq, z) + 0.5;
      const v = Math.max(0, Math.min(1, base + (n - 0.5) * 2 * range));
      const i = (y * size + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

// Asphalt albedo with aggregate speckle + faint lane wear.
export function makeAsphaltAlbedo(size = 512) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = '#2f3237';
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < size * size * 0.14; i++) {
    const v = 30 + Math.floor(Math.random() * 55);
    g.fillStyle = `rgb(${v},${v},${v + 3})`;
    const s = 0.8 + Math.random() * 1.8;
    g.fillRect(Math.random() * size, Math.random() * size, s, s);
  }
  // subtle cracks
  g.strokeStyle = 'rgba(15,15,18,0.5)';
  g.lineWidth = 1;
  for (let i = 0; i < 10; i++) {
    g.beginPath();
    let x = Math.random() * size, y = Math.random() * size;
    g.moveTo(x, y);
    for (let s = 0; s < 8; s++) { x += (Math.random() - 0.5) * 60; y += (Math.random() - 0.5) * 60; g.lineTo(x, y); }
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---------- concrete tunnel lining ----------
// Cast-in-place tunnel concrete: albedo + matching normal and roughness.
//
// Seamless by construction — the value-noise lattice wraps on a fixed integer
// period, so the set tiles down a 9 km bore with no visible repeat seam and
// costs nothing to download. That matters more than raw fidelity here: bitmap
// scans of this quality would add megabytes to the bundle and still need
// hand-work to tile.
//
// The texture's x axis runs up the wall and over the arch, its y axis along the
// tunnel — so soot streaks are stretched along x (they run *down* a wall) and
// the pour lines band across it.
const CONC_P = 8;                       // noise lattice period, in noise units

function _hashT(x, y, p) {
  x = ((x % p) + p) % p; y = ((y % p) + p) % p;
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function _vnoiseT(x, y, p) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = _hashT(xi, yi, p), b = _hashT(xi + 1, yi, p);
  const c = _hashT(xi, yi + 1, p), d = _hashT(xi + 1, yi + 1, p);
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}
function _fbmT(x, y, p, oct = 5) {
  let sum = 0, amp = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { sum += amp * _vnoiseT(x * f, y * f, p * f); f *= 2; amp *= 0.5; }
  return sum;
}

// Shared field: everything (albedo, height, roughness) reads from this so the
// three maps agree — soot sits in the same places the surface is dirty.
function _concreteAt(u, v) {
  const P = CONC_P;
  const x = u * P, y = v * P;
  const grain = _fbmT(x * 2.0, y * 2.0, P * 2, 5);                 // fine aggregate mottle
  const blotch = _fbmT(x * 0.6 + 11, y * 0.6 - 7, P, 4);           // broad damp patches
  // soot: stretched along x so it reads as running down the wall
  const soot = Math.max(0, _fbmT(x * 0.35 + 3, y * 5.0 + 21, P * 5, 4) - 0.42) * 2.4;
  // efflorescence: pale mineral bloom, only in the wetter blotches
  const efflo = Math.max(0, blotch - 0.62) * 2.6 * Math.max(0, 0.55 - soot);
  // pour lines banding across the wall, every 1/4 tile, softened by noise
  const band = Math.abs(((v * 4 + grain * 0.12) % 1) - 0.5);
  const joint = Math.max(0, 1 - band * 14);
  return { grain, blotch, soot, efflo, joint };
}

export function makeConcrete(size = 512) {
  const mk = () => { const c = document.createElement('canvas'); c.width = c.height = size; return c; };
  const cA = mk(), cR = mk();
  const gA = cA.getContext('2d'), gR = cR.getContext('2d');
  const iA = gA.createImageData(size, size), iR = gR.createImageData(size, size);
  const H = new Float32Array(size * size);

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const i = py * size + px;
      const f = _concreteAt(px / size, py / size);
      // base grey-beige, mottled, darkened by soot, lifted by mineral bloom
      let r = 0.50, g = 0.485, b = 0.455;
      const m = 0.78 + f.grain * 0.44;
      r *= m; g *= m; b *= m;
      const s = Math.min(0.72, f.soot);
      r *= 1 - s * 0.78; g *= 1 - s * 0.80; b *= 1 - s * 0.80;      // soot cools slightly
      const e = Math.min(0.5, f.efflo);
      r += e * 0.34; g += e * 0.34; b += e * 0.31;
      const dampen = Math.max(0, f.blotch - 0.5) * 0.5;             // damp patches read darker
      r *= 1 - dampen; g *= 1 - dampen; b *= 1 - dampen * 0.96;
      r *= 1 - f.joint * 0.30; g *= 1 - f.joint * 0.30; b *= 1 - f.joint * 0.30;

      const k = i * 4;
      iA.data[k] = Math.max(0, Math.min(255, r * 255));
      iA.data[k + 1] = Math.max(0, Math.min(255, g * 255));
      iA.data[k + 2] = Math.max(0, Math.min(255, b * 255));
      iA.data[k + 3] = 255;

      // roughness: concrete is rough; soot rougher still, damp patches smoother
      const rough = 0.90 + s * 0.07 - dampen * 0.30 - f.efflo * 0.05;
      const rv = Math.max(0, Math.min(1, rough)) * 255;
      iR.data[k] = iR.data[k + 1] = iR.data[k + 2] = rv;
      iR.data[k + 3] = 255;

      // height drives the normal map: aggregate relief, recessed pour lines
      H[i] = f.grain * 0.8 + f.blotch * 0.12 - f.joint * 0.55;
    }
  }
  gA.putImageData(iA, 0, 0); gR.putImageData(iR, 0, 0);

  // normal map from the height field, sampled with wrap so it stays seamless
  const cN = mk(), gN = cN.getContext('2d');
  const iN = gN.createImageData(size, size);
  const at = (x, y) => H[(((y % size) + size) % size) * size + (((x % size) + size) % size)];
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const dx = (at(px + 1, py) - at(px - 1, py)) * 3.4;
      const dy = (at(px, py + 1) - at(px, py - 1)) * 3.4;
      const len = Math.hypot(dx, dy, 1);
      const k = (py * size + px) * 4;
      iN.data[k] = ((-dx / len) * 0.5 + 0.5) * 255;
      iN.data[k + 1] = ((-dy / len) * 0.5 + 0.5) * 255;
      iN.data[k + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      iN.data[k + 3] = 255;
    }
  }
  gN.putImageData(iN, 0, 0);

  const tex = (canvas, srgb) => {
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  return { map: tex(cA, true), normalMap: tex(cN, false), roughnessMap: tex(cR, false) };
}

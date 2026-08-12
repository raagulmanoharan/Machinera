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

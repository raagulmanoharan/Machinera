import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ROAD, roadX, roadSlope, distToRoad } from './road.js';
import { makeNormalMap, makeRoughnessMap, makeAsphaltAlbedo } from '../render/textures.js';

// ---------- deterministic noise ----------
function hash2(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}
function fbm(x, y) {
  let sum = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < 5; i++) { sum += amp * vnoise(x * freq, y * freq); freq *= 2; amp *= 0.5; }
  return sum;
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FLAT_TO = ROAD.halfWidth + ROAD.shoulder + 1.8;
const CORRIDOR_Y = -0.15;

export function heightAt(x, z) {
  const c = distToRoad(x, z);
  if (c <= FLAT_TO) return CORRIDOR_Y;
  const ramp = smoothstep(FLAT_TO, FLAT_TO + 22, c);
  const hills = fbm(x * 0.0055, z * 0.0055) * 11 + fbm(x * 0.02, z * 0.02) * 1.4;
  const mnt = smoothstep(150, 420, c) * (fbm(x * 0.0016 + 10, z * 0.0016 - 4) * 150 + 30);
  return CORRIDOR_Y + ramp * hills + mnt;
}

export class ProceduralWorld {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.heightAt = heightAt;
    this.carStart = { pos: new THREE.Vector3(roadX(0), 0, 0), heading: 0 };
    this._build();
  }

  dispose() {
    this.group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => { if (m.map) m.map.dispose(); if (m.normalMap) m.normalMap.dispose(); m.dispose(); });
      }
    });
    this.scene.remove(this.group);
  }

  _build() {
    this._terrain();
    this._roadMesh();
    this._scatter();
    this._guardrails();
  }

  // ---------- terrain ----------
  _terrain() {
    const zStart = ROAD.lengthStart - 200;
    const zEnd = ROAD.lengthEnd + 200;
    const halfX = 520;
    const stepZ = 12, stepX = 12;
    const nz = Math.ceil((zEnd - zStart) / stepZ);
    const nx = Math.ceil((halfX * 2) / stepX);

    const geo = new THREE.PlaneGeometry(halfX * 2, zEnd - zStart, nx, nz);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const uv = geo.attributes.uv;

    const cGrass = new THREE.Color(0x3f6b2e);
    const cGrass2 = new THREE.Color(0x2c5423);
    const cRock = new THREE.Color(0x6b6157);
    const cSnow = new THREE.Color(0xf3f6fb);
    const tmp = new THREE.Color();
    const zMid = (zStart + zEnd) / 2;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i) + zMid;
      pos.setZ(i, z);
      const h = heightAt(x, z);
      pos.setY(i, h);
      const g = vnoise(x * 0.05, z * 0.05);
      tmp.copy(cGrass).lerp(cGrass2, g);
      if (h > 8) tmp.lerp(cRock, smoothstep(8, 40, h));
      if (h > 70) tmp.lerp(cSnow, smoothstep(70, 110, h));
      colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
      // scale uv for tiled detail normal
      uv.setXY(i, x * 0.02, z * 0.02);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const normalMap = makeNormalMap(512, { freq: 0.05, strength: 1.4, z: 1 });
    normalMap.repeat.set(6, 6);
    const roughMap = makeRoughnessMap(512, { base: 0.92, range: 0.08 });
    roughMap.repeat.set(6, 6);

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 1.0, metalness: 0.0,
      normalMap, roughnessMap: roughMap,
      normalScale: new THREE.Vector2(0.6, 0.6),
      envMapIntensity: 0.5,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    this.group.add(mesh);
  }

  // ---------- road ----------
  _roadTexture() {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#33363b';
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) {
      const v = 40 + Math.floor(Math.random() * 40);
      g.fillStyle = `rgb(${v},${v},${v + 2})`;
      g.fillRect(Math.random() * 256, Math.random() * 256, 1.4, 1.4);
    }
    g.fillStyle = '#e8e8e0';
    g.fillRect(16, 0, 5, 256);
    g.fillRect(235, 0, 5, 256);
    g.fillStyle = '#e9c94a';
    for (let y = 0; y < 256; y += 64) g.fillRect(125, y, 6, 34);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  _roadMesh() {
    const tex = this._roadTexture();
    const tile = 22;
    const W = ROAD.halfWidth;
    const y = 0.05;
    const verts = [], uvs = [], idx = [];
    const zStart = ROAD.lengthStart, zEnd = ROAD.lengthEnd, step = 4;
    let row = 0;
    for (let z = zStart; z <= zEnd; z += step) {
      const cx = roadX(z);
      const dx = roadSlope(z);
      const len = Math.hypot(1, dx);
      const ox = 1 / len, oz = -dx / len;
      verts.push(cx - ox * W, y, z - oz * W);
      verts.push(cx + ox * W, y, z + oz * W);
      const v = (z - zStart) / tile;
      uvs.push(0, v, 1, v);
      if (z > zStart) {
        const a = (row - 1) * 2, b = a + 1, c = row * 2, d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
      row++;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();

    const asphaltNormal = makeNormalMap(512, { freq: 0.08, strength: 1.1, z: 5 });
    asphaltNormal.repeat.set(3, 12);

    const mat = new THREE.MeshStandardMaterial({
      map: tex, roughness: 0.72, metalness: 0.0,
      normalMap: asphaltNormal, normalScale: new THREE.Vector2(0.5, 0.5),
      envMapIntensity: 0.55,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    this.group.add(mesh);
  }

  // ---------- scatter ----------
  _treeGeo() {
    const trunk = new THREE.CylinderGeometry(0.22, 0.32, 2.2, 6);
    trunk.translate(0, 1.1, 0);
    const foliage = new THREE.ConeGeometry(1.7, 4.6, 8);
    foliage.translate(0, 4.3, 0);
    return mergeGeometries([trunk, foliage], true);
  }

  _scatter() {
    const rng = mulberry32(1337);
    const treeGeo = this._treeGeo();
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3f28, roughness: 1 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f5d2a, roughness: 0.9, envMapIntensity: 0.4 });
    const N = 2200;
    const trees = new THREE.InstancedMesh(treeGeo, [trunkMat, leafMat], N);
    trees.castShadow = true; trees.receiveShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const scaleV = new THREE.Vector3();
    let placed = 0, guard = 0;
    while (placed < N && guard < N * 12) {
      guard++;
      const z = ROAD.lengthStart + rng() * (ROAD.lengthEnd - ROAD.lengthStart);
      const side = rng() < 0.5 ? -1 : 1;
      const off = 14 + rng() * 240;
      const x = roadX(z) + side * off;
      const h = heightAt(x, z);
      if (h < 0.4 || h > 60) continue;
      const s = 0.7 + rng() * 1.1;
      scaleV.set(s, s * (0.85 + rng() * 0.4), s);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rng() * Math.PI * 2);
      m.compose(new THREE.Vector3(x, h, z), q, scaleV);
      trees.setMatrixAt(placed++, m);
    }
    trees.count = placed;
    trees.instanceMatrix.needsUpdate = true;
    this.group.add(trees);

    const rockGeo = new THREE.IcosahedronGeometry(1, 0);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x8a8378, roughness: 0.95, flatShading: true, envMapIntensity: 0.5 });
    const RN = 600;
    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, RN);
    rocks.castShadow = true; rocks.receiveShadow = true;
    let rp = 0; guard = 0;
    while (rp < RN && guard < RN * 12) {
      guard++;
      const z = ROAD.lengthStart + rng() * (ROAD.lengthEnd - ROAD.lengthStart);
      const side = rng() < 0.5 ? -1 : 1;
      const off = 10 + rng() * 320;
      const x = roadX(z) + side * off;
      const h = heightAt(x, z);
      if (h < 0.2) continue;
      const s = 0.4 + rng() * 2.4;
      scaleV.set(s, s * (0.6 + rng() * 0.6), s);
      q.setFromAxisAngle(new THREE.Vector3(rng(), rng(), rng()).normalize(), rng() * Math.PI);
      m.compose(new THREE.Vector3(x, h + s * 0.2, z), q, scaleV);
      rocks.setMatrixAt(rp++, m);
    }
    rocks.count = rp;
    rocks.instanceMatrix.needsUpdate = true;
    this.group.add(rocks);
  }

  // ---------- guardrails ----------
  _guardrails() {
    const postGeo = new THREE.BoxGeometry(0.12, 0.9, 0.12);
    postGeo.translate(0, 0.45, 0);
    const railGeo = new THREE.BoxGeometry(0.1, 0.16, 4.2);
    railGeo.translate(0, 0.7, 0);
    const merged = mergeGeometries([postGeo, railGeo]);
    const mat = new THREE.MeshStandardMaterial({ color: 0xaab0b8, roughness: 0.35, metalness: 0.85, envMapIntensity: 1.0 });
    const spacing = 4.2;
    const count = Math.floor((ROAD.lengthEnd - ROAD.lengthStart) / spacing) * 2;
    const rail = new THREE.InstancedMesh(merged, mat, count);
    rail.castShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const one = new THREE.Vector3(1, 1, 1);
    const up = new THREE.Vector3(0, 1, 0);
    let i = 0;
    const W = ROAD.halfWidth + 0.7;
    for (let z = ROAD.lengthStart; z < ROAD.lengthEnd && i < count - 1; z += spacing) {
      const cx = roadX(z), dx = roadSlope(z);
      const len = Math.hypot(1, dx);
      const ox = 1 / len, oz = -dx / len;
      const ang = Math.atan2(dx, 1);
      q.setFromAxisAngle(up, ang);
      for (const side of [-1, 1]) {
        m.compose(new THREE.Vector3(cx + side * ox * W, 0.02, z + side * oz * W), q, one);
        rail.setMatrixAt(i++, m);
      }
    }
    rail.count = i;
    rail.instanceMatrix.needsUpdate = true;
    this.group.add(rail);
  }
}

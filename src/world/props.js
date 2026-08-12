import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

function setVColor(geo, color) {
  const c = new THREE.Color(color);
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

// ---------- streetlamp: metal pole + arm + emissive head ----------
// Returns { geo, materials } for a two-group InstancedMesh (0 = metal, 1 = lamp).
export function makeStreetlamp() {
  const H = 5.2;
  const pole = new THREE.CylinderGeometry(0.09, 0.13, H, 8); pole.translate(0, H / 2, 0);
  const base = new THREE.CylinderGeometry(0.2, 0.24, 0.5, 8); base.translate(0, 0.25, 0);
  const arm = new THREE.BoxGeometry(1.4, 0.1, 0.1); arm.translate(0.6, H - 0.1, 0);
  const metal = mergeGeometries([pole, base, arm]); // group 0

  const head = new THREE.BoxGeometry(0.55, 0.22, 0.34); head.translate(1.25, H - 0.22, 0);
  // two groups -> two materials
  const geo = mergeGeometries([metal, head], true);

  const materials = [
    new THREE.MeshStandardMaterial({ color: 0x3c4149, roughness: 0.5, metalness: 0.85, envMapIntensity: 1.0 }),
    new THREE.MeshStandardMaterial({ color: 0xfff2c8, emissive: 0xffd98a, emissiveIntensity: 2.4, roughness: 0.4 }),
  ];
  return { geo, materials };
}

// ---------- richer tree: trunk + layered foliage ----------
export function makeTree(seed = 0) {
  const trunk = new THREE.CylinderGeometry(0.16, 0.26, 2.4, 6); trunk.translate(0, 1.2, 0);
  setVColor(trunk, 0x5a3f28);
  const blobs = [];
  const layers = [
    [0, 3.0, 1.9], [0.3, 4.1, 1.5], [-0.2, 5.0, 1.05],
  ];
  for (const [dx, y, r] of layers) {
    const b = new THREE.SphereGeometry(r, 7, 6); // indexed, matches the trunk
    b.translate(dx, y, 0);
    // slight green variation per layer
    setVColor(b, new THREE.Color(0x2f5d2a).offsetHSL(0, 0, (y - 4) * 0.02));
    blobs.push(b);
  }
  return mergeGeometries([trunk, ...blobs]);
}

// ---------- pine (for the procedural highlands) ----------
export function makePine() {
  const trunk = new THREE.CylinderGeometry(0.14, 0.2, 1.6, 6); trunk.translate(0, 0.8, 0);
  setVColor(trunk, 0x4b3620);
  const cones = [
    [1.9, 1.6, 2.4], [1.5, 3.0, 2.0], [1.05, 4.2, 1.6],
  ];
  const parts = [trunk];
  for (const [r, y, h] of cones) {
    const c = new THREE.ConeGeometry(r, h, 8); c.translate(0, y, 0);
    setVColor(c, 0x2c5327);
    parts.push(c);
  }
  return mergeGeometries(parts);
}

// ---------- simple traffic/parked car (vertex-coloured; paint tinted per instance) ----------
// Body is white in vertex colours so instanceColor sets the paint; glass/tyres stay dark.
export function makeCarProp() {
  const parts = [];
  const body = new THREE.BoxGeometry(1.8, 0.6, 4.1); body.translate(0, 0.55, 0); setVColor(body, 0xffffff);
  parts.push(body);
  const cabin = new THREE.BoxGeometry(1.55, 0.55, 2.1); cabin.translate(0, 1.05, -0.1); setVColor(cabin, 0xffffff);
  parts.push(cabin);
  const glassF = new THREE.BoxGeometry(1.4, 0.42, 0.1); glassF.translate(0, 1.06, 0.95); setVColor(glassF, 0x11161d);
  parts.push(glassF);
  const glassB = new THREE.BoxGeometry(1.4, 0.42, 0.1); glassB.translate(0, 1.06, -1.15); setVColor(glassB, 0x11161d);
  parts.push(glassB);
  for (const [x, z] of [[0.8, 1.3], [-0.8, 1.3], [0.8, -1.3], [-0.8, -1.3]]) {
    const w = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 12); w.rotateZ(Math.PI / 2); w.translate(x, 0.34, z);
    setVColor(w, 0x0b0c0e); parts.push(w);
  }
  return mergeGeometries(parts);
}

// palette of believable car paints
export const CAR_COLORS = [
  0xb01f2e, 0x1c3f7a, 0x1a1c20, 0xe8e9ec, 0x2b2e33, 0x8a9096,
  0x24603f, 0xc7c9cd, 0x7a2233, 0x314a5e, 0xd8a53a, 0x50565e,
];

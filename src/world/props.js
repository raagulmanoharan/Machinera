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

// ---------- cobra-head highway streetlamp ----------
// Tapered pole, a smooth curved arm and an angled head with an emissive lens on
// the underside (pointing at the road). Returns { geo, materials } for a
// two-group InstancedMesh (0 = metal, 1 = lens).
export function makeStreetlamp() {
  const H = 5.6;
  const base = new THREE.CylinderGeometry(0.24, 0.3, 0.6, 10); base.translate(0, 0.3, 0);
  const pole = new THREE.CylinderGeometry(0.08, 0.15, H, 10); pole.translate(0, H / 2, 0);
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0, H - 0.1, 0),
    new THREE.Vector3(0.5, H + 0.55, 0),
    new THREE.Vector3(1.85, H + 0.12, 0),
  );
  const arm = new THREE.TubeGeometry(curve, 16, 0.06, 6, false);
  const housing = new THREE.BoxGeometry(0.66, 0.2, 0.32); housing.translate(1.8, H + 0.02, 0);
  const metal = mergeGeometries([base, pole, arm, housing]);

  const lens = new THREE.BoxGeometry(0.52, 0.06, 0.24); lens.translate(1.8, H - 0.09, 0);
  const geo = mergeGeometries([metal, lens], true);

  const materials = [
    new THREE.MeshStandardMaterial({ color: 0x2f333a, roughness: 0.55, metalness: 0.8, envMapIntensity: 1.0 }),
    new THREE.MeshStandardMaterial({ color: 0xfff4d8, emissive: 0xdfe6ff, emissiveIntensity: 0, roughness: 0.35 }),
  ];
  return { geo, materials };
}

// ---------- stylized 3D tree (douges.dev-style faceted foliage) ----------
// Faceted low-poly canopy with a light/height gradient baked into vertex
// colours: brighter up and on top-facing facets, darker and cooler toward the
// shaded underside — reads with real depth, unlike a flat billboard. Unit
// height (base at y=0), so it instances and takes the shared wind sway.
function gradientFoliage(geo, { base, lit, shade, cx = 0, cyMin, cyMax, seed = 1 }) {
  geo.computeVertexNormals();
  const pos = geo.attributes.position, nor = geo.attributes.normal;
  const n = pos.count;
  const col = new Float32Array(n * 3);
  const cBase = new THREE.Color(base), cLit = new THREE.Color(lit), cShade = new THREE.Color(shade);
  let s = (seed * 131 + 7) >>> 0;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const tmp = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const y = pos.getY(i), ny = nor.getY(i);
    const hGrad = THREE.MathUtils.clamp((y - cyMin) / Math.max(0.001, cyMax - cyMin), 0, 1);
    const top = THREE.MathUtils.clamp(ny * 0.5 + 0.5, 0, 1);      // top-facing facets catch light
    const l = 0.35 * top + 0.65 * hGrad;
    tmp.copy(cShade).lerp(cBase, THREE.MathUtils.clamp(hGrad * 1.4, 0, 1)).lerp(cLit, l * 0.7);
    const j = 0.94 + rnd() * 0.12;                                 // subtle per-facet variation
    col[i * 3] = tmp.r * j; col[i * 3 + 1] = tmp.g * j; col[i * 3 + 2] = tmp.b * j;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

// Flat-shaded facets need non-indexed geometry; merging also requires every
// part to agree on index-ness. Expand any indexed part to non-indexed.
const toFlat = (geo) => (geo.index ? geo.toNonIndexed() : geo);

// kind: 'round' (broadleaf) or 'pine'. Returns a merged, unit-height geometry.
export function makeStylizedTree(kind = 'round', seed = 1) {
  const parts = [];
  if (kind === 'pine') {
    const trunk = toFlat(new THREE.CylinderGeometry(0.12, 0.22, 2.0, 6).translate(0, 1.0, 0));
    setVColor(trunk, 0x43301d); parts.push(trunk);
    const cones = [[1.7, 1.7, 2.2], [1.3, 3.0, 1.9], [0.85, 4.2, 1.5]];
    let i = 0;
    for (const [r, y, h] of cones) {
      const c = toFlat(new THREE.ConeGeometry(r, h, 7).translate(0, y, 0));
      gradientFoliage(c, { base: 0x2c5327, lit: 0x6fae4a, shade: 0x14301a, cyMin: y - h / 2, cyMax: y + h / 2, seed: seed + i });
      parts.push(c); i++;
    }
    return normalizeUnit(mergeGeometries(parts));
  }
  const trunk = toFlat(new THREE.CylinderGeometry(0.15, 0.26, 2.6, 6).translate(0, 1.3, 0));
  setVColor(trunk, 0x5a3f28); parts.push(trunk);
  // a clustered, organic crown: a few big lobes plus smaller clumps around them
  let rs = (seed * 2654435761) >>> 0;
  const rr = () => { rs = (rs * 1103515245 + 12345) & 0x7fffffff; return rs / 0x7fffffff; };
  const lobes = [[0, 3.1, 1.7], [0.5, 3.8, 1.35], [-0.45, 4.0, 1.25], [0.1, 4.7, 1.05], [-0.1, 5.3, 0.72]];
  const blobs = [];
  for (const [dx, y, r] of lobes) blobs.push([dx, y, 0, r]);
  for (let k = 0; k < 7; k++) {           // small clumps for a fuller silhouette
    const a = rr() * Math.PI * 2, rad = 0.9 + rr() * 0.9;
    blobs.push([Math.cos(a) * rad, 3.2 + rr() * 2.0, Math.sin(a) * rad, 0.5 + rr() * 0.45]);
  }
  let i = 0;
  for (const [dx, y, dz, r] of blobs) {
    const b = new THREE.IcosahedronGeometry(r, 1);
    b.scale(1.05, 0.92, 1.05).translate(dx, y, dz);
    const flat = toFlat(b);
    gradientFoliage(flat, { base: 0x357a34, lit: 0x8fca57, shade: 0x1c3f22, cyMin: 2.6, cyMax: 6.2, seed: seed + i });
    parts.push(flat); i++;
  }
  return normalizeUnit(mergeGeometries(parts));
}

// ---------- bare winter tree (dark silhouette) ----------
// A recursively-branched leafless tree, merged to one unit-height geometry so it
// instances cheaply. Rendered near-black, it reads as a fog silhouette.
export function makeBareTree(seed = 1) {
  let s = (seed * 2654435761) >>> 0;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const parts = [];
  const up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3();
  const grow = (x, y, z, dx, dy, dz, len, rad, depth) => {
    dir.set(dx, dy, dz).normalize();
    const g = new THREE.CylinderGeometry(rad * 0.6, rad, len, 5);
    g.translate(0, len / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, dir));
    g.translate(x, y, z);
    parts.push(g);
    const ex = x + dir.x * len, ey = y + dir.y * len, ez = z + dir.z * len;
    if (depth <= 0 || len < 0.55) return;
    const n = 2 + ((rnd() * 2) | 0);
    for (let i = 0; i < n; i++) {
      const spread = 0.7 + rnd() * 0.8;
      grow(ex, ey, ez,
        dir.x + (rnd() - 0.5) * spread, dir.y * 0.7 + 0.35 + rnd() * 0.3, dir.z + (rnd() - 0.5) * spread,
        len * (0.62 + rnd() * 0.18), rad * 0.66, depth - 1);
    }
  };
  grow(0, 0, 0, 0, 1, 0, 3.0 + rnd() * 0.8, 0.2, 4);
  return normalizeUnit(mergeGeometries(parts));
}

function normalizeUnit(geo) {
  geo.computeBoundingBox();
  const h = geo.boundingBox.max.y - geo.boundingBox.min.y || 1;
  geo.translate(0, -geo.boundingBox.min.y, 0);
  geo.scale(1 / h, 1 / h, 1 / h);
  return geo;
}

// Material for the stylized trees: faceted (flat) shading picks up the baked
// gradient; wind sway is added by the caller.
export function stylizedTreeMaterial() {
  return new THREE.MeshStandardMaterial({
    vertexColors: true, flatShading: true, roughness: 0.92, metalness: 0.0, envMapIntensity: 0.45,
  });
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

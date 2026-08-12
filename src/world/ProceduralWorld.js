import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ROAD, roadX, roadSlope, distToRoad } from './road.js';
import { makeNormalMap, makeRoughnessMap, makeAsphaltAlbedo } from '../render/textures.js';
import { assets, MODELS, TEXTURES, loadTexture, deTile } from '../render/AssetLibrary.js';
import { makeStreetlamp } from './props.js';
import { Colliders } from './Colliders.js';

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
const CORRIDOR_Y = 0.0; // road surface level — car rests here, no clipping

export function heightAt(x, z) {
  const c = distToRoad(x, z);
  if (c <= FLAT_TO) return CORRIDOR_Y;
  const ramp = smoothstep(FLAT_TO, FLAT_TO + 20, c);
  // rolling base + rugged rocky detail for broken, barren ground
  const hills = fbm(x * 0.0055, z * 0.0055) * 14 + fbm(x * 0.02, z * 0.02) * 3.2;
  const rough = (fbm(x * 0.09 + 5, z * 0.09 - 5) - 0.5) * 5.5      // rocky bumps
    + (fbm(x * 0.28, z * 0.28) - 0.5) * 1.8;                        // gravelly grain
  const mnt = smoothstep(120, 460, c) * (fbm(x * 0.0014 + 10, z * 0.0014 - 4) * 240 + 40);
  return CORRIDOR_Y + ramp * (hills + rough) + mnt;
}

export class ProceduralWorld {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.heightAt = heightAt;
    this.carStart = { pos: new THREE.Vector3(roadX(0), 0, 0), heading: 0 };
    this.colliders = new Colliders(6);
    this._build();
  }

  resolveCollision(x, z, r) { return this.colliders.resolve(x, z, r); }

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
    this._guardrails();
  }

  // async: pull real CC0 models (trees, boulders, lamps) with procedural fallback
  async populate() {
    const rng = mulberry32(1337);
    await Promise.all([
      this._boulders(rng),
      this._lamps(),
    ]);
  }

  // add an instanced real model, or fall back to a procedural geometry
  async _instanceOrFallback(url, matrices, fallbackGeo, fallbackMat) {
    const g = await assets.instances(url, matrices);
    if (g) { this.group.add(g); return; }
    this._addInstanced(fallbackGeo, fallbackMat, matrices);
  }

  _addInstanced(geo, mat, matrices) {
    if (!matrices.length) return null;
    const inst = new THREE.InstancedMesh(geo, mat, matrices.length);
    inst.castShadow = true; inst.receiveShadow = true;
    matrices.forEach((m, i) => inst.setMatrixAt(i, m));
    inst.instanceMatrix.needsUpdate = true;
    this.group.add(inst);
    return inst;
  }

  // normalize a merged prop geometry to unit height (used by the lamp)
  _fallbackGeo(geo) {
    geo.computeBoundingBox();
    const h = geo.boundingBox.max.y - geo.boundingBox.min.y || 1;
    geo.translate(0, -geo.boundingBox.min.y, 0);
    geo.scale(1 / h, 1 / h, 1 / h);
    return geo;
  }

  async _boulders(rng) {
    const q = new THREE.Quaternion(), s = new THREE.Vector3();
    const mats = [];
    let placed = 0, guard = 0;
    while (placed < 320 && guard < 8000) {
      guard++;
      const z = ROAD.lengthStart + rng() * (ROAD.lengthEnd - ROAD.lengthStart);
      const side = rng() < 0.5 ? -1 : 1;
      const off = 12 + rng() * 320;
      const x = roadX(z) + side * off;
      const h = heightAt(x, z);
      if (h < 0.2) continue;
      const size = 0.8 + rng() * 3.2;
      q.setFromAxisAngle(new THREE.Vector3(rng(), rng(), rng()).normalize(), rng() * Math.PI);
      s.set(size, size * (0.7 + rng() * 0.5), size);
      mats.push(new THREE.Matrix4().compose(new THREE.Vector3(x, h, z), q, s));
      if (size > 1.2) this.colliders.add(x, z, size * 0.6); // only big rocks block
      placed++;
    }
    const rockGeo = new THREE.IcosahedronGeometry(0.5, 0);
    rockGeo.translate(0, 0.5, 0);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x8a8378, roughness: 0.95, flatShading: true, envMapIntensity: 0.5 });
    this._addInstanced(rockGeo, rockMat, mats);
  }

  async _lamps() {
    const mats = [];
    const pools = [];
    const streaks = [];
    const heads = [];
    const q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), s = new THREE.Vector3();
    const poolQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
    const streakQ = new THREE.Quaternion();
    const poolS = new THREE.Vector3(1, 1, 1);
    let side = 1;
    for (let z = ROAD.lengthStart + 60; z < ROAD.lengthEnd; z += 46) {
      side *= -1;
      const cx = roadX(z), dx = roadSlope(z);
      const len = Math.hypot(1, dx);
      const ox = 1 / len, oz = -dx / len;
      const px = cx + side * ox * (ROAD.halfWidth + 1.4);
      const pz = z + side * oz * (ROAD.halfWidth + 1.4);
      // arm (local +x) should point toward the road
      const yaw = Math.atan2(-side * ox, -side * -oz);
      q.setFromAxisAngle(up, yaw);
      s.set(5.4, 5.4, 5.4);
      const groundY = heightAt(px, pz);
      mats.push(new THREE.Matrix4().compose(new THREE.Vector3(px, groundY, pz), q, s));
      this.colliders.add(px, pz, 0.4);
      // a pool of light on the road, under the lamp head (shifted toward the road)
      const lx = px - side * ox * 2.4, lz = pz - side * oz * 2.4;
      pools.push(new THREE.Matrix4().compose(new THREE.Vector3(lx, groundY + 0.06, lz), poolQ, poolS));
      // wet-road reflection streak: elongated along the road tangent under the
      // lamp. Geometry is already laid flat, so this is a yaw-only rotation.
      streakQ.setFromAxisAngle(up, Math.atan2(dx, 1));
      streaks.push(new THREE.Matrix4().compose(new THREE.Vector3(lx, groundY + 0.045, lz), streakQ, poolS));
      // the glowing head itself (up the pole, out along the arm toward the road)
      heads.push([px - side * ox * 1.3, groundY + 5.15, pz - side * oz * 1.3]);
    }
    const lamp = makeStreetlamp();
    this._addInstanced(this._fallbackGeo(lamp.geo), lamp.materials, mats);
    this._lampMat = lamp.materials[1];    // emissive head — cool white, driven by night
    this._lampMat.color.set(0xeaf3ff);
    this._lampMat.emissive.set(0xcfe3ff);
    this._lampMat.emissiveIntensity = 0;  // off by day

    // additive cool light-pools cast on the (wet) road
    const poolMesh = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(17, 20),
      new THREE.MeshBasicMaterial({ map: this._glowTex(0.5), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xb6d0ff, toneMapped: false }),
      pools.length
    );
    poolMesh.frustumCulled = false;
    pools.forEach((m, i) => poolMesh.setMatrixAt(i, m));
    poolMesh.instanceMatrix.needsUpdate = true;
    this.group.add(poolMesh);
    this._lampPools = poolMesh;

    // wet reflection streaks — long, thin additive smears down the road
    const streakMesh = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(3.4, 30).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: this._glowTex(0.28), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xaecaff, toneMapped: false }),
      streaks.length
    );
    streakMesh.frustumCulled = false;
    streaks.forEach((m, i) => streakMesh.setMatrixAt(i, m));
    streakMesh.instanceMatrix.needsUpdate = true;
    this.group.add(streakMesh);
    this._lampStreaks = streakMesh;

    // big soft glow halos at each head — these bloom into orbs through the fog
    this._haloMat = new THREE.SpriteMaterial({ map: this._glowTex(0.32), color: 0xdcebff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    const halos = new THREE.Group();
    for (const [hx, hy, hz] of heads) {
      const sp = new THREE.Sprite(this._haloMat);
      sp.position.set(hx, hy, hz);
      sp.scale.set(5, 5, 1);
      halos.add(sp);
    }
    halos.frustumCulled = false;
    this.group.add(halos);
    this._halos = halos;
  }

  // soft radial glow sprite; `core` sets how tight the bright centre is
  _glowTex(core = 0.45) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(64, 64, 1, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,255,255,0.95)');
    grd.addColorStop(core, 'rgba(255,255,255,0.35)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }

  // street-lamp glow level (0 off → 1 full), driven by the mood director
  setLamps(level) {
    const n = THREE.MathUtils.clamp(level, 0, 1);
    if (this._lampMat) this._lampMat.emissiveIntensity = 5.0 * n;
    if (this._lampPools) this._lampPools.material.opacity = 0.95 * n;
    if (this._lampStreaks) this._lampStreaks.material.opacity = 0.6 * n;
    if (this._haloMat) this._haloMat.opacity = 0.9 * n;
  }

  update() { /* static world; nothing per-frame */ }

  // ---------- terrain ----------
  _terrain() {
    const zStart = ROAD.lengthStart - 200;
    const zEnd = ROAD.lengthEnd + 200;
    const halfX = 520;
    const stepZ = 6, stepX = 6;   // finer grid so the rugged detail reads
    const nz = Math.ceil((zEnd - zStart) / stepZ);
    const nx = Math.ceil((halfX * 2) / stepX);

    const geo = new THREE.PlaneGeometry(halfX * 2, zEnd - zStart, nx, nz);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const uv = geo.attributes.uv;

    // vertex colours MULTIPLY the dirt texture: barren earth with patches of
    // dry mud, dark damp soil and pale dust; rock mid-slope, grey scree up high.
    const cDirt = new THREE.Color(0.62, 0.5, 0.38);   // dry dirt
    const cMud = new THREE.Color(0.32, 0.26, 0.2);    // dark damp patches
    const cDust = new THREE.Color(0.82, 0.74, 0.6);   // pale dust
    const cRock = new THREE.Color(0.5, 0.46, 0.42);
    const cScree = new THREE.Color(0.62, 0.6, 0.6);
    const tmp = new THREE.Color();
    const zMid = (zStart + zEnd) / 2;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i) + zMid;
      pos.setZ(i, z);
      const h = heightAt(x, z);
      pos.setY(i, h - 0.05); // sit just below the road plane to avoid z-fighting
      // large patches pick between dust / dirt / mud for a random barren ground
      const p = vnoise(x * 0.009 + 3, z * 0.009 - 2);
      tmp.copy(cDirt).lerp(cDust, smoothstep(0.55, 0.85, p)).lerp(cMud, smoothstep(0.5, 0.15, p));
      const g = 0.8 + vnoise(x * 0.05, z * 0.05) * 0.3;   // fine grain
      tmp.multiplyScalar(g);
      if (h > 6) tmp.lerp(cRock, smoothstep(6, 40, h));
      if (h > 60) tmp.lerp(cScree, smoothstep(60, 110, h));
      colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
      uv.setXY(i, x * 0.02, z * 0.02); // 50 m per uv unit; texture.repeat tiles it
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const dirt = loadTexture(TEXTURES.dirtDiff, { srgb: true, repeat: 13 });
    const dirtNor = loadTexture(TEXTURES.dirtNor, { repeat: 13 });
    const mat = deTile(new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 1.0, metalness: 0.0,
      map: dirt, normalMap: dirtNor,
      normalScale: new THREE.Vector2(1.6, 1.6),   // roughened surface
      envMapIntensity: 0.35,                        // gloomy — little sky sheen
    }), { scale: 0.03, amount: 0.8 });              // strong de-tile to kill the repeat
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    this.group.add(mesh);
  }

  // ---------- road: dirt shoulder + real asphalt + painted markings ----------
  _ribbonGeo(W) {
    const verts = [], uvs = [], idx = [];
    const zStart = ROAD.lengthStart, zEnd = ROAD.lengthEnd, step = 4;
    let row = 0;
    for (let z = zStart; z <= zEnd; z += step) {
      const cx = roadX(z), dx = roadSlope(z);
      const len = Math.hypot(1, dx), ox = 1 / len, oz = -dx / len;
      verts.push(cx - ox * W, 0, z - oz * W);
      verts.push(cx + ox * W, 0, z + oz * W);
      uvs.push(0, z - zStart, 1, z - zStart); // v is metres; texture.repeat tiles it
      if (z > zStart) { const a = (row - 1) * 2, b = a + 1, c = row * 2, d = c + 1; idx.push(a, c, b, b, c, d); }
      row++;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }

  _markingTex() {
    const c = document.createElement('canvas'); c.width = 64; c.height = 256;
    const g = c.getContext('2d');
    g.clearRect(0, 0, 64, 256);
    g.fillStyle = '#eceade';              // solid white edge lines
    g.fillRect(3, 0, 4, 256); g.fillRect(57, 0, 4, 256);
    g.fillStyle = '#e9c94a';              // dashed yellow centre
    g.fillRect(29, 40, 6, 150);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  _roadMesh() {
    const W = ROAD.halfWidth;
    // dirt shoulder — extends past the asphalt into the grass for a soft verge
    const SW = W + 3.6;
    const dDiff = loadTexture(TEXTURES.dirtDiff, { srgb: true }); dDiff.repeat.set(SW * 2 / 4, 1 / 4);
    const dNor = loadTexture(TEXTURES.dirtNor); dNor.repeat.copy(dDiff.repeat);
    const dirt = new THREE.Mesh(this._ribbonGeo(SW), deTile(new THREE.MeshStandardMaterial({
      map: dDiff, normalMap: dNor, normalScale: new THREE.Vector2(1, 1), roughness: 1, envMapIntensity: 0.7,
    }), { scale: 0.12, amount: 0.4 }));
    dirt.position.y = -0.035; dirt.receiveShadow = true; this.group.add(dirt);

    // asphalt surface
    const aDiff = loadTexture(TEXTURES.asphaltDiff, { srgb: true }); aDiff.repeat.set(W * 2 / 3.5, 1 / 3.5);
    const aNor = loadTexture(TEXTURES.asphaltNor); aNor.repeat.copy(aDiff.repeat);
    const road = new THREE.Mesh(this._ribbonGeo(W), deTile(new THREE.MeshStandardMaterial({
      map: aDiff, normalMap: aNor, normalScale: new THREE.Vector2(0.5, 0.5), roughness: 0.55, metalness: 0.0, envMapIntensity: 1.0,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    }), { scale: 0.15, amount: 0.28 }));
    road.position.y = 0.0; road.receiveShadow = true; this.group.add(road);

    // painted markings overlay
    const mTex = this._markingTex(); mTex.repeat.set(1, 1 / 12);
    const marks = new THREE.Mesh(this._ribbonGeo(W), new THREE.MeshStandardMaterial({
      map: mTex, alphaTest: 0.45, roughness: 0.55, envMapIntensity: 0.4,
      polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
    }));
    marks.position.y = 0.015; this.group.add(marks);
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
        const px = cx + side * ox * W, pz = z + side * oz * W;
        m.compose(new THREE.Vector3(px, 0.02, pz), q, one);
        rail.setMatrixAt(i++, m);
        this.colliders.add(px, pz, 1.3); // rail keeps the car on the road
      }
    }
    rail.count = i;
    rail.instanceMatrix.needsUpdate = true;
    this.group.add(rail);
  }
}

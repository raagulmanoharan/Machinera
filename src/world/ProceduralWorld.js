import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ROAD, roadX, roadSlope, distToRoad } from './road.js';
import { makeNormalMap, makeRoughnessMap, makeAsphaltAlbedo } from '../render/textures.js';
import { assets, MODELS, TEXTURES, loadTexture, deTile } from '../render/AssetLibrary.js';
import { makeStreetlamp, makeBareTree } from './props.js';
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

// De-tile a dirt material (break the obvious repeat) and, when greenKill > 0,
// suppress the green weeds baked into the dirt albedo so the ground reads as
// barren red dirt with only faint dead growth instead of a fake grass carpet.
function dirtShade(material, { scale = 0.08, amount = 0.4, greenKill = 0.0 } = {}) {
  const s1 = scale.toFixed(3), s2 = (scale * 3.1).toFixed(3), a = amount.toFixed(3);
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader =
      `float _h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
       float _vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
         return mix(mix(_h(i),_h(i+vec2(1,0)),f.x),mix(_h(i+vec2(0,1)),_h(i+vec2(1,1)),f.x),f.y);}
      ` + shader.fragmentShader.replace(
        '#include <map_fragment>',
        `#include <map_fragment>
         float _m = _vn(vMapUv*${s1})*0.65 + _vn(vMapUv*${s2})*0.35;
         diffuseColor.rgb *= (1.0 - ${a}) + ${a} * (0.6 + 0.9*_m);
         ${greenKill > 0 ? `
         float _g = clamp(diffuseColor.g - max(diffuseColor.r, diffuseColor.b), 0.0, 1.0);
         vec3 _dirt = vec3(dot(diffuseColor.rgb, vec3(0.5,0.4,0.32))) * vec3(1.28, 0.92, 0.70);
         diffuseColor.rgb = mix(diffuseColor.rgb, _dirt, clamp(_g * 5.0, 0.0, ${greenKill.toFixed(3)}));` : ''}
         // desaturate + flatten texel contrast — removes the high-frequency
         // amplitude that aliases into colourful sparkle at grazing angles
         diffuseColor.rgb = mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, vec3(0.38,0.36,0.30))), 0.35);
         diffuseColor.rgb = diffuseColor.rgb / (1.0 + diffuseColor.rgb * 0.7);
         diffuseColor.rgb = (diffuseColor.rgb - 0.26) * 0.6 + 0.26;`
      );
  };
  material.customProgramCacheKey = () => 'dirtshade' + scale + amount + greenKill;
  return material;
}

export function heightAt(x, z) {
  const c = distToRoad(x, z);
  if (c <= FLAT_TO) return CORRIDOR_Y;
  const ramp = smoothstep(FLAT_TO, FLAT_TO + 20, c);
  // rolling base + rugged rocky detail for broken, barren ground
  const hills = fbm(x * 0.0055, z * 0.0055) * 14 + fbm(x * 0.02, z * 0.02) * 3.2;
  const rough = (fbm(x * 0.09 + 5, z * 0.09 - 5) - 0.5) * 5.5      // rocky bumps
    + (fbm(x * 0.28, z * 0.28) - 0.5) * 1.8;                        // gravelly grain
  // layered ridges that rise with distance — overlapping ridgelines that recede
  // and fade into the fog at different depths, so the haze reads with depth
  const ridge = (a, b, f, amp) => { const n = fbm(x * f + a, z * f + b); return (1 - Math.abs(2 * n - 1)) * amp; };
  const layers = smoothstep(70, 240, c) * ridge(3, 7, 0.0065, 26)
    + smoothstep(150, 400, c) * ridge(21, -5, 0.0034, 85)
    + smoothstep(120, 460, c) * (fbm(x * 0.0014 + 10, z * 0.0014 - 4) * 210 + 40);
  return CORRIDOR_Y + ramp * (hills + rough) + layers;
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
    this._bareTrees();
  }

  // dark bare-tree silhouettes lining the road, thinning with distance and
  // fading into the fog — the roadside framing from the reference
  _bareTrees() {
    // several distinct silhouettes so they don't read as one repeated tree
    const variants = [3, 17, 42, 88, 131, 205, 260].map((s) => makeBareTree(s));
    const buckets = variants.map(() => []);
    let seed = 5150; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), sc = new THREE.Vector3();
    for (let z = ROAD.lengthStart + 20; z < ROAD.lengthEnd; z += 7 + rnd() * 11) {
      for (const side of [-1, 1]) {
        // a drifting density so trees clump and thin instead of an even row
        const dens = 0.35 + 0.5 * vnoise(z * 0.012 + side * 5, side * 2);
        if (rnd() > dens) continue;
        const cx = roadX(z), dx = roadSlope(z);
        const len = Math.hypot(1, dx), ox = 1 / len, oz = -dx / len;
        // set-back varies a lot: some right at the verge (clear), some far into
        // the fog — a distance spread gives real depth
        const near = rnd() < 0.4;
        const off = near ? (ROAD.halfWidth + 4 + rnd() * 14) : (ROAD.halfWidth + 24 + rnd() * 120);
        const px = cx + side * ox * off, pz = z + side * oz * off + (rnd() - 0.5) * 10;
        const h = 4.5 + rnd() * rnd() * 9.0;         // mostly mid, a few tall
        const lean = (rnd() - 0.5) * 0.18;
        q.setFromEuler(new THREE.Euler(lean, rnd() * Math.PI * 2, (rnd() - 0.5) * 0.14));
        sc.set(h * (0.45 + rnd() * 0.35), h * (0.85 + rnd() * 0.4), h * (0.45 + rnd() * 0.35));
        buckets[(rnd() * variants.length) | 0].push(
          new THREE.Matrix4().compose(new THREE.Vector3(px, heightAt(px, pz) - 0.2, pz), q, sc));
      }
    }
    const mat = new THREE.MeshStandardMaterial({ color: 0x0b0d11, roughness: 1.0, metalness: 0.0, envMapIntensity: 0.15 });
    variants.forEach((geo, i) => {
      if (!buckets[i].length) return;
      const inst = new THREE.InstancedMesh(geo, mat, buckets[i].length);
      buckets[i].forEach((m, k) => inst.setMatrixAt(k, m));
      inst.instanceMatrix.needsUpdate = true;
      inst.castShadow = false; inst.frustumCulled = true;
      this.group.add(inst);
    });
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
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x8a8378, roughness: 1.0, metalness: 0.0, flatShading: true, envMapIntensity: 0.0 });
    this._addInstanced(rockGeo, rockMat, mats);
  }

  // Smooth glow sprite with a gaussian falloff — a bright core plus a wide,
  // gradual halo that fades to nothing with no hard edge, so it diffuses into
  // the fog instead of reading as a flat disc.
  _glowTex() {
    const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d');
    const img = g.createImageData(S, S), R = S / 2;
    const ss = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const dx = (x - R) / R, dy = (y - R) / R, d2 = dx * dx + dy * dy, d = Math.sqrt(d2);
        // wide soft scatter + tighter inner glow, both gaussian (edge-free)
        let a = 0.55 * Math.exp(-d2 * 2.3) + 0.6 * Math.exp(-d2 * 9.0);
        a = Math.min(1, a) * (1 - ss(0.5, 1.0, d));   // window to 0 at the quad edge
        const i = (y * S + x) * 4;
        img.data[i] = 255; img.data[i + 1] = 255; img.data[i + 2] = 255; img.data[i + 3] = (a * 255) | 0;
      }
    }
    g.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }

  // a long soft vertical smear — the lamp reflected down the wet road
  _streakTex() {
    const c = document.createElement('canvas'); c.width = 64; c.height = 256;
    const g = c.getContext('2d');
    const grd = g.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0.0, 'rgba(255,255,255,0)');
    grd.addColorStop(0.5, 'rgba(255,255,255,0.9)');
    grd.addColorStop(1.0, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 64, 256);
    // feather the sides so it isn't a hard band
    const side = g.createLinearGradient(0, 0, 64, 0);
    side.addColorStop(0, 'rgba(0,0,0,1)'); side.addColorStop(0.5, 'rgba(0,0,0,0)'); side.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = side; g.fillRect(0, 0, 64, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }

  async _lamps() {
    const mats = [];
    const heads = [];     // lamp-head world positions (for the glowing halos)
    const road = [];      // nearest road point + slope (for wet reflections)
    const q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), s = new THREE.Vector3();
    const headLocal = new THREE.Vector3(0.30, 0.93, 0);  // head in unit-lamp space
    // deterministic jitter so lamps repeat but each is a little different
    let seed = 9871; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    let side = 1;
    for (let z = ROAD.lengthStart + 60; z < ROAD.lengthEnd; z += 95 + rnd() * 55) {  // sparse
      side *= -1;
      const zj = z + (rnd() - 0.5) * 8;
      const cx = roadX(zj), dx = roadSlope(zj);
      const len = Math.hypot(1, dx);
      const ox = 1 / len, oz = -dx / len;
      const px = cx + side * ox * (ROAD.halfWidth + 1.3 + rnd() * 0.5);
      const pz = zj + side * oz * (ROAD.halfWidth + 1.3);
      // arm (local +x) points toward the road, with a little random lean
      const yaw = Math.atan2(-side * ox, -side * -oz) + (rnd() - 0.5) * 0.16;
      q.setFromAxisAngle(up, yaw);
      const sc = 5.2 + rnd() * 0.7;             // slight height variation
      s.set(sc, sc, sc);
      const groundY = heightAt(px, pz);
      const M = new THREE.Matrix4().compose(new THREE.Vector3(px, groundY, pz), q, s);
      mats.push(M);
      this.colliders.add(px, pz, 0.4);
      heads.push(headLocal.clone().applyMatrix4(M));
      road.push({ x: roadX(zj), z: zj, slope: dx });
    }
    // lamp posts — weathered metal with a warm sodium lens that lights at night
    const lamp = makeStreetlamp();
    const [metalM, lensM] = lamp.materials;
    metalM.color.set(0x2b2723); metalM.roughness = 0.82; metalM.metalness = 0.45; metalM.envMapIntensity = 0.4;
    lensM.color.set(0xffcf8c); lensM.emissive.set(0xff9a2e); lensM.emissiveIntensity = 0; lensM.roughness = 0.4; lensM.metalness = 0.1;
    lensM.toneMapped = true;
    this._lensMat = lensM;
    this._addInstanced(this._fallbackGeo(lamp.geo), lamp.materials, mats);

    // the airborne glow is done volumetrically in the post pipeline (real 3D
    // fog scattering) — expose the bulb positions for it
    this.lampHeads = heads;

    // real light that actually hits the ground: a small pool of spotlights,
    // re-homed each frame onto the nearest lamps (WebGL can't afford one light
    // per lamp), casting a warm pool on the wet road + nearby terrain
    this._lampLights = [];
    for (let i = 0; i < 3; i++) {
      const sl = new THREE.SpotLight(0xffb267, 0, 60, 0.6, 0.7, 1.3);
      sl.visible = false;
      sl.castShadow = false;
      this.group.add(sl); this.group.add(sl.target);
      this._lampLights.push(sl);
    }
  }

  // street-lamp glow level (0 off → 1 full), driven by the mood director
  setLamps(level) {
    this.lampLevel = THREE.MathUtils.clamp(level, 0, 1);   // read by update() + the volumetric pass
    if (this._lensMat) this._lensMat.emissiveIntensity = 7.0 * this.lampLevel;
  }

  // re-home the real spotlights onto the nearest lamps so their light pools
  // follow the drive; the volumetric glow is driven from main
  update(dt, pos, camera) {
    if (!this._lampLights || !this.lampHeads) return;
    const ref = pos || (camera && camera.position);
    if (!ref) return;
    const level = this.lampLevel || 0;
    const near = this.lampHeads
      .map((h) => [h, h.distanceToSquared(ref)])
      .sort((a, b) => a[1] - b[1])
      .slice(0, this._lampLights.length);
    for (let i = 0; i < this._lampLights.length; i++) {
      const sl = this._lampLights[i];
      if (level > 0 && i < near.length) {
        const h = near[i][0];
        sl.visible = true;
        sl.position.copy(h);
        sl.target.position.set(roadX(h.z), 0.0, h.z);   // aim down at the road
        sl.intensity = 240 * level;
      } else { sl.visible = false; }
    }
  }

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
    const cPacked = new THREE.Color(0.46, 0.35, 0.26); // compact bare dirt at the verge
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
      // gradual dirt apron along the road: packed bare earth at the verge that
      // fades (with a wobble so the edge isn't a hard line) into the terrain
      const dr = distToRoad(x, z);
      const wob = (vnoise(x * 0.06, z * 0.06) - 0.5) * 10;
      const edge = smoothstep(FLAT_TO - 2, FLAT_TO + 30 + wob, dr);
      tmp.lerp(cPacked, (1 - edge) * 0.9);
      colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
      uv.setXY(i, x * 0.02, z * 0.02); // 50 m per uv unit; texture.repeat tiles it
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const dirt = loadTexture(TEXTURES.dirtDiff, { srgb: true, repeat: 13, anisotropy: 16 });
    const mat = dirtShade(new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 1.0, metalness: 0.0,
      map: dirt,                                     // no normal map — its grazing-angle glints were the sparkle
      envMapIntensity: 0.0,                          // matte earth — no env specular (no fireflies)
    }), { scale: 0.03, amount: 0.8, greenKill: 0.9 });  // de-tile + kill fake green
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
    let s = 771; const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    // worn, uneven paint — varying alpha, ragged edges, patchy wear
    const line = (x, w, col, base) => {
      for (let y = 0; y < 256; y++) {
        const wear = base * (0.55 + 0.45 * rnd());          // fades along its length
        if (rnd() < 0.06) continue;                          // scuffed-away rows
        g.fillStyle = `rgba(${col},${wear.toFixed(2)})`;
        const jx = x + (rnd() - 0.5) * 1.4;                  // ragged edge
        g.fillRect(jx, y, w + (rnd() - 0.5), 1);
      }
    };
    line(4, 4, '236,234,222', 0.85); line(56, 4, '236,234,222', 0.85);  // edge lines
    // dashed yellow centre — each dash a slightly different length/wear
    for (let d = 20; d < 256; d += 96) {
      const len = 120 + (rnd() - 0.5) * 40;
      for (let y = d; y < d + len && y < 256; y++) {
        if (rnd() < 0.08) continue;
        g.fillStyle = `rgba(233,201,74,${(0.5 + 0.4 * rnd()).toFixed(2)})`;
        g.fillRect(29 + (rnd() - 0.5) * 1.2, y, 6 + (rnd() - 0.5), 1);
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  _roadMesh() {
    const W = ROAD.halfWidth;
    // dirt shoulder — bare packed earth beside the asphalt (green weeds killed
    // so it matches the terrain apron and reads as dirt, not grass)
    const SW = W + 3.6;
    const dDiff = loadTexture(TEXTURES.dirtDiff, { srgb: true }); dDiff.repeat.set(SW * 2 / 4, 1 / 4);
    const dNor = loadTexture(TEXTURES.dirtNor); dNor.repeat.copy(dDiff.repeat);
    const dirt = new THREE.Mesh(this._ribbonGeo(SW), dirtShade(new THREE.MeshStandardMaterial({
      map: dDiff, normalMap: dNor, normalScale: new THREE.Vector2(1, 1), roughness: 1, envMapIntensity: 0.4,
      color: 0xb69a7c,   // warm packed-dirt tint
    }), { scale: 0.12, amount: 0.4, greenKill: 0.9 }));
    dirt.position.y = -0.035; dirt.receiveShadow = true; this.group.add(dirt);

    // asphalt surface
    const aDiff = loadTexture(TEXTURES.asphaltDiff, { srgb: true }); aDiff.repeat.set(W * 2 / 3.5, 1 / 3.5);
    const aNor = loadTexture(TEXTURES.asphaltNor); aNor.repeat.copy(aDiff.repeat);
    const aRough = loadTexture(TEXTURES.asphaltDiff); aRough.repeat.copy(aDiff.repeat);  // reuse albedo as a rough/wet variation map
    const road = new THREE.Mesh(this._ribbonGeo(W), deTile(new THREE.MeshStandardMaterial({
      map: aDiff, normalMap: aNor, normalScale: new THREE.Vector2(1.3, 1.3),  // keep the surface relief/texture
      roughnessMap: aRough, roughness: 0.72, metalness: 0.0, envMapIntensity: 0.7,
      color: 0x51555a,   // damp asphalt — texture reads, with a wet sheen (not a flat mirror)
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    }), { scale: 0.15, amount: 0.35 }));
    road.position.y = 0.0; road.receiveShadow = true; this.group.add(road);

    // painted markings overlay — faded and worn
    const mTex = this._markingTex(); mTex.repeat.set(1, 1 / 12);
    const marks = new THREE.Mesh(this._ribbonGeo(W), new THREE.MeshStandardMaterial({
      map: mTex, color: 0x8c877a, alphaTest: 0.45, roughness: 0.85, envMapIntensity: 0.2,
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
    // weathered galvanised steel — matte, dark, with per-post rust variation
    // (low metalness/env so it doesn't throw specular fireflies at grazing angle)
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0.1, envMapIntensity: 0.12 });
    const spacing = 4.2;
    const count = Math.floor((ROAD.lengthEnd - ROAD.lengthStart) / spacing) * 2;
    const rail = new THREE.InstancedMesh(merged, mat, count);
    rail.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
    rail.castShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const one = new THREE.Vector3(1, 1, 1);
    const up = new THREE.Vector3(0, 1, 0);
    const col = new THREE.Color();
    const rustA = new THREE.Color(0x4a4139), rustB = new THREE.Color(0x6e5140), steel = new THREE.Color(0x6a6660);
    let i = 0, seed = 4242;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
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
        rail.setMatrixAt(i, m);
        // mix steel with rust patches, each post a little different
        col.copy(steel).lerp(rnd() < 0.5 ? rustA : rustB, rnd() * 0.8).multiplyScalar(0.7 + rnd() * 0.3);
        rail.setColorAt(i, col);
        i++;
        this.colliders.add(px, pz, 1.3); // rail keeps the car on the road
      }
    }
    rail.count = i;
    rail.instanceMatrix.needsUpdate = true;
    if (rail.instanceColor) rail.instanceColor.needsUpdate = true;
    this.group.add(rail);
  }
}

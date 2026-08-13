import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ROAD, roadX, roadSlope, distToRoad } from './road.js';
import { makeNormalMap, makeRoughnessMap, makeAsphaltAlbedo, makeConcrete } from '../render/textures.js';
import { assets, MODELS, TEXTURES, loadTexture, deTile, roadShade } from '../render/AssetLibrary.js';
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
// enclosing tunnel cross-section: interior half-width, wall height, arch rise
const TUNNEL = { Wt: ROAD.halfWidth + 2.2, Hw: 4.8, Ha: 3.2 };
const OCEAN_Y = -17;   // sea level; the causeway deck rides at y = 0

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
  const ramp = smoothstep(FLAT_TO, FLAT_TO + 26, c);
  // The road runs along a causeway and the ground falls away from it. Terrain
  // that rises instead walls the road into a bowl — and since the sky *is* the
  // light source here, burying the horizon behind a hillside leaves the scene
  // black no matter the exposure. Dropping it keeps the horizon in view through
  // the gallery's open bays.
  const drop = -(16 + fbm(x * 0.006, z * 0.006) * 26);
  const relief = (fbm(x * 0.02, z * 0.02) - 0.5) * 9        // rolling ground
    + (fbm(x * 0.09 + 5, z * 0.09 - 5) - 0.5) * 3.5;        // rocky detail
  // distant ground stays below eye level so the horizon line reads
  const far = smoothstep(140, 620, c) * (fbm(x * 0.0016 + 10, z * 0.0016 - 4) * 46 - 14);
  return CORRIDOR_Y + ramp * (drop + relief + far);
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
    this._ocean();        // three.js Water — the sea the causeway crosses
    this._roadMesh();     // concrete floor + asphalt lanes + subtle centre line
    this._tunnel();       // roof on piers, open to the sky between them
  }

  // The ocean example's own Water shader, with its parameters unchanged. This
  // is what stops the scene reading flat: a diffuse surface under an
  // environment map can only ever be flat, whereas Water renders a real planar
  // reflection of the sky plus a sun specular, so the light actually moves as
  // you drive. Sits below the causeway, which crosses it as a viaduct.
  _ocean() {
    const waterNormals = loadTexture(TEXTURES.waterNormals, { repeat: 1 });
    waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping;
    const water = new Water(new THREE.PlaneGeometry(10000, 10000), {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals,
      sunDirection: new THREE.Vector3(),
      sunColor: 0xffffff,
      waterColor: 0x001e0f,
      distortionScale: 3.7,
      fog: this.scene.fog !== undefined,
    });
    water.rotation.x = -Math.PI / 2;
    water.position.y = OCEAN_Y;
    this.water = water;                 // update() advances its `time` uniform
    this.group.add(water);
  }

  // Nothing to place: the scene carries no lights at all, so there are no
  // fixtures to hang. The sky environment map is the only illumination.
  async populate() {}

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
    // place one lamp at longitudinal position z on the given side of the road
    const place = (z, side) => {
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
    };
    // lamps on BOTH sides of the road, staggered: a left post, then a right post
    // half a span later — an alternating rhythm down the highway
    const span = 92;
    for (let z = ROAD.lengthStart + 60; z < ROAD.lengthEnd; z += span) {
      place(z, -1);                 // left side
      place(z + span * 0.5, 1);     // right side, offset half a span (alternating)
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
      // wide, fully-soft cone so the pool on the ground has no hard edge
      const sl = new THREE.SpotLight(0xffb267, 0, 42, 0.9, 1.0, 1.5);
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
    if (this._glowMat) this._glowMat.opacity = 0.4 * this.lampLevel;
  }

  update(dt, pos, camera) {
    // advance the swell, and keep the ocean centred on the car so its 20 km
    // plane always reaches the horizon however far down the road we are
    if (this.water) {
      this.water.material.uniforms.time.value += (dt || 1 / 60);
      const ref = pos || (camera && camera.position);
      if (ref) this.water.position.set(ref.x, OCEAN_Y, ref.z);
    }
    if (!this._lampLights || !this.lampHeads) return;
    const ref = pos || (camera && camera.position);
    if (!ref) return;
    const level = this.lampLevel || 0;
    const n = this._lampLights.length;
    // reserve the first two spotlights for the nearest ceiling fixtures so the
    // car is always lit warmly from directly overhead; the rest track the
    // nearest fixtures of any kind (wall pools + fill)
    const nearest = (list, k) => list
      .map((h) => [h, h.distanceToSquared(ref)])
      .sort((a, b) => a[1] - b[1]).slice(0, k).map((e) => e[0]);
    const ceil = this.ceilHeads ? nearest(this.ceilHeads, 2) : [];
    const any = nearest(this.lampHeads, n);
    const picks = ceil.concat(any).slice(0, n);
    for (let i = 0; i < n; i++) {
      const sl = this._lampLights[i];
      const h = picks[i];
      if (level > 0 && h) {
        const overhead = i < ceil.length;      // first slots are ceiling lights
        sl.visible = true;
        sl.position.copy(h);
        // ceiling lights aim straight down the road crown (onto the car);
        // wall lights pool between the wall and the centre line
        sl.target.position.set(overhead ? roadX(h.z) : h.x * 0.6 + roadX(h.z) * 0.4, 0.0, h.z);
        // Tuned against the wider cone and longer reach above — those already
        // spread far more light than the old narrow, short-range spot, so the
        // raw intensity has to come down or anything under a lamp blows out.
        sl.intensity = (overhead ? 165 : 120) * level;
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
      envMapIntensity: 0.9,                          // receive sky (HDRI) IBL so the terrain reads; roughness 1 = diffuse only, no fireflies
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
    // subtle worn lane lines across the road width (canvas x maps 0..road width):
    // a dashed centre line and faint dashed lane dividers — no bright edges.
    const W = 128, H = 512;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.clearRect(0, 0, W, H);
    const hash = (n) => { const s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s); };
    const noise = (y, seed) => {
      const yy = y + seed, i = Math.floor(yy), f = yy - i, t = f * f * (3 - 2 * f);
      return hash(i * 1.7 + seed) * (1 - t) + hash((i + 1) * 1.7 + seed) * t;
    };
    const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    // regular dashed lane line at alpha scale `amp`. All lines share the same
    // dash phase so the lanes read as an orderly grid, with only gentle wear
    // along the length (no random dropout / per-line offset).
    const dashed = (x, w, amp) => {
      const dash = 90, gap = 130;
      for (let d = 0; d < H; d += dash + gap) {
        for (let y = Math.max(0, d); y < d + dash && y < H; y++) {
          const wear = 0.78 + 0.22 * noise(y * 0.04, 20);      // gentle length-wise wear
          const a = ss(0.2, 0.7, wear) * amp;
          if (a <= 0.02) continue;
          g.fillStyle = `rgba(220,216,205,${a.toFixed(3)})`;
          g.fillRect(x, y, w, 1);
        }
      }
    };
    dashed(W / 2 - 2, 4, 0.85);                                // centre line
    for (const x of [W / 6, W / 3, 2 * W / 3, 5 * W / 6]) {
      dashed(Math.round(x) - 1, 3, 0.5);                       // evenly spaced lane dividers
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  _roadMesh() {
    const W = ROAD.halfWidth;
    // concrete tunnel floor — runs a little into the walls so its outer edge is
    // buried in solid geometry rather than leaving a visible sliver at the verge
    const FW = TUNNEL.Wt + 0.4;
    const cDiff = loadTexture(TEXTURES.asphaltDiff, { srgb: true }); cDiff.repeat.set(FW * 2 / 3.5, 1 / 3.5);
    const floor = new THREE.Mesh(this._ribbonGeo(FW), deTile(new THREE.MeshStandardMaterial({
      // untinted: `color` multiplies the map, and the asphalt scan is already
      // dark, so any grey tint drives the deck to black under a dim dawn sky
      map: cDiff, roughness: 0.96, metalness: 0.0, envMapIntensity: 1.8, color: 0xffffff,
    }), { scale: 0.1, amount: 0.4 }));
    // coplanar with the asphalt — the road's polygonOffset keeps it in front, so
    // there's no raised lip along the asphalt's edge to catch the light
    floor.position.y = 0.0; floor.receiveShadow = true; this.group.add(floor);

    // Rain-slick asphalt. Wet, it mirrors the sky the way the sea does, and at
    // grazing angles down the road Fresnel makes that reflection strong — which
    // is what lets the exposure sit down near the example's, instead of being
    // propped up to keep a dull matte deck out of the black.
    const aDiff = loadTexture(TEXTURES.asphaltDiff, { srgb: true }); aDiff.repeat.set(W * 2 / 3.2, 1 / 3.2);
    const aNor = loadTexture(TEXTURES.asphaltNor); aNor.repeat.copy(aDiff.repeat);
    const road = new THREE.Mesh(this._ribbonGeo(W), deTile(new THREE.MeshPhysicalMaterial({
      map: aDiff, normalMap: aNor, normalScale: new THREE.Vector2(0.35, 0.35),
      roughness: 0.14, metalness: 0.0, envMapIntensity: 2.4,
      clearcoat: 1.0, clearcoatRoughness: 0.06,
      color: 0xffffff,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    }), { scale: 0.14, amount: 0.45 }));
    road.position.y = 0.0; road.receiveShadow = true; this.group.add(road);

    // subtle worn centre + lane lines
    const mTex = this._markingTex(); mTex.repeat.set(1, 1 / 26);
    const marks = new THREE.Mesh(this._ribbonGeo(W), new THREE.MeshStandardMaterial({
      map: mTex, color: 0xc9c4b6, alphaTest: 0.4, roughness: 0.9, envMapIntensity: 1.0,
      polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
    }));
    marks.position.y = 0.012; this.group.add(marks);
  }

  // An open gallery rather than a sealed bore: a continuous concrete roof
  // carried on regular pillars, with the bays between them open to the sky.
  // Sealed, the only illumination (the sky baked to an environment map) never
  // reaches the camera; opened up, the low sun rakes through the bays and lays
  // light bars across the road. Camera sits inside, so render both sides.
  _tunnel() {
    const { Wt, Hw, Ha } = TUNNEL;
    const A = 12;                       // arch segments
    // roof only — from the top of one pillar line, over the crown, to the other
    const sec = [[-Wt, Hw]];
    for (let k = 1; k < A; k++) { const p = Math.PI * (1 - k / A); sec.push([Wt * Math.cos(p), Hw + Ha * Math.sin(p)]); }
    sec.push([Wt, Hw]);
    const M = sec.length;
    const verts = [], uvs = [], idx = [];
    let rows = 0;
    for (let z = ROAD.lengthStart - 20; z <= ROAD.lengthEnd + 20; z += 6) {
      const cx = roadX(z), dx = roadSlope(z), len = Math.hypot(1, dx), ox = 1 / len, oz = -dx / len;
      for (let m = 0; m < M; m++) {
        const lx = sec[m][0], ly = sec[m][1];
        verts.push(cx + lx * ox, ly, z + lx * oz);
        uvs.push(m / (M - 1) * 3, z * 0.09);
      }
      if (rows > 0) {
        const base = (rows - 1) * M, cur = rows * M;
        for (let m = 0; m < M - 1; m++) { const a = base + m, b = base + m + 1, c = cur + m, d = cur + m + 1; idx.push(a, c, b, b, c, d); }
      }
      rows++;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(idx); g.computeVertexNormals();
    // Proper concrete lining — albedo, normal and roughness that agree with each
    // other, rather than a tinted asphalt albedo with no surface response. The
    // relief is what makes the walls catch the sodium light at grazing angles
    // instead of reading as flat painted cardboard.
    const conc = makeConcrete(512);
    for (const t of [conc.map, conc.normalMap, conc.roughnessMap]) t.repeat.set(3, 3);
    const mat = deTile(new THREE.MeshStandardMaterial({
      ...conc,
      normalScale: new THREE.Vector2(1.1, 1.1),
      color: 0xb4a894, metalness: 0.0, envMapIntensity: 0.5,
      side: THREE.DoubleSide,
    }), { scale: 0.06, amount: 0.35 });
    const mesh = new THREE.Mesh(g, mat);
    mesh.receiveShadow = true;
    this.group.add(mesh);
    this._tunnelPillars(mat);
    this._tunnelRibs(mat);
  }

  // The columns carrying the roof, in pairs down both verges. The gaps between
  // them are the openings the sky reaches the road through, so their spacing
  // sets the rhythm of light and shadow you drive past.
  _tunnelPillars(mat) {
    const { Wt, Hw } = TUNNEL;
    const YB = OCEAN_Y - 1.5;                         // carried down into the water
    const h = Hw - YB;
    const geo = new THREE.BoxGeometry(0.85, h, 1.15);
    geo.translate(0, YB + h / 2, 0);
    const spacing = 11;
    const mats = [];
    const up = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
    for (let z = ROAD.lengthStart; z < ROAD.lengthEnd; z += spacing) {
      const cx = roadX(z), dx = roadSlope(z), len = Math.hypot(1, dx), ox = 1 / len, oz = -dx / len;
      q.setFromAxisAngle(up, Math.atan2(dx, 1));      // follow the bend
      for (const side of [-1, 1]) {
        const px = cx + side * ox * Wt, pz = z + side * oz * Wt;
        mats.push(new THREE.Matrix4().compose(new THREE.Vector3(px, 0, pz), q, one));
        // the pillar line is also the parapet — without this the car drives
        // straight out of a bay and off the causeway
        this.colliders.add(px, pz, 1.5);
      }
    }
    const inst = new THREE.InstancedMesh(geo, mat, mats.length);
    for (let i = 0; i < mats.length; i++) inst.setMatrixAt(i, mats[i]);
    inst.instanceMatrix.needsUpdate = true;
    inst.castShadow = true; inst.receiveShadow = true;
    inst.frustumCulled = false;
    this.group.add(inst);
  }

  // Concrete ring ribs protruding slightly into the bore every few metres.
  // They're the strongest cue for reading the tunnel: regular spacing gives it
  // measurable length, and the ribs sweeping around a bend show the curve.
  _tunnelRibs(mat) {
    const { Wt, Hw, Ha } = TUNNEL;
    // Shallow on purpose: past some distance the ribs overlap into a continuous
    // inner tube, and the boundary where that tube hides the wall behind it
    // draws an arc down the bore. The deeper they stand, the harder that arc.
    const inset = 0.13;
    const W = Wt - inset, H = Hw, A = Ha - inset;
    const AS = 12, L = 0.6;                          // arch segments, rib length along z
    // Arch only, now that the walls below are open bays — a rib carried down
    // past the roofline would hang in mid-air over the opening.
    const sec = [[-W, H]];
    for (let k = 1; k < AS; k++) { const p = Math.PI * (1 - k / AS); sec.push([W * Math.cos(p), H + A * Math.sin(p)]); }
    sec.push([W, H]);
    const M = sec.length;
    const verts = [], uvs = [], idx = [];
    for (let r = 0; r < 2; r++) {
      for (let m = 0; m < M; m++) { verts.push(sec[m][0], sec[m][1], r * L); uvs.push(m / (M - 1) * 3, r * 0.3); }
    }
    for (let m = 0; m < M - 1; m++) { const a = m, b = m + 1, c = M + m, d = M + m + 1; idx.push(a, c, b, b, c, d); }
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    rg.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    rg.setIndex(idx); rg.computeVertexNormals();

    const spacing = 9;
    const mats = [];
    const up = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
    for (let z = ROAD.lengthStart; z < ROAD.lengthEnd; z += spacing) {
      q.setFromAxisAngle(up, Math.atan2(roadSlope(z), 1));   // follow the bend
      mats.push(new THREE.Matrix4().compose(new THREE.Vector3(roadX(z), 0, z), q, one));
    }
    const inst = new THREE.InstancedMesh(rg, mat, mats.length);
    for (let i = 0; i < mats.length; i++) inst.setMatrixAt(i, mats[i]);
    inst.instanceMatrix.needsUpdate = true;
    inst.frustumCulled = false;
    this.group.add(inst);
  }

  // warm sodium lights lining both tunnel walls, staggered, glowing in the fog.
  // Reuses the volumetric-glow (lampHeads) + spotlight-pool machinery.
  _tunnelLights() {
    const { Hw, Ha } = TUNNEL;
    const heads = [];               // all fixture positions (feed the volumetric glow)
    const ceilHeads = [];           // ceiling-only positions (aim spotlights down onto the car)
    const ceilMats = [];
    const yc = Hw + Ha - 0.35;      // ceiling fixtures hung just below the arch apex
    const spacing = 30;             // sparse — long dark stretches between lamps
    for (let z = ROAD.lengthStart + 10; z < ROAD.lengthEnd; z += spacing) {
      // a row of ceiling fixtures running down the crown of the arch
      const cx = roadX(z);
      ceilMats.push(new THREE.Matrix4().makeTranslation(cx, yc, z));
      const h = new THREE.Vector3(cx, yc, z);
      heads.push(h); ceilHeads.push(h);
    }
    const lens = new THREE.MeshStandardMaterial({
      color: 0xffca82, emissive: 0xff8a2a, emissiveIntensity: 0, roughness: 0.5, metalness: 0.1, toneMapped: true,
    });
    this._lensMat = lens;
    // Ceiling fixtures. A round core rather than a flat disc — a disc seen at
    // the shallow angle you get looking down the tunnel foreshortens into a
    // hard-edged rectangle, while a sphere stays soft and round from anywhere.
    // Big enough to cover real pixels: a tiny emitter is only a few pixels wide,
    // and bloom's mip chain smears something that small into a blocky square
    // rather than a round halo.
    const ceilGeo = new THREE.SphereGeometry(0.55, 16, 12);
    const ceilInst = new THREE.InstancedMesh(ceilGeo, lens, ceilMats.length);
    for (let i = 0; i < ceilMats.length; i++) ceilInst.setMatrixAt(i, ceilMats[i]);
    ceilInst.instanceMatrix.needsUpdate = true; ceilInst.frustumCulled = false;
    this.group.add(ceilInst);

    // The halo: a camera-facing quad carrying a gaussian falloff, added over the
    // scene. Unlike a shell mesh it has no silhouette of its own, and unlike
    // relying on bloom alone it can't go blocky — bloom builds its glow from
    // coarse mips, which squares off around a small bright source. Billboarded
    // in the vertex shader so one instanced draw covers every fixture.
    this._glowMat = new THREE.MeshBasicMaterial({
      map: this._glowTex(), color: 0xff9a3c, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    });
    this._glowMat.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace(
        '#include <project_vertex>',
        `vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
         mvPosition.xy += transformed.xy;
         gl_Position = projectionMatrix * mvPosition;`,
      );
    };
    this._glowMat.customProgramCacheKey = () => 'billboardglow';
    const glowInst = new THREE.InstancedMesh(new THREE.PlaneGeometry(5.2, 5.2), this._glowMat, ceilMats.length);
    for (let i = 0; i < ceilMats.length; i++) glowInst.setMatrixAt(i, ceilMats[i]);
    glowInst.instanceMatrix.needsUpdate = true;
    glowInst.frustumCulled = false;
    glowInst.renderOrder = 3;
    this.group.add(glowInst);
    this.lampHeads = heads;
    this.ceilHeads = ceilHeads;

    // a small pool of real spotlights re-homed onto the nearest fixtures each
    // frame, casting warm pools on the road/walls + lighting the car from above
    this._lampLights = [];
    for (let i = 0; i < 4; i++) {
      // Wide cone, full penumbra, gentle decay and a reach well past the pool it
      // casts — a narrow cone with a short range stamps a hard-edged circle of
      // light on the road where the cone and the distance cutoff bite.
      const sl = new THREE.SpotLight(0xffb267, 0, 90, 1.32, 1.0, 1.15);
      sl.visible = false; sl.castShadow = false;
      this.group.add(sl); this.group.add(sl.target);
      this._lampLights.push(sl);
    }
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

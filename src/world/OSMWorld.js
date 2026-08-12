import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { makeNormalMap, makeRoughnessMap, makeAsphaltAlbedo } from '../render/textures.js';
import { loadElevation } from './Elevation.js';
import { assets, PH_MODELS } from '../render/AssetLibrary.js';
import { makeStreetlamp, makeTree, makePine, makeCarProp, CAR_COLORS } from './props.js';

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

// Drivable / paintable road widths (metres) by OSM highway class.
const ROAD_WIDTH = {
  motorway: 11, motorway_link: 7, trunk: 10, trunk_link: 6,
  primary: 8.5, primary_link: 5.5, secondary: 7.5, secondary_link: 5,
  tertiary: 6.5, tertiary_link: 4.5, residential: 5.5, unclassified: 5.5,
  living_street: 5, service: 4, road: 5.5,
  pedestrian: 4, footway: 2, path: 1.8, cycleway: 2.4, track: 3,
};
const MAJOR = new Set(['motorway', 'trunk', 'primary', 'secondary']);

export class OSMWorld {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.carStart = { pos: new THREE.Vector3(0, 0, 0), heading: 0 };
    this._extras = [];
    this.waters = [];
    this.sunDir = new THREE.Vector3(0.6, 0.5, 0.3).normalize();
  }

  // real-world terrain height at local (x, z); 0 when elevation is unavailable
  heightAt(x, z) {
    if (!this.elev) return 0;
    const lat = this.lat0 + z / this.mPerLat;
    const lng = this.lng0 + x / this.mPerLng;
    return this.elev.sample(lat, lng);
  }

  async load({ lat, lng, radius = 700, sunDir, onProgress = () => {} }) {
    this.lat0 = lat; this.lng0 = lng;
    this.mPerLat = 111320;
    this.mPerLng = 111320 * Math.cos((lat * Math.PI) / 180);
    if (sunDir) this.sunDir.copy(sunDir);

    onProgress('Contacting OpenStreetMap…');
    const data = await this._fetch(lat, lng, radius);

    onProgress('Reading real terrain elevation…');
    try {
      this.elev = await loadElevation(lat, lng, radius * 1.4);
    } catch (e) {
      this.elev = null;
    }

    onProgress('Building the world…');
    this._ground(radius);
    const ways = data.elements.filter((e) => e.type === 'way' && e.geometry && e.geometry.length > 1);
    this._buildRoads(ways);
    this._buildAreas(ways);
    this._buildBuildings(ways);
    this._placeCarOnRoad(ways);
    onProgress('Adding trees, lamps and traffic…');
    await Promise.all([this._streetProps(ways), this._parkTrees(ways)]);
    onProgress('Ready');
    return this;
  }

  // animate water each frame
  update(dt) {
    for (const w of this.waters) w.material.uniforms.time.value += dt;
  }

  project(lat, lng) {
    return new THREE.Vector2((lng - this.lng0) * this.mPerLng, (lat - this.lat0) * this.mPerLat);
  }

  async _fetch(lat, lng, radius) {
    const dLat = radius / this.mPerLat;
    const dLng = radius / this.mPerLng;
    const bbox = `${lat - dLat},${lng - dLng},${lat + dLat},${lng + dLng}`;
    const q = `[out:json][timeout:25];(
      way["highway"](${bbox});
      way["building"](${bbox});
      way["natural"="water"](${bbox});
      way["waterway"~"riverbank|dock|canal"](${bbox});
      way["landuse"~"grass|forest|meadow|recreation_ground|village_green|cemetery"](${bbox});
      way["leisure"~"park|garden|pitch|golf_course"](${bbox});
    );out geom;`;

    let lastErr;
    for (const url of OVERPASS_ENDPOINTS) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 28000);
        const res = await fetch(url, {
          method: 'POST',
          body: 'data=' + encodeURIComponent(q),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          signal: ctrl.signal,
        });
        clearTimeout(t);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const json = await res.json();
        if (!json.elements || !json.elements.length) throw new Error('No OSM data at this location');
        return json;
      } catch (e) {
        lastErr = e;
      }
    }
    throw new Error('OpenStreetMap fetch failed: ' + (lastErr ? lastErr.message : 'unknown'));
  }

  _ground(radius) {
    const size = radius * 3;
    const normalMap = makeNormalMap(512, { freq: 0.06, strength: 1.0, z: 7 });
    normalMap.repeat.set(size / 12, size / 12);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x8b9280, roughness: 1, metalness: 0,
      normalMap, normalScale: new THREE.Vector2(0.4, 0.4), envMapIntensity: 0.4,
      vertexColors: !!this.elev,
    });
    this._groundNormal = normalMap;

    if (this.elev) {
      // subdivided grid draped over real elevation
      const seg = 180;
      const geo = new THREE.PlaneGeometry(size, size, seg, seg);
      geo.rotateX(-Math.PI / 2);
      const pos = geo.attributes.position;
      const colors = new Float32Array(pos.count * 3);
      const cLow = new THREE.Color(0x7c8a63), cHigh = new THREE.Color(0x9a8f7a), cRock = new THREE.Color(0x6f6659);
      const tmp = new THREE.Color();
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), z = pos.getZ(i);
        const h = this.heightAt(x, z);
        pos.setY(i, h - 0.05);
        const t = THREE.MathUtils.clamp((h + 20) / 120, 0, 1);
        tmp.copy(cLow).lerp(cHigh, t);
        colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, mat);
      m.receiveShadow = true;
      this.group.add(m);
    } else {
      const geo = new THREE.PlaneGeometry(size, size);
      geo.rotateX(-Math.PI / 2);
      const m = new THREE.Mesh(geo, mat);
      m.position.y = -0.05;
      m.receiveShadow = true;
      this.group.add(m);
    }
  }

  // ---------- roads ----------
  _buildRoads(ways) {
    const minor = [], major = [], center = [];
    for (const w of ways) {
      const hw = w.tags && w.tags.highway;
      if (!hw) continue;
      const width = ROAD_WIDTH[hw] || 5;
      const pts = w.geometry.map((g) => this.project(g.lat, g.lon));
      const ribbon = this._ribbon(pts, width, 0.0); // flush with terrain; polygonOffset lifts it
      if (!ribbon) continue;
      (MAJOR.has(hw) ? major : minor).push(ribbon);
      if (MAJOR.has(hw)) {
        const line = this._ribbon(pts, 0.28, 0.04);
        if (line) center.push(line);
      }
    }
    const asphaltNormal = makeNormalMap(512, { freq: 0.09, strength: 1.0, z: 9 });
    const roughMap = makeRoughnessMap(512, { base: 0.82, range: 0.14, z: 11 });
    const po = { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 };
    const asphalt = new THREE.MeshStandardMaterial({
      map: this._markingTex(false), roughness: 0.85, metalness: 0.0,
      normalMap: asphaltNormal, normalScale: new THREE.Vector2(0.35, 0.35),
      roughnessMap: roughMap, envMapIntensity: 0.5, ...po,
    });
    const asphalt2 = new THREE.MeshStandardMaterial({
      map: this._markingTex(true), roughness: 0.85, metalness: 0.0,
      normalMap: asphaltNormal, normalScale: new THREE.Vector2(0.35, 0.35),
      roughnessMap: roughMap, envMapIntensity: 0.5, ...po,
    });
    this._roadNormal = asphaltNormal;
    if (minor.length) this._addMerged(minor, asphalt, true);
    if (major.length) this._addMerged(major, asphalt2, true);
    if (center.length) this._addMerged(center, new THREE.MeshStandardMaterial({
      color: 0xe9c94a, roughness: 0.6, emissive: 0x2a2410, emissiveIntensity: 0.2, ...po,
      polygonOffsetFactor: -3, polygonOffsetUnits: -3,
    }), false);
  }

  // asphalt colour map with painted edge lines (u across road), optional lane dashes
  _markingTex(major) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = major ? '#42454b' : '#3a3d42';
    g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 1400; i++) {
      const v = 44 + Math.floor(Math.random() * 34);
      g.fillStyle = `rgb(${v},${v},${v + 2})`;
      g.fillRect(Math.random() * 128, Math.random() * 128, 1.2, 1.2);
    }
    g.fillStyle = '#dfe0d8';           // solid white edge lines
    g.fillRect(6, 0, 4, 128);
    g.fillRect(118, 0, 4, 128);
    if (major) {                        // dashed white lane divider
      g.fillStyle = '#e7e8e0';
      for (let y = 0; y < 128; y += 40) g.fillRect(62, y, 4, 20);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  // build a ribbon from a polyline, draped over terrain, with mitred joins + length UVs
  _ribbon(pts, width, raise) {
    if (pts.length < 2) return null;
    const hw = width / 2;
    const left = [], right = [], vcoord = [];
    let dist = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const a = pts[Math.max(0, i - 1)];
      const b = pts[Math.min(pts.length - 1, i + 1)];
      let tx = b.x - a.x, tz = b.y - a.y;
      const tl = Math.hypot(tx, tz) || 1;
      tx /= tl; tz /= tl;
      const nx = -tz, nz = tx;
      if (i > 0) dist += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      vcoord.push(dist / 3); // one texture tile per ~3 m
      const y = this.heightAt(p.x, p.y) + raise; // one height per cross-section keeps the road level
      left.push(new THREE.Vector3(p.x + nx * hw, y, p.y + nz * hw));
      right.push(new THREE.Vector3(p.x - nx * hw, y, p.y - nz * hw));
    }
    const verts = [], idx = [], uvs = [];
    for (let i = 0; i < pts.length; i++) {
      verts.push(left[i].x, left[i].y, left[i].z);
      verts.push(right[i].x, right[i].y, right[i].z);
      uvs.push(0, vcoord[i], 1, vcoord[i]);
      if (i > 0) {
        const a = (i - 1) * 2, b = a + 1, c = i * 2, d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  _addMerged(geos, material, receiveShadow) {
    const merged = mergeGeometries(geos, false);
    if (!merged) return;
    geos.forEach((g) => g.dispose());
    const m = new THREE.Mesh(merged, material);
    m.receiveShadow = !!receiveShadow;
    m.renderOrder = receiveShadow ? 0 : 1;
    this.group.add(m);
  }

  // ---------- water & green areas (flat filled polygons) ----------
  _buildAreas(ways) {
    const water = [], green = [];
    for (const w of ways) {
      const t = w.tags || {};
      const isWater = t.natural === 'water' || /riverbank|dock|canal/.test(t.waterway || '');
      const isGreen = /grass|forest|meadow|recreation_ground|village_green|cemetery/.test(t.landuse || '') ||
        /park|garden|pitch|golf_course/.test(t.leisure || '');
      if (!isWater && !isGreen) continue;
      // water stays in the XY plane (Water mesh is rotated); green lies flat
      const shapeGeo = this._fillShape(w.geometry, !isWater);
      if (!shapeGeo) continue;
      if (isGreen && this.elev) {
        let cx = 0, cz = 0;
        for (const g of w.geometry) { const p = this.project(g.lat, g.lon); cx += p.x; cz += p.y; }
        shapeGeo.translate(0, this.heightAt(cx / w.geometry.length, cz / w.geometry.length), 0);
      }
      (isWater ? water : green).push(shapeGeo);
    }
    if (green.length) {
      const gNormal = makeNormalMap(256, { freq: 0.12, strength: 1.2, z: 13 });
      this._addMerged(green, new THREE.MeshStandardMaterial({
        color: 0x4f7d3a, roughness: 1,
        normalMap: gNormal, normalScale: new THREE.Vector2(0.5, 0.5), envMapIntensity: 0.4,
      }), true);
    }
    if (water.length) this._buildWater(water);
  }

  // one realistic reflective Water surface covering all water polygons
  _buildWater(geos) {
    const merged = mergeGeometries(geos, false);
    if (!merged) return;
    geos.forEach((g) => g.dispose());
    const waterNormals = makeNormalMap(512, { freq: 0.03, strength: 1.6, z: 21 });
    waterNormals.repeat.set(1, 1);
    const water = new Water(merged, {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals,
      sunDirection: this.sunDir.clone(),
      sunColor: 0xffffff,
      waterColor: 0x224b6b,
      distortionScale: 2.6,
      fog: !!this.scene.fog,
    });
    water.position.y = 0.06;
    water.rotation.x = -Math.PI / 2; // XY-plane geometry -> horizontal, normal +Y
    this.group.add(water);
    this.waters.push(water);
  }

  _fillShape(geometry, flat = true) {
    if (geometry.length < 3) return null;
    const shape = new THREE.Shape();
    geometry.forEach((g, i) => {
      const p = this.project(g.lat, g.lon);
      // shape Y = -worldZ so a -90° X rotation lands it back at +worldZ
      if (i === 0) shape.moveTo(p.x, -p.y);
      else shape.lineTo(p.x, -p.y);
    });
    let geo;
    try { geo = new THREE.ShapeGeometry(shape); } catch { return null; }
    if (flat) {
      geo.rotateX(-Math.PI / 2);
      geo.translate(0, 0.01, 0);
    }
    // when not flat, geometry stays in XY plane for the Water mesh to rotate
    return geo;
  }

  // ---------- buildings: windowed facades, roofs, height-based palette ----------
  _buildBuildings(ways) {
    const lowG = [], tallG = [];   // low = concrete/brick, tall = glass
    const palette = [0xcfc8ba, 0xc2b4a0, 0xb8bcc0, 0xa89f92, 0xcabfae, 0x9fa6ac];
    for (const w of ways) {
      const t = w.tags || {};
      if (!t.building) continue;
      if (w.geometry.length < 4) continue;
      const height = this._buildingHeight(t, w.id);
      const shape = new THREE.Shape();
      w.geometry.forEach((g, i) => {
        const p = this.project(g.lat, g.lon);
        if (i === 0) shape.moveTo(p.x, -p.y);
        else shape.lineTo(p.x, -p.y);
      });
      let geo;
      try {
        geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, steps: 1 });
      } catch { continue; }
      geo.rotateX(-Math.PI / 2); // groups: 0 = caps (roof), 1 = walls
      const tall = height >= 26;
      const col = new THREE.Color(tall ? 0x9fb0bd : palette[w.id % palette.length]);
      const pos = geo.attributes.position;
      const colors = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count; i++) { colors[i * 3] = col.r; colors[i * 3 + 1] = col.g; colors[i * 3 + 2] = col.b; }
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      let cx = 0, cz = 0;
      for (const g of w.geometry) { const p = this.project(g.lat, g.lon); cx += p.x; cz += p.y; }
      cx /= w.geometry.length; cz /= w.geometry.length;
      geo.translate(0, this.heightAt(cx, cz) - 0.3, 0);
      (tall ? tallG : lowG).push(geo);
    }
    if (!lowG.length && !tallG.length) return;

    const facadeNormal = makeNormalMap(256, { freq: 0.2, strength: 0.7, z: 31 });
    facadeNormal.repeat.set(0.4, 0.4);
    const win = this._facadeTextures();
    const mkRoof = (c) => new THREE.MeshStandardMaterial({ color: c, vertexColors: true, roughness: 0.9, metalness: 0.05, envMapIntensity: 0.5 });

    if (lowG.length) {
      const facade = new THREE.MeshStandardMaterial({
        vertexColors: true, map: win.map, emissiveMap: win.emissive, emissive: 0xffffff, emissiveIntensity: 0.35,
        normalMap: facadeNormal, normalScale: new THREE.Vector2(0.4, 0.4), roughness: 0.78, metalness: 0.04, envMapIntensity: 0.6,
      });
      const merged = mergeGeometries(lowG, true); // keep groups -> [roof, facade]
      lowG.forEach((g) => g.dispose());
      const mesh = new THREE.Mesh(merged, [mkRoof(0x9a9488), facade]);
      mesh.castShadow = mesh.receiveShadow = true;
      this.group.add(mesh);
    }
    if (tallG.length) {
      const glass = new THREE.MeshStandardMaterial({
        vertexColors: true, map: win.mapGlass, emissiveMap: win.emissive, emissive: 0xffffff, emissiveIntensity: 0.4,
        roughness: 0.28, metalness: 0.55, envMapIntensity: 1.1,
      });
      const merged = mergeGeometries(tallG, true);
      tallG.forEach((g) => g.dispose());
      const mesh = new THREE.Mesh(merged, [mkRoof(0x6f7680), glass]);
      mesh.castShadow = mesh.receiveShadow = true;
      this.group.add(mesh);
    }
  }

  // window-grid facade colour maps (+ emissive lit windows), UVs are in metres
  _facadeTextures() {
    const build = (wall, glassy) => {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const g = c.getContext('2d');
      g.fillStyle = wall; g.fillRect(0, 0, 128, 128);
      const cols = 4, rows = 4, mw = 128 / cols, mh = 128 / rows;
      for (let yy = 0; yy < rows; yy++) for (let xx = 0; xx < cols; xx++) {
        g.fillStyle = glassy ? '#2b3946' : '#20262e';
        g.fillRect(xx * mw + mw * 0.18, yy * mh + mh * 0.2, mw * 0.64, mh * 0.56);
      }
      const t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / 4, 1 / 3.4);
      t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
      return t;
    };
    // emissive: a random subset of windows glow warm
    const ce = document.createElement('canvas'); ce.width = ce.height = 128;
    const ge = ce.getContext('2d'); ge.fillStyle = '#000'; ge.fillRect(0, 0, 128, 128);
    const cols = 4, rows = 4, mw = 128 / cols, mh = 128 / rows; let s = 7;
    const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    for (let yy = 0; yy < rows; yy++) for (let xx = 0; xx < cols; xx++) {
      if (rnd() < 0.28) { ge.fillStyle = rnd() < 0.5 ? '#ffd489' : '#bcd2e6'; ge.fillRect(xx * mw + mw * 0.18, yy * mh + mh * 0.2, mw * 0.64, mh * 0.56); }
    }
    const em = new THREE.CanvasTexture(ce);
    em.wrapS = em.wrapT = THREE.RepeatWrapping; em.repeat.set(1 / 4, 1 / 3.4); em.anisotropy = 8;
    return { map: build('#b9b2a4', false), mapGlass: build('#8fa6b6', true), emissive: em };
  }

  _buildingHeight(tags, id) {
    if (tags.height) {
      const h = parseFloat(tags.height);
      if (!isNaN(h)) return Math.max(3, h);
    }
    if (tags['building:levels']) {
      const l = parseFloat(tags['building:levels']);
      if (!isNaN(l)) return Math.max(3, l * 3.2);
    }
    // deterministic pseudo-random from id
    const r = ((id * 2654435761) % 1000) / 1000;
    return 6 + r * 18;
  }

  async _instanceOrFallback(url, matrices, fallbackGeo, fallbackMat) {
    if (!matrices.length) return;
    const g = await assets.instances(url, matrices);
    if (g) { this.group.add(g); return; }
    const inst = new THREE.InstancedMesh(fallbackGeo, fallbackMat, matrices.length);
    inst.castShadow = true; inst.receiveShadow = true;
    matrices.forEach((m, i) => inst.setMatrixAt(i, m));
    inst.instanceMatrix.needsUpdate = true;
    this.group.add(inst);
  }

  _drivable(w) {
    return w.tags && w.tags.highway && !/footway|path|cycleway|steps|pedestrian|track/.test(w.tags.highway);
  }

  // streetlamps along roads + parked traffic cars
  async _streetProps(ways) {
    const lampMats = [], carMats = [], carColors = [];
    const up = new THREE.Vector3(0, 1, 0);
    const q = new THREE.Quaternion(), s = new THREE.Vector3();
    let lampSide = 1, carPick = 0;
    for (const w of ways) {
      if (!this._drivable(w)) continue;
      const width = ROAD_WIDTH[w.tags.highway] || 5;
      const pts = w.geometry.map((g) => this.project(g.lat, g.lon));
      let acc = 0;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        let tx = b.x - a.x, tz = b.y - a.y;
        const seg = Math.hypot(tx, tz) || 1; tx /= seg; tz /= seg;
        const nx = -tz, nz = tx;
        acc += seg;
        if (acc >= 46 && lampMats.length < 500) {
          acc = 0; lampSide *= -1;
          const px = b.x + lampSide * nx * (width / 2 + 1.1);
          const pz = b.y + lampSide * nz * (width / 2 + 1.1);
          const dToRoad = new THREE.Vector3(-lampSide * nx, 0, -lampSide * nz);
          q.setFromAxisAngle(up, Math.atan2(-dToRoad.z, dToRoad.x));
          s.set(5.6, 5.6, 5.6);
          lampMats.push(new THREE.Matrix4().compose(new THREE.Vector3(px, this.heightAt(px, pz), pz), q, s));
          // occasional parked car on the opposite side
          if (carMats.length < 260 && Math.abs(px) > 8) {
            const cpx = b.x - lampSide * nx * (width / 2 - 0.6);
            const cpz = b.y - lampSide * nz * (width / 2 - 0.6);
            q.setFromAxisAngle(up, Math.atan2(tx, tz));
            carMats.push(new THREE.Matrix4().compose(new THREE.Vector3(cpx, this.heightAt(cpx, cpz), cpz), q, new THREE.Vector3(1, 1, 1)));
            carColors.push(CAR_COLORS[(carPick++) % CAR_COLORS.length]);
          }
        }
      }
    }
    const lamp = makeStreetlamp();
    await this._instanceOrFallback(PH_MODELS.lamp, lampMats, this._unit(lamp.geo), lamp.materials);

    if (carMats.length) {
      const carGeo = makeCarProp();
      const carMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.55, envMapIntensity: 1.1 });
      const cars = new THREE.InstancedMesh(carGeo, carMat, carMats.length);
      cars.castShadow = true; cars.receiveShadow = true;
      const col = new THREE.Color();
      carMats.forEach((m, i) => { cars.setMatrixAt(i, m); cars.setColorAt(i, col.setHex(carColors[i])); });
      cars.instanceMatrix.needsUpdate = true;
      this.group.add(cars);
    }
  }

  // trees scattered inside parks / green areas
  async _parkTrees(ways) {
    const pine = [], leafy = [];
    const up = new THREE.Vector3(0, 1, 0);
    const q = new THREE.Quaternion(), s = new THREE.Vector3();
    let seed = 1;
    const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    for (const w of ways) {
      const t = w.tags || {};
      const green = /grass|forest|meadow|recreation_ground|village_green|cemetery/.test(t.landuse || '') ||
        /park|garden|golf_course/.test(t.leisure || '');
      if (!green || w.geometry.length < 4) continue;
      const poly = w.geometry.map((g) => this.project(g.lat, g.lon));
      let minx = Infinity, maxx = -Infinity, minz = Infinity, maxz = -Infinity;
      for (const p of poly) { minx = Math.min(minx, p.x); maxx = Math.max(maxx, p.x); minz = Math.min(minz, p.y); maxz = Math.max(maxz, p.y); }
      const area = (maxx - minx) * (maxz - minz);
      const n = Math.min(60, Math.max(3, Math.floor(area / 220)));
      for (let k = 0; k < n && pine.length + leafy.length < 700; k++) {
        const px = minx + rand() * (maxx - minx);
        const pz = minz + rand() * (maxz - minz);
        if (!this._pointInPoly(px, pz, poly)) continue;
        const height = 5 + rand() * 6;
        q.setFromAxisAngle(up, rand() * Math.PI * 2);
        s.set(height, height, height);
        (rand() < 0.5 ? pine : leafy).push(new THREE.Matrix4().compose(new THREE.Vector3(px, this.heightAt(px, pz), pz), q, s));
      }
    }
    const leafMat = () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, envMapIntensity: 0.4 });
    await Promise.all([
      this._instanceOrFallback(PH_MODELS.pine, pine, this._unit(makePine()), leafMat()),
      this._instanceOrFallback(PH_MODELS.tree, leafy, this._unit(makeTree()), leafMat()),
    ]);
  }

  _unit(geo) {
    geo.computeBoundingBox();
    const h = (geo.boundingBox.max.y - geo.boundingBox.min.y) || 1;
    geo.translate(0, -geo.boundingBox.min.y, 0);
    geo.scale(1 / h, 1 / h, 1 / h);
    return geo;
  }

  _pointInPoly(x, z, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x, zi = poly[i].y, xj = poly[j].x, zj = poly[j].y;
      if (((zi > z) !== (zj > z)) && (x < ((xj - xi) * (z - zi)) / (zj - zi) + xi)) inside = !inside;
    }
    return inside;
  }

  // start the car on the nearest road, aligned to its direction
  _placeCarOnRoad(ways) {
    let best = null, bestD = Infinity, bestHeading = 0;
    for (const w of ways) {
      if (!(w.tags && w.tags.highway)) continue;
      if (/footway|path|cycleway|steps|pedestrian/.test(w.tags.highway)) continue;
      const pts = w.geometry.map((g) => this.project(g.lat, g.lon));
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        const mx = (a.x + b.x) / 2, mz = (a.y + b.y) / 2;
        const d = mx * mx + mz * mz;
        if (d < bestD) {
          bestD = d; best = new THREE.Vector3(mx, 0, mz);
          bestHeading = Math.atan2(b.x - a.x, b.y - a.y);
        }
      }
    }
    if (best) {
      best.y = this.heightAt(best.x, best.z);
      this.carStart.pos.copy(best);
      this.carStart.heading = bestHeading;
    }
  }

  dispose() {
    this.group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => m.dispose());
      }
    });
    this.scene.remove(this.group);
    for (const e of this._extras) this.scene.remove(e);
    this.scene.fog = null;
  }
}

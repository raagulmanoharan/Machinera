import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { makeNormalMap, makeRoughnessMap, makeAsphaltAlbedo } from '../render/textures.js';
import { loadElevation } from './Elevation.js';

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
      const ribbon = this._ribbon(pts, width, 0.08);
      if (!ribbon) continue;
      (MAJOR.has(hw) ? major : minor).push(ribbon);
      if (MAJOR.has(hw)) {
        const line = this._ribbon(pts, 0.3, 0.14);
        if (line) center.push(line);
      }
    }
    const asphaltNormal = makeNormalMap(512, { freq: 0.09, strength: 1.0, z: 9 });
    asphaltNormal.repeat.set(1, 1);
    const roughMap = makeRoughnessMap(512, { base: 0.82, range: 0.14, z: 11 });
    const asphalt = new THREE.MeshStandardMaterial({
      color: 0x3a3d42, roughness: 0.85, metalness: 0.0,
      normalMap: asphaltNormal, normalScale: new THREE.Vector2(0.35, 0.35),
      roughnessMap: roughMap, envMapIntensity: 0.5,
    });
    const asphalt2 = asphalt.clone();
    asphalt2.color.setHex(0x44474d);
    this._roadNormal = asphaltNormal;
    if (minor.length) this._addMerged(minor, asphalt, true);
    if (major.length) this._addMerged(major, asphalt2, true);
    if (center.length) this._addMerged(center, new THREE.MeshStandardMaterial({ color: 0xe9c94a, roughness: 0.6, emissive: 0x2a2410, emissiveIntensity: 0.2 }), false);
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

  // ---------- buildings (extruded footprints) ----------
  _buildBuildings(ways) {
    const geos = [];
    const cA = new THREE.Color(0xbdb4a6), cB = new THREE.Color(0x8f8578);
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
      geo.rotateX(-Math.PI / 2);
      // colour per building with slight variation, roofs lighter
      const col = cA.clone().lerp(cB, ((w.id % 100) / 100));
      const pos = geo.attributes.position;
      const colors = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count; i++) {
        const yv = pos.getY(i);
        const roof = yv > height - 0.2 ? 1.12 : 1.0;
        colors[i * 3] = Math.min(1, col.r * roof);
        colors[i * 3 + 1] = Math.min(1, col.g * roof);
        colors[i * 3 + 2] = Math.min(1, col.b * roof);
      }
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      // sit the building base on the terrain
      let cx = 0, cz = 0;
      for (const g of w.geometry) { const p = this.project(g.lat, g.lon); cx += p.x; cz += p.y; }
      cx /= w.geometry.length; cz /= w.geometry.length;
      geo.translate(0, this.heightAt(cx, cz) - 0.3, 0);
      geos.push(geo);
    }
    if (!geos.length) return;
    const merged = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    const facade = makeNormalMap(256, { freq: 0.2, strength: 0.9, z: 31 });
    facade.repeat.set(0.4, 0.4); // ExtrudeGeometry UVs are in metres
    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.82, metalness: 0.04,
      normalMap: facade, normalScale: new THREE.Vector2(0.35, 0.35),
      envMapIntensity: 0.7,
    });
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.group.add(mesh);
    this._facadeNormal = facade;
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

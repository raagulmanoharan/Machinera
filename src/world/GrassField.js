import * as THREE from 'three';
import { applyWind } from '../render/wind.js';

// A dense field of real 3D grass blades that follows the car — an overgrown,
// wind-swaying meadow. Blades sit on a jittered grid within a radius; the whole
// field recenters (and re-drapes onto the terrain) when the car moves far
// enough, so between moves the grass is static in the world. Instanced, with a
// base→tip colour gradient and per-blade tint variation for a lush, hazy look.
export class GrassField {
  constructor(scene, {
    heightAt, skip, count = 150, spacing = 0.28, seed = 7,
    hMin = 0.6, hMax = 1.5, windAmp = 0.17,
    base = 0x2c521f, tip = 0x9ec85a,
  } = {}) {
    this.heightAt = heightAt || (() => 0);
    this.skip = skip || (() => false);
    this.spacing = spacing;
    this.total = count * count;
    this.radius = (count * spacing) / 2;
    this._center = new THREE.Vector3(1e9, 0, 1e9);

    let s = seed >>> 0;
    const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    this._off = new Float32Array(this.total * 2);
    this._yaw = new Float32Array(this.total);
    this._scl = new Float32Array(this.total * 2); // height, width
    const half = this.radius;
    for (let i = 0; i < this.total; i++) {
      const gx = (i % count), gz = (i / count) | 0;
      this._off[i * 2] = gx * spacing - half + (rnd() - 0.5) * spacing * 1.4;
      this._off[i * 2 + 1] = gz * spacing - half + (rnd() - 0.5) * spacing * 1.4;
      this._yaw[i] = rnd() * Math.PI;
      this._scl[i * 2] = hMin + rnd() * (hMax - hMin);   // blade height (m)
      this._scl[i * 2 + 1] = 0.8 + rnd() * 0.5;          // width factor
    }

    const geo = this._blade(base, tip);
    this.material = applyWind(new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.9, metalness: 0.0, envMapIntensity: 0.45,
      side: THREE.DoubleSide,
    }), windAmp);
    this.mesh = new THREE.InstancedMesh(geo, this.material, this.total);
    this.mesh.castShadow = false; this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false;
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(this.total * 3), 3);
    scene.add(this.mesh);

    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._p = new THREE.Vector3();
    this._sv = new THREE.Vector3();
    this._up = new THREE.Vector3(0, 1, 0);
    this._col = new THREE.Color();
    this._tint = new THREE.Color(1, 1, 1);   // overall tint (liminal moods retune this)
  }

  // a tall, thin, curved blade — unit height, base at y=0
  _blade(baseHex, tipHex) {
    const rows = 5, w0 = 0.055;
    const pos = [], col = [], idx = [];
    const base = new THREE.Color(baseHex), tip = new THREE.Color(tipHex), c = new THREE.Color();
    for (let r = 0; r <= rows; r++) {
      const t = r / rows;
      const w = w0 * (1 - t * 0.85);
      const bend = Math.pow(t, 1.6) * 0.22;      // stronger forward arch near the tip
      pos.push(-w, t, bend, w, t, bend);
      c.copy(base).lerp(tip, t * t);
      col.push(c.r, c.g, c.b, c.r, c.g, c.b);
      if (r < rows) { const a = r * 2, b = a + 1, cc = a + 2, d = a + 3; idx.push(a, cc, b, b, cc, d); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    const n = []; for (let i = 0; i < pos.length / 3; i++) n.push(0, 1, 0);
    g.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3));
    return g;
  }

  // liminal moods can recolour / thin the meadow without rebuilding it
  setMood({ tint, heightScale = 1 } = {}) {
    if (tint) this._tint.set(tint);
    this._heightScale = heightScale;
    this._center.set(1e9, 0, 1e9); // force a re-drape on next update
  }

  update(target) {
    if (!target) return;
    const moved = Math.hypot(target.x - this._center.x, target.z - this._center.z);
    if (moved < 4) return;
    this._center.set(target.x, 0, target.z);
    const hs = this._heightScale || 1;
    for (let i = 0; i < this.total; i++) {
      const x = this._center.x + this._off[i * 2];
      const z = this._center.z + this._off[i * 2 + 1];
      const h = this.heightAt(x, z);
      if (this.skip(x, z) || h > 40) { this._m.makeScale(0, 0, 0); this.mesh.setMatrixAt(i, this._m); continue; }
      const hgt = this._scl[i * 2] * hs, wid = this._scl[i * 2 + 1];
      this._q.setFromAxisAngle(this._up, this._yaw[i]);
      this._p.set(x, h - 0.02, z);
      this._sv.set(wid, hgt, wid);
      this._m.compose(this._p, this._q, this._sv);
      this.mesh.setMatrixAt(i, this._m);
      // per-blade tint variation (greener/yellower clumps), modulated by mood tint
      const v = ((i * 2654435761 >>> 0) % 1000) / 1000;
      this._col.setRGB((0.85 + v * 0.3) * this._tint.r, (0.95 + v * 0.12) * this._tint.g, (0.7 + v * 0.3) * this._tint.b);
      this.mesh.setColorAt(i, this._col);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    if (this.mesh.parent) this.mesh.parent.remove(this.mesh);
  }
}

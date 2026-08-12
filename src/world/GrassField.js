import * as THREE from 'three';
import { applyWind } from '../render/wind.js';

// A field of real 3D grass blades that follows the car. Blades sit on a jittered
// grid within a radius; the whole field recenters (and re-drapes onto the
// terrain) when the car moves far enough, so between moves the grass is static
// in the world. Instanced + wind-swept; a base→tip colour gradient gives depth.
export class GrassField {
  constructor(scene, { heightAt, skip, count = 80, spacing = 0.55, seed = 7 } = {}) {
    this.heightAt = heightAt || (() => 0);
    this.skip = skip || (() => false);        // return true where no grass (road, etc.)
    this.spacing = spacing;
    this.N = count;                            // grid is count × count
    this.total = count * count;
    this.radius = (count * spacing) / 2;
    this._center = new THREE.Vector3(1e9, 0, 1e9);

    // fixed jittered local offsets (relative to field centre)
    let s = seed >>> 0;
    const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    this._off = new Float32Array(this.total * 2);
    this._yaw = new Float32Array(this.total);
    this._scl = new Float32Array(this.total * 2); // height, width
    const half = this.radius;
    for (let i = 0; i < this.total; i++) {
      const gx = (i % count), gz = (i / count) | 0;
      this._off[i * 2] = gx * spacing - half + (rnd() - 0.5) * spacing * 0.9;
      this._off[i * 2 + 1] = gz * spacing - half + (rnd() - 0.5) * spacing * 0.9;
      this._yaw[i] = rnd() * Math.PI;
      this._scl[i * 2] = 0.34 + rnd() * 0.5;       // blade height (m)
      this._scl[i * 2 + 1] = 0.85 + rnd() * 0.4;   // width factor
    }

    const geo = this._blade();
    const mat = applyWind(new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.85, metalness: 0.0, envMapIntensity: 0.5,
      side: THREE.DoubleSide,
    }), 0.09);
    this.mesh = new THREE.InstancedMesh(geo, mat, this.total);
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
  }

  // one tapered, slightly curved blade, unit height, base at y=0
  _blade() {
    const rows = 4, w0 = 0.065;
    const pos = [], col = [], idx = [];
    const base = new THREE.Color(0x2f5a24), tip = new THREE.Color(0x86c14e), c = new THREE.Color();
    for (let r = 0; r <= rows; r++) {
      const t = r / rows;
      const w = w0 * (1 - t) * 0.5;
      const bend = t * t * 0.12;               // gentle forward curve
      pos.push(-w, t, bend, w, t, bend);
      c.copy(base).lerp(tip, t * t);
      col.push(c.r, c.g, c.b, c.r, c.g, c.b);
      if (r < rows) { const a = r * 2, b = a + 1, cc = a + 2, d = a + 3; idx.push(a, cc, b, b, cc, d); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    // soft upward-ish normals so the field reads as lit turf, not hard facets
    const n = []; for (let i = 0; i < pos.length / 3; i++) n.push(0, 1, 0);
    g.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3));
    return g;
  }

  // recenter + re-drape when the car has moved far enough
  update(target) {
    if (!target) return;
    const moved = Math.hypot(target.x - this._center.x, target.z - this._center.z);
    if (moved < 5) return;                    // recenter in ~5 m steps (keeps rebuilds rare)
    this._center.set(target.x, 0, target.z);
    for (let i = 0; i < this.total; i++) {
      const x = this._center.x + this._off[i * 2];
      const z = this._center.z + this._off[i * 2 + 1];
      let h = this.heightAt(x, z);
      // hide blades on the road/verge or on steep/high ground
      if (this.skip(x, z) || h > 40) { this._m.makeScale(0, 0, 0); this.mesh.setMatrixAt(i, this._m); continue; }
      const hgt = this._scl[i * 2], wid = this._scl[i * 2 + 1];
      this._q.setFromAxisAngle(this._up, this._yaw[i]);
      this._p.set(x, h - 0.02, z);
      this._sv.set(wid, hgt, wid);
      this._m.compose(this._p, this._q, this._sv);
      this.mesh.setMatrixAt(i, this._m);
      // subtle per-blade colour variation (yellower/greener patches)
      const v = ((i * 2654435761) % 1000) / 1000;
      this._col.setRGB(0.9 + v * 0.2, 1.0, 0.75 + v * 0.2);
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

import * as THREE from 'three';

// Slow-drifting dust motes in the air around the camera — additive points so
// they glow faintly where the street lamps and fog light them. The whole field
// follows the camera and the motes drift on the wind, so you're always inside a
// haze of floating particles.
export class Dust {
  constructor(scene, { count = 2000, radius = 45, height = 24 } = {}) {
    this.radius = radius; this.height = height; this.count = count;
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    let s = 12345;
    const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (rnd() * 2 - 1) * radius;
      pos[i * 3 + 1] = rnd() * height;
      pos[i * 3 + 2] = (rnd() * 2 - 1) * radius;
      vel[i * 3] = (rnd() - 0.5) * 0.4;
      vel[i * 3 + 1] = -0.05 - rnd() * 0.12;      // slow settle
      vel[i * 3 + 2] = (rnd() - 0.5) * 0.4;
    }
    this._pos = pos; this._vel = vel;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.material = new THREE.PointsMaterial({
      size: 0.05, sizeAttenuation: true, color: 0x8894a2,
      transparent: true, opacity: 0.22, depthWrite: false,
      blending: THREE.AdditiveBlending, fog: true, toneMapped: false,
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this._t = 0;
  }

  update(target, dt = 0.016, wind = 0.6) {
    // keep the field centred on the camera
    this.points.position.set(target.x, 0, target.z);
    const p = this._pos, v = this._vel, r = this.radius, h = this.height;
    for (let i = 0; i < this.count; i++) {
      const j = i * 3;
      p[j] += (v[j] + wind) * dt;
      p[j + 1] += v[j + 1] * dt;
      p[j + 2] += v[j + 2] * dt;
      // wrap within the box so motes never run out
      if (p[j] > r) p[j] -= 2 * r; else if (p[j] < -r) p[j] += 2 * r;
      if (p[j + 2] > r) p[j + 2] -= 2 * r; else if (p[j + 2] < -r) p[j + 2] += 2 * r;
      if (p[j + 1] < 0) p[j + 1] += h; else if (p[j + 1] > h) p[j + 1] -= h;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
  }

  dispose() {
    this.points.geometry.dispose();
    this.material.dispose();
    if (this.points.parent) this.points.parent.remove(this.points);
  }
}

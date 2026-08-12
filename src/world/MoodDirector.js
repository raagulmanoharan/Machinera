import * as THREE from 'three';
import { MOODS } from './moods.js';

// Drifts the world between liminal moods. Continuous parameters (fog, light,
// exposure, grade, lamps, headlights) crossfade every frame; the meadow's
// colour/height snaps once per change (re-draping each frame would be costly).
const HOLD = 38;   // seconds a mood settles before drifting on
const TRANS = 8;   // crossfade seconds

export class MoodDirector {
  constructor(env, pipeline, car, { onChange } = {}) {
    this.env = env; this.pipeline = pipeline; this.car = car;
    this.onChange = onChange;
    this.world = null;
    this.i = 0;
    this.from = MOODS[0]; this.to = MOODS[0];
    this.t = 1;         // transition progress (1 = settled)
    this.timer = 0;
    this._fog = new THREE.Color(); this._sun = new THREE.Color();
    this._hemi = new THREE.Color(); this._sky = new THREE.Color(); this._tmp = new THREE.Color();
    this._apply(MOODS[0], MOODS[0], 1);
    // no initial announcement — the default mood just is; drifts are announced
  }

  setWorld(world) { this.world = world; this._applyDiscrete(this.to); }

  // jump straight to a named mood (for a future picker); otherwise it auto-drifts
  goto(name) {
    const n = MOODS.findIndex((m) => m.name === name);
    if (n < 0) return;
    this.from = MOODS[this.i]; this.to = MOODS[n]; this.i = n; this.t = 0; this.timer = 0;
    this._applyDiscrete(this.to);
    if (this.onChange) this.onChange(this.to.name);
  }

  _next() {
    let n = this.i;
    while (n === this.i) n = (Math.random() * MOODS.length) | 0;
    this.from = MOODS[this.i]; this.to = MOODS[n]; this.i = n; this.t = 0;
    this._applyDiscrete(this.to);
    if (this.onChange) this.onChange(this.to.name);
  }

  _applyDiscrete(m) {
    if (this.world && this.world.grass && this.world.grass.setMood)
      this.world.grass.setMood({ tint: m.grass.tint, heightScale: m.grass.h });
  }

  update(dt) {
    this.timer += dt;
    if (this.t >= 1 && this.timer > HOLD) { this.timer = 0; this._next(); }
    if (this.t < 1) this.t = Math.min(1, this.t + dt / TRANS);
    const k = this.t * this.t * (3 - 2 * this.t);   // smoothstep
    this._apply(this.from, this.to, k);
  }

  _l(a, b, k) { return a + (b - a) * k; }
  _mix(target, aHex, bHex, k) { target.set(aHex); this._tmp.set(bHex); target.lerp(this._tmp, k); return target; }

  _apply(a, b, k) {
    const e = this.env, pl = this.pipeline;
    e.setFog(this._mix(this._fog, a.fog[0], b.fog[0], k), this._l(a.fog[1], b.fog[1], k), this._l(a.fog[2], b.fog[2], k));
    const ev = this._l(a.env, b.env, k);
    e.setEnvIntensity(ev);              // reflections / IBL
    e.setBackground(ev * 1.3);          // HDR sky brightness (dark moods stay dim)
    e.setExposure(this._l(a.exposure, b.exposure, k));
    e.setLight(
      this._mix(this._sun, a.sun[0], b.sun[0], k), this._l(a.sun[1], b.sun[1], k),
      this._mix(this._hemi, a.hemi[0], b.hemi[0], k), this._l(a.hemi[1], b.hemi[1], k),
    );
    pl.setTint(this._l(a.grade[0], b.grade[0], k), this._l(a.grade[1], b.grade[1], k), this._l(a.grade[2], b.grade[2], k));
    pl.setNight(this._l(a.night, b.night, k));
    if (this.car) this.car.setHeadlights(this._l(a.headlights, b.headlights, k));
    if (this.world && this.world.setLamps) this.world.setLamps(this._l(a.lamps, b.lamps, k));
  }
}

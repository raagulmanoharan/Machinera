import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// The Ferrari model is DRACO-compressed; decoder is bundled under /draco.
const DRACO_PATH = (import.meta.env.BASE_URL || './') + 'draco/';

// Signed arcade + bicycle-model vehicle. Units are metres / seconds.
const CFG = {
  maxSpeed: 68,        // ~245 km/h forward
  maxReverse: 12,
  enginePower: 14,     // m/s^2 at full throttle from standstill
  brakePower: 26,
  drag: 0.0016,        // quadratic air drag
  rollResist: 3.2,     // linear rolling resistance
  wheelbase: 2.6,
  maxSteer: 0.55,      // rad at low speed
  steerSpeedFalloff: 42, // higher speed -> less steering angle
  gripBase: 9.0,       // lateral grip (1/s), higher = less slide
  gripHandbrake: 1.6,
};

export class Car {
  constructor(scene) {
    this.group = new THREE.Group();
    scene.add(this.group);

    this.pos = new THREE.Vector3(0, 0, 0);
    this.heading = 0;                 // yaw, 0 faces +Z
    this.vel = new THREE.Vector2(0, 0); // world planar velocity (x, z)
    this.speed = 0;                   // signed forward speed, for HUD
    this._wheelSpin = 0;
    this._steerVis = 0;
    this._prevVLong = 0;
    this._pitch = 0;   // body pitch from accel/brake (weight transfer)
    this._roll = 0;    // body roll from cornering
    this._dist = 0;    // distance travelled, drives road-hump bob
    this._bobY = 0;

    this._build();
  }

  get forward() {
    return new THREE.Vector2(Math.sin(this.heading), Math.cos(this.heading));
  }
  get right() {
    return new THREE.Vector2(Math.cos(this.heading), -Math.sin(this.heading));
  }

  _build() {
    const g = this.group;
    this.body = new THREE.Group(); // pitches/rolls with weight transfer; wheels stay planted
    g.add(this.body);
    const b = this.body;

    const paint = new THREE.MeshPhysicalMaterial({
      color: 0xb01f2e, roughness: 0.3, metalness: 0.55,
      clearcoat: 1.0, clearcoatRoughness: 0.08, envMapIntensity: 0.9,
    });
    const glass = new THREE.MeshPhysicalMaterial({
      color: 0x0a1018, roughness: 0.06, metalness: 0.1,
      clearcoat: 1.0, clearcoatRoughness: 0.05, envMapIntensity: 1.6,
    });
    const trim = new THREE.MeshStandardMaterial({ color: 0x15181d, roughness: 0.5, metalness: 0.4, envMapIntensity: 0.8 });
    const tire = new THREE.MeshStandardMaterial({ color: 0x0e0f11, roughness: 0.85, metalness: 0.0 });
    const rim = new THREE.MeshStandardMaterial({ color: 0xd2d6dc, roughness: 0.22, metalness: 0.95, envMapIntensity: 1.5 });
    const lightF = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2c0, emissiveIntensity: 0.6 });
    const lightR = new THREE.MeshStandardMaterial({ color: 0x330000, emissive: 0xff2020, emissiveIntensity: 0.8 });

    // lower body
    const body = new THREE.Mesh(this._rounded(1.9, 0.55, 4.3, 0.18), paint);
    body.position.y = 0.55;
    body.castShadow = true; body.receiveShadow = true;
    b.add(body);

    // cabin
    const cabin = new THREE.Mesh(this._rounded(1.66, 0.6, 2.2, 0.2), paint);
    cabin.position.set(0, 1.05, -0.1);
    cabin.scale.z = 1;
    cabin.castShadow = true;
    b.add(cabin);

    // greenhouse / windows
    const winMat = glass;
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 0.08), winMat);
    windshield.position.set(0, 1.08, 0.98);
    windshield.rotation.x = -0.5;
    b.add(windshield);
    const rearWin = windshield.clone();
    rearWin.position.set(0, 1.08, -1.18);
    rearWin.rotation.x = 0.6;
    b.add(rearWin);
    const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 1.9), winMat);
    sideL.position.set(0.82, 1.08, -0.1);
    b.add(sideL);
    const sideR = sideL.clone(); sideR.position.x = -0.82; b.add(sideR);

    // bumpers / trim
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.18, 4.32), trim);
    skirt.position.y = 0.28; b.add(skirt);

    // lights
    const hlGeo = new THREE.BoxGeometry(0.34, 0.16, 0.06);
    for (const sx of [-0.62, 0.62]) {
      const hl = new THREE.Mesh(hlGeo, lightF); hl.position.set(sx, 0.62, 2.14); b.add(hl);
      const tl = new THREE.Mesh(hlGeo, lightR); tl.position.set(sx, 0.66, -2.14); b.add(tl);
    }

    // wheels
    this.wheels = [];
    this.frontWheels = [];
    this._wheelPivots = [];
    const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.26, 18);
    wheelGeo.rotateZ(Math.PI / 2);
    const rimGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.28, 8);
    rimGeo.rotateZ(Math.PI / 2);
    const positions = [
      [0.82, 0.36, 1.35, true],
      [-0.82, 0.36, 1.35, true],
      [0.82, 0.36, -1.35, false],
      [-0.82, 0.36, -1.35, false],
    ];
    for (const [x, y, z, front] of positions) {
      const pivot = new THREE.Group();     // steer pivot
      pivot.position.set(x, y, z);
      const spin = new THREE.Group();      // roll pivot
      const w = new THREE.Mesh(wheelGeo, tire); w.castShadow = true;
      const r = new THREE.Mesh(rimGeo, rim);
      spin.add(w); spin.add(r);
      pivot.add(spin);
      g.add(pivot);
      this._wheelPivots.push(pivot);
      this.wheels.push(spin);
      if (front) this.frontWheels.push(pivot);
    }

    // headlight beams — real spotlights, off by day, lighting the road at night
    this.headlights = [];
    this._headMats = [lightF, lightR]; // front/rear emissive, boosted at night
    for (const sx of [-0.6, 0.6]) {
      const hl = new THREE.SpotLight(0xfff1cf, 0, 95, 0.62, 0.55, 1.3);
      hl.position.set(sx, 0.62, 2.0);
      hl.target.position.set(sx * 1.6, -0.35, 26);
      g.add(hl); g.add(hl.target);
      this.headlights.push(hl);
    }

    // soft contact shadow that grounds the car (independent of the sun)
    const cs = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 5.0),
      new THREE.MeshBasicMaterial({ map: this._contactTex(), transparent: true, depthWrite: false, opacity: 0.55 })
    );
    cs.rotation.x = -Math.PI / 2; cs.position.y = 0.03; cs.renderOrder = 2;
    g.add(cs); this._contact = cs;
  }

  _contactTex() {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(64, 64, 6, 64, 64, 62);
    grd.addColorStop(0, 'rgba(0,0,0,0.85)');
    grd.addColorStop(0.6, 'rgba(0,0,0,0.35)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.beginPath(); g.ellipse(64, 64, 60, 62, 0, 0, 7); g.fill();
    const t = new THREE.CanvasTexture(c); return t;
  }

  // Retarget the Kenney model's flat (roughness=1, metalness=1) materials to
  // proper PBR: glossy clearcoat paint, dark glass, matte rubber, alloy rims,
  // emissive lamps — all reflecting the scene's sky environment map.
  _upgradeCarMaterials(root) {
    const cache = new Map();
    const build = (name) => {
      switch (name) {
        case 'paintRed': return new THREE.MeshPhysicalMaterial({ color: 0xc11a2b, roughness: 0.32, metalness: 0.4, clearcoat: 1.0, clearcoatRoughness: 0.08, envMapIntensity: 1.35 });
        case 'window': return new THREE.MeshPhysicalMaterial({ color: 0x090f16, roughness: 0.05, metalness: 0.1, clearcoat: 1.0, clearcoatRoughness: 0.04, envMapIntensity: 1.7 });
        case 'carTire': return new THREE.MeshStandardMaterial({ color: 0x0e0f11, roughness: 0.85, metalness: 0.0 });
        case 'wheelInside': return new THREE.MeshStandardMaterial({ color: 0xc8ccd4, roughness: 0.25, metalness: 0.95, envMapIntensity: 1.5 });
        case 'lightFront': { const m = new THREE.MeshStandardMaterial({ color: 0xfff4d6, emissive: 0xfff2c0, emissiveIntensity: 0.55, roughness: 0.25, metalness: 0.0 }); this._modelHead = m; return m; }
        case 'lightBack': { const m = new THREE.MeshStandardMaterial({ color: 0x3a0a0a, emissive: 0xff2020, emissiveIntensity: 0.7, roughness: 0.3, metalness: 0.0 }); this._modelTail = m; return m; }
        case 'plastic': return new THREE.MeshStandardMaterial({ color: 0x24272c, roughness: 0.55, metalness: 0.25, envMapIntensity: 0.8 });
        default: return new THREE.MeshStandardMaterial({ color: 0xcfd2d8, roughness: 0.5, metalness: 0.4, envMapIntensity: 1.0 });
      }
    };
    root.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      const key = o.material.name || '_';
      if (!cache.has(key)) cache.set(key, build(key));
      o.material = cache.get(key);
      o.castShadow = true; o.receiveShadow = true;
    });
  }

  // Fade headlights up as night falls (n: 0 day → 1 night). Also lifts the
  // emissive glow on the head/tail-light lenses so the car reads as "lit".
  setHeadlights(n) {
    const on = THREE.MathUtils.clamp(n, 0, 1);
    for (const hl of this.headlights) hl.intensity = 220 * on;
    if (this._headMats) {
      this._headMats[0].emissiveIntensity = 0.55 + 1.7 * on;
      this._headMats[1].emissiveIntensity = 0.7 + 1.3 * on;
    }
    if (this._modelHead) this._modelHead.emissiveIntensity = 0.55 + 1.7 * on;
    if (this._modelTail) this._modelTail.emissiveIntensity = 0.7 + 1.3 * on;
  }

  _rounded(w, h, d, r) {
    // cheap rounded box via BoxGeometry (kept simple for perf/portability)
    return new THREE.BoxGeometry(w, h, d, 1, 1, 1);
  }

  // Swap the procedural mesh for a real CC0 glTF car (Kenney). Keeps physics;
  // wires the model's named wheels so they still spin and steer. Falls back to
  // the procedural car if the model can't be loaded.
  async loadModel(url) {
    let gltf;
    try {
      gltf = await new Promise((res, rej) => new GLTFLoader().load(url, res, undefined, rej));
    } catch { return false; }
    const root = gltf.scene;
    const body = root.getObjectByName('body');
    const wf = [root.getObjectByName('wheel_frontLeft'), root.getObjectByName('wheel_frontRight')];
    const wb = [root.getObjectByName('wheel_backLeft'), root.getObjectByName('wheel_backRight')];
    if (!body || wf.includes(null) || wb.includes(null)) return false;

    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3(); box.getSize(size);
    const sc = 4.3 / Math.max(size.x, size.z, 0.001); // scale to ~4.3 m long

    // does the model face -Z? (front wheels behind rear along z) -> turn it around
    const fz = (wf[0].getWorldPosition(new THREE.Vector3()).z + wf[1].getWorldPosition(new THREE.Vector3()).z) / 2;
    const bz = (wb[0].getWorldPosition(new THREE.Vector3()).z + wb[1].getWorldPosition(new THREE.Vector3()).z) / 2;

    const wrap = new THREE.Group();
    wrap.add(root);
    wrap.scale.setScalar(sc);
    if (fz < bz) wrap.rotation.y = Math.PI; // make the front face +Z (our forward)
    wrap.updateMatrixWorld(true);
    const b2 = new THREE.Box3().setFromObject(wrap);
    wrap.position.set(-(b2.min.x + b2.max.x) / 2, -b2.min.y, -(b2.min.z + b2.max.z) / 2);

    this._upgradeCarMaterials(root);
    for (const w of [...wf, ...wb]) w.rotation.order = 'YXZ';
    this._modelWheels = [...wf, ...wb];
    this._modelFrontWheels = wf;

    // remove the procedural visuals
    for (const c of [...this.body.children]) this.body.remove(c);
    for (const p of this._wheelPivots) this.group.remove(p);
    this.wheels = []; this.frontWheels = [];
    this.body.add(wrap);
    return true;
  }

  // Load the three.js "Ferrari" showroom model and dress it with the same kind
  // of materials that demo uses — glossy clearcoat paint, reflective glass and
  // chrome — all picking up the scene's sky environment map. Falls back (return
  // false) so the caller can try the Kenney car, then the procedural one.
  async loadFerrari(url) {
    let gltf;
    try {
      const draco = new DRACOLoader().setDecoderPath(DRACO_PATH);
      const loader = new GLTFLoader().setDRACOLoader(draco);
      gltf = await new Promise((res, rej) => loader.load(url, res, undefined, rej));
      draco.dispose();
    } catch { return false; }
    const root = gltf.scene;
    const body = root.getObjectByName('body');
    const wf = [root.getObjectByName('wheel_fl'), root.getObjectByName('wheel_fr')];
    const wb = [root.getObjectByName('wheel_rl'), root.getObjectByName('wheel_rr')];
    if (!body || wf.includes(null) || wb.includes(null)) return false;

    // Our environment is a smooth procedural sky, so a near-mirror finish reads
    // as glass. Use satin automotive paint (soft clearcoat, modest reflection),
    // darker matte-ish glass, and brushed — not chrome-mirror — metal.
    const paint = new THREE.MeshPhysicalMaterial({ color: 0x9c1622, metalness: 0.0, roughness: 0.5, clearcoat: 0.55, clearcoatRoughness: 0.18, envMapIntensity: 0.6, sheen: 0.2, sheenColor: new THREE.Color(0xff6b6b) });
    const glass = new THREE.MeshPhysicalMaterial({ color: 0x07090d, metalness: 0.0, roughness: 0.12, transparent: true, opacity: 0.86, envMapIntensity: 0.8, clearcoat: 0.6, clearcoatRoughness: 0.1 });
    const chrome = new THREE.MeshStandardMaterial({ color: 0xb9bdc4, metalness: 0.9, roughness: 0.38, envMapIntensity: 0.85 });
    root.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      o.castShadow = true; o.receiveShadow = true;
      const nm = o.material.name;
      if (nm === 'Body_Color') o.material = paint;
      else if (nm === 'Glass_Gray') o.material = glass;
      else if (nm === 'metal_chrome') o.material = chrome;
      else if (nm === 'Taillight_Glass') { o.material = o.material.clone(); o.material.emissive = new THREE.Color(0xff1414); o.material.emissiveIntensity = 0.7; this._modelTail = o.material; }
      else if (nm === 'Projector_Glass') { o.material = o.material.clone(); o.material.emissive = new THREE.Color(0xfff2c0); o.material.emissiveIntensity = 0.5; this._modelHead = o.material; }
      else { o.material.envMapIntensity = 1.0; }
    });

    // fit to ~4.4 m and orient the front to +Z (our forward)
    root.updateMatrixWorld(true);
    const size = new THREE.Vector3(); new THREE.Box3().setFromObject(root).getSize(size);
    const sc = 4.4 / Math.max(size.x, size.z, 0.001);
    const fz = (wf[0].getWorldPosition(new THREE.Vector3()).z + wf[1].getWorldPosition(new THREE.Vector3()).z) / 2;
    const bz = (wb[0].getWorldPosition(new THREE.Vector3()).z + wb[1].getWorldPosition(new THREE.Vector3()).z) / 2;
    const wrap = new THREE.Group();
    wrap.add(root); wrap.scale.setScalar(sc);
    if (fz < bz) wrap.rotation.y = Math.PI;
    wrap.updateMatrixWorld(true);
    const b2 = new THREE.Box3().setFromObject(wrap);
    wrap.position.set(-(b2.min.x + b2.max.x) / 2, -b2.min.y, -(b2.min.z + b2.max.z) / 2);

    for (const w of [...wf, ...wb]) w.rotation.order = 'YXZ';
    this._modelWheels = [...wf, ...wb];
    this._modelFrontWheels = wf;

    // remove the procedural visuals, keep the soft contact shadow
    for (const c of [...this.body.children]) this.body.remove(c);
    for (const p of this._wheelPivots) this.group.remove(p);
    this.wheels = []; this.frontWheels = [];
    this.body.add(wrap);
    return true;
  }

  reset(pos, heading = 0) {
    this.pos.copy(pos);
    this.heading = heading;
    this.vel.set(0, 0);
    this.speed = 0;
  }

  update(dt, input, world) {
    dt = Math.min(dt, 1 / 30); // clamp big frame gaps for stability

    const fwd = this.forward;
    const rgt = this.right;
    let vLong = this.vel.x * fwd.x + this.vel.y * fwd.y;
    let vLat = this.vel.x * rgt.x + this.vel.y * rgt.y;

    // longitudinal forces
    let a = 0;
    const speedFrac = Math.max(0, vLong) / CFG.maxSpeed;
    a += input.throttle * CFG.enginePower * (1 - 0.85 * speedFrac);
    if (input.brake > 0) {
      if (vLong > 0.5) a -= input.brake * CFG.brakePower;
      else a -= input.brake * CFG.enginePower * 0.6; // reverse
    }
    a -= CFG.rollResist * vLong * (1 / CFG.maxSpeed) * 8; // rolling
    a -= CFG.drag * vLong * Math.abs(vLong) * 60;
    vLong += a * dt;
    vLong = Math.max(-CFG.maxReverse, Math.min(CFG.maxSpeed, vLong));
    if (input.throttle < 0.02 && input.brake < 0.02 && Math.abs(vLong) < 0.4) vLong *= 0.9;

    // steering (less at speed). Negated so left/right match the chase view.
    const steerAuth = 1 / (1 + Math.abs(vLong) / CFG.steerSpeedFalloff);
    const steerAngle = -input.steer * CFG.maxSteer * steerAuth;
    this._steerVis += (steerAngle - this._steerVis) * Math.min(1, dt * 10);

    // yaw via bicycle model, damped at crawl speed
    const speedSign = Math.tanh(vLong * 0.5);
    const yawRate = (vLong / CFG.wheelbase) * Math.tan(steerAngle) * (0.6 + 0.4 * Math.abs(speedSign));
    this.heading += yawRate * dt;

    // lateral grip -> kill sideways velocity (less when handbraking = drift)
    const grip = input.handbrake ? CFG.gripHandbrake : CFG.gripBase;
    vLat -= vLat * Math.min(1, grip * dt);

    // reassemble world velocity
    const nf = this.forward, nr = this.right;
    this.vel.set(nf.x * vLong + nr.x * vLat, nf.y * vLong + nr.y * vLat);
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.y * dt;
    this.speed = vLong;

    // collision with world obstacles (buildings, trees, rocks, lamps, traffic)
    if (world && world.resolveCollision) {
      const res = world.resolveCollision(this.pos.x, this.pos.z, 1.5);
      if (res && res.hit) {
        this.pos.x = res.x;
        this.pos.z = res.z;
        const vN = this.vel.x * res.nx + this.vel.y * res.nz;
        if (vN < 0) { this.vel.x -= res.nx * vN; this.vel.y -= res.nz * vN; } // slide along
        this.vel.multiplyScalar(0.86); // scrub speed on impact
      }
    }

    // ground follow (height + normal) if the world supplies terrain
    let groundY = 0, nx = 0, nz = 0;
    if (world && world.heightAt) {
      const h = world.heightAt(this.pos.x, this.pos.z);
      const e = 1.2;
      const hx = world.heightAt(this.pos.x + e, this.pos.z) - world.heightAt(this.pos.x - e, this.pos.z);
      const hz = world.heightAt(this.pos.x, this.pos.z + e) - world.heightAt(this.pos.x, this.pos.z - e);
      groundY = h; nx = -hx / (2 * e); nz = -hz / (2 * e);
    }
    this.pos.y += (groundY - this.pos.y) * Math.min(1, dt * 8);

    // apply transform
    this.group.position.copy(this.pos);
    // base yaw
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.heading);
    // pitch/roll to match ground normal (subtle)
    const pitch = Math.atan(nz) * 0.6;
    const roll = Math.atan(nx) * 0.6;
    const qp = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, 0, roll, 'ZXY'));
    this.group.quaternion.copy(q).multiply(qp);

    // ---- weight transfer + road humps (visual dynamics on the body only) ----
    const accelLong = (vLong - this._prevVLong) / Math.max(dt, 1e-3);
    this._prevVLong = vLong;
    const latAccel = vLong * yawRate; // centripetal
    // accelerate -> squat (nose up); brake -> dive (nose down)
    const pitchTarget = THREE.MathUtils.clamp(-accelLong * 0.010, -0.07, 0.07);
    // lean out of the corner
    const rollTarget = THREE.MathUtils.clamp(-latAccel * 0.012, -0.11, 0.11);
    this._pitch += (pitchTarget - this._pitch) * Math.min(1, dt * 7);
    this._roll += (rollTarget - this._roll) * Math.min(1, dt * 7);

    this._dist += Math.abs(vLong) * dt;
    const speedFac = Math.min(1, Math.abs(vLong) / 16);
    const d = this._dist;
    const hump = (Math.sin(d * 0.55) * 0.5 + Math.sin(d * 1.7 + 1.3) * 0.3 + Math.sin(d * 3.3 + 0.6) * 0.2);
    const bobTarget = hump * 0.035 * speedFac;
    this._bobY += (bobTarget - this._bobY) * Math.min(1, dt * 12);
    const bobPitch = Math.cos(d * 1.7 + 1.3) * 0.012 * speedFac;

    this.body.position.y = this._bobY;
    this.body.rotation.set(this._pitch + bobPitch, 0, this._roll);

    // wheel visuals
    this._wheelSpin += (vLong / 0.36) * dt;
    if (this._modelWheels) {
      for (const w of this._modelWheels) w.rotation.x = this._wheelSpin;
      for (const w of this._modelFrontWheels) w.rotation.y = this._steerVis;
    } else {
      for (const w of this.wheels) w.rotation.x = this._wheelSpin;
      for (const p of this.frontWheels) p.rotation.y = this._steerVis;
    }
  }
}

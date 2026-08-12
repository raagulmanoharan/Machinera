import * as THREE from 'three';

const VIEWS = [
  { name: 'chase', off: new THREE.Vector3(0, 3.2, -8.8), look: 6, fov: 62, damp: 4.5 },
  { name: 'close', off: new THREE.Vector3(0, 2.3, -5.6), look: 5, fov: 66, damp: 6.5 },
  { name: 'hood',  off: new THREE.Vector3(0, 1.35, 0.6), look: 12, fov: 72, damp: 18 },
];

export class ChaseCamera {
  constructor(camera) {
    this.camera = camera;
    this.i = 0;
    this._pos = new THREE.Vector3();
    this._look = new THREE.Vector3();
    this._init = false;
  }

  cycle() {
    this.i = (this.i + 1) % VIEWS.length;
  }

  update(dt, car) {
    const v = VIEWS[this.i];
    const heading = car.heading;
    const cos = Math.cos(heading), sin = Math.sin(heading);

    // rotate local offset (x=right, z=forward) into world by heading
    const ox = v.off.x, oy = v.off.y, oz = v.off.z;
    const wx = car.pos.x + (ox * cos + oz * sin);
    const wz = car.pos.z + (-ox * sin + oz * cos);
    const wy = car.pos.y + oy;

    const desired = new THREE.Vector3(wx, wy, wz);
    const fwd = car.forward;
    const lookTarget = new THREE.Vector3(
      car.pos.x + fwd.x * v.look,
      car.pos.y + 1.1,
      car.pos.z + fwd.y * v.look
    );

    if (!this._init) {
      this._pos.copy(desired);
      this._look.copy(lookTarget);
      this._init = true;
    }
    const k = Math.min(1, dt * v.damp);
    this._pos.lerp(desired, k);
    this._look.lerp(lookTarget, Math.min(1, dt * (v.damp + 3)));

    this.camera.position.copy(this._pos);
    this.camera.lookAt(this._look);

    // speed-reactive FOV
    const targetFov = v.fov + Math.min(10, Math.abs(car.speed) * 0.16);
    this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 3);
    this.camera.updateProjectionMatrix();
  }

  snap() { this._init = false; }
}

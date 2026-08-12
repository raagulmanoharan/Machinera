// Input normalized to throttle/brake/steer axes.
//   Desktop: keyboard (WASD / arrows, space = handbrake).
//   Mobile:  hold the screen to accelerate, tilt the device (gyro) to steer.
//            Two fingers = brake / reverse.
export class Input {
  constructor(dom) {
    this.keys = new Set();
    this.throttle = 0; // 0..1
    this.brake = 0;    // 0..1
    this.steer = 0;    // -1..1 (left negative)
    this.handbrake = false;

    this._onKey = (e, down) => {
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
      if (down) this.keys.add(k);
      else this.keys.delete(k);
    };
    window.addEventListener('keydown', (e) => this._onKey(e, true), { passive: false });
    window.addEventListener('keyup', (e) => this._onKey(e, false));
    window.addEventListener('blur', () => this.keys.clear());

    this._initTouch(dom);
    this._initGyro();
  }

  get isTouch() { return this._touchSeen; }
  get gyroActive() { return this._gyro.active; }

  _initTouch(dom) {
    // Hold to accelerate; two fingers to brake. Fingers are counted only on the
    // canvas, so the radio/settings UI keep their own touches.
    this._fingers = new Set();
    this._touchSeen = false;

    const start = (e) => {
      this._touchSeen = true;
      for (const t of e.changedTouches) this._fingers.add(t.identifier);
      this._enableGyro();               // first touch is the gesture iOS needs
      this._recenterGyro();             // your current tilt becomes "straight"
    };
    const end = (e) => { for (const t of e.changedTouches) this._fingers.delete(t.identifier); };
    dom.addEventListener('touchstart', start, { passive: true });
    dom.addEventListener('touchend', end, { passive: true });
    dom.addEventListener('touchcancel', end, { passive: true });
  }

  _initGyro() {
    this._gyro = { active: false, roll: 0, center: null };
    this._onOrient = (e) => {
      if (e.beta == null && e.gamma == null) return;
      this._gyro.roll = this._roll(e.beta || 0, e.gamma || 0);
      if (this._gyro.center == null) this._gyro.center = this._gyro.roll;
      this._gyro.active = true;
    };
  }

  get gyroBlocked() { return !!(this._gyroDenied || this._gyroUnsupported); }

  // Ask for gyro access (iOS 13+ needs a gesture) and start listening.
  _enableGyro() {
    if (this._gyroReq) return;
    this._gyroReq = true;
    const DOE = window.DeviceOrientationEvent;
    const add = () => window.addEventListener('deviceorientation', this._onOrient, true);
    if (!DOE) { this._gyroUnsupported = true; return; }   // e.g. some in-app browsers
    if (typeof DOE.requestPermission === 'function') {
      // iOS 13+: shows a one-time Motion & Orientation prompt (needs a gesture)
      DOE.requestPermission()
        .then((s) => { if (s === 'granted') add(); else this._gyroDenied = true; })
        .catch(() => { this._gyroDenied = true; });
    } else {
      add();   // Android / older iOS: no prompt needed
    }
  }

  _recenterGyro() { if (this._gyro.active) this._gyro.center = this._gyro.roll; }

  // Map device tilt to a single "roll" (wheel) angle, accounting for how the
  // screen is currently oriented so tilting always reads as left/right.
  _roll(beta, gamma) {
    const a = (screen.orientation && screen.orientation.angle) ?? (window.orientation || 0);
    if (a === 90) return beta;               // landscape (rotated CW)
    if (a === 270 || a === -90) return -beta; // landscape (rotated CCW)
    if (a === 180) return -gamma;            // upside-down portrait
    return gamma;                            // portrait
  }

  // Smoothly update analog axes. dt in seconds.
  update(dt) {
    const k = this.keys;
    const up = k.has('w') || k.has('arrowup');
    const down = k.has('s') || k.has('arrowdown');
    const left = k.has('a') || k.has('arrowleft');
    const right = k.has('d') || k.has('arrowright');
    this.handbrake = k.has(' ');

    const n = this._fingers.size;
    const touchThr = n === 1 ? 1 : 0;         // one finger = go
    const touchBrk = n >= 2 ? 1 : 0;          // two fingers = brake / reverse

    const targThr = (up ? 1 : 0) || touchThr;
    const targBrk = (down ? 1 : 0) || touchBrk;
    this.throttle += (targThr - this.throttle) * Math.min(1, dt * 12);
    this.brake += (targBrk - this.brake) * Math.min(1, dt * 12);

    // Steering target: keyboard, or gyro tilt on a phone.
    let targSteer = 0;
    if (left) targSteer -= 1;
    if (right) targSteer += 1;
    let gyro = false;
    if (this._gyro.active && this._gyro.center != null) {
      const d = this._gyro.roll - this._gyro.center;
      const dead = 3, full = 26;             // degrees: deadzone .. full lock
      const s = Math.sign(d) * Math.max(0, Math.abs(d) - dead) / (full - dead);
      targSteer = Math.max(-1, Math.min(1, s));
      gyro = true;
    }
    // gyro feels direct; keyboard recenters faster than it turns
    const rate = gyro ? 9 : (targSteer === 0 ? 6 : 3.2);
    this.steer += (targSteer - this.steer) * Math.min(1, dt * rate);
  }
}

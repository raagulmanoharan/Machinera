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
    this.btnThrottle = false; // on-screen accelerate button held
    this.btnBrake = false;    // on-screen brake button held

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
    // Throttle/brake come from the on-screen buttons (wired in main). A touch on
    // the canvas still counts as a driving gesture: it enables the gyro and
    // recalibrates "straight".
    this._touchSeen = false;
    dom.addEventListener('touchstart', () => { this._touchSeen = true; this.driveGesture(); }, { passive: true });
  }

  // An intentional driving gesture (canvas touch or accelerate press): the right
  // moment to ask for gyro access and to recalibrate the neutral tilt.
  driveGesture() {
    this._enableGyro();
    this._recenterGyro();
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

  // Ask for gyro access (iOS 13+ needs a gesture) and start listening. Safe to
  // call on every driving gesture: it only attaches the listener once, but will
  // retry the permission prompt until granted — the first (passive) attempt on
  // iOS doesn't always count as a valid activation, so a later button tap can.
  _enableGyro() {
    if (this._gyroAdded) return;
    const DOE = window.DeviceOrientationEvent;
    if (!DOE) { this._gyroUnsupported = true; return; }   // e.g. some in-app browsers
    const add = () => {
      if (this._gyroAdded) return;
      this._gyroAdded = true;
      window.addEventListener('deviceorientation', this._onOrient, true);
    };
    if (typeof DOE.requestPermission === 'function') {
      if (this._gyroRequesting) return;                   // one request in flight
      this._gyroRequesting = true;
      DOE.requestPermission()
        .then((s) => { this._gyroRequesting = false; if (s === 'granted') add(); else this._gyroDenied = true; })
        .catch(() => { this._gyroRequesting = false; this._gyroDenied = true; });
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

    const targThr = (up ? 1 : 0) || (this.btnThrottle ? 1 : 0);
    const targBrk = (down ? 1 : 0) || (this.btnBrake ? 1 : 0);
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

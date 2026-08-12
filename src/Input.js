// Keyboard + touch input, normalized to throttle/brake/steer axes.
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
  }

  _initTouch(dom) {
    // Simple two-zone touch: left half steers, right half throttle/brake.
    this.touchSteer = 0;
    this.touchThrottle = 0;
    this.touchBrake = 0;
    const active = new Map();

    const handle = () => {
      let steer = 0, thr = 0, brk = 0;
      const w = window.innerWidth, h = window.innerHeight;
      for (const t of active.values()) {
        if (t.x < w * 0.5) {
          // steering: offset from finger's own start x
          steer = Math.max(-1, Math.min(1, (t.x - t.startX) / 90));
        } else {
          if (t.y < h * 0.5) thr = 1; else brk = 1;
        }
      }
      this.touchSteer = steer;
      this.touchThrottle = thr;
      this.touchBrake = brk;
    };

    const start = (e) => {
      for (const t of e.changedTouches) active.set(t.identifier, { x: t.clientX, y: t.clientY, startX: t.clientX });
      handle();
    };
    const move = (e) => {
      for (const t of e.changedTouches) {
        const a = active.get(t.identifier);
        if (a) { a.x = t.clientX; a.y = t.clientY; }
      }
      handle();
      e.preventDefault();
    };
    const end = (e) => {
      for (const t of e.changedTouches) active.delete(t.identifier);
      handle();
    };
    dom.addEventListener('touchstart', start, { passive: true });
    dom.addEventListener('touchmove', move, { passive: false });
    dom.addEventListener('touchend', end, { passive: true });
    dom.addEventListener('touchcancel', end, { passive: true });
  }

  // Smoothly update analog axes from digital keys. dt in seconds.
  update(dt) {
    const k = this.keys;
    const up = k.has('w') || k.has('arrowup');
    const down = k.has('s') || k.has('arrowdown');
    const left = k.has('a') || k.has('arrowleft');
    const right = k.has('d') || k.has('arrowright');
    this.handbrake = k.has(' ');

    const targThr = (up ? 1 : 0) || this.touchThrottle;
    const targBrk = (down ? 1 : 0) || this.touchBrake;
    // Throttle/brake respond quickly.
    this.throttle += (targThr - this.throttle) * Math.min(1, dt * 12);
    this.brake += (targBrk - this.brake) * Math.min(1, dt * 12);

    // Steering: ramp toward target, return to center when released.
    let targSteer = 0;
    if (left) targSteer -= 1;
    if (right) targSteer += 1;
    if (this.touchSteer) targSteer = this.touchSteer;
    const rate = targSteer === 0 ? 6 : 3.2; // recenters faster than it turns
    this.steer += (targSteer - this.steer) * Math.min(1, dt * rate);
  }
}

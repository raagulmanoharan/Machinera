// Procedural engine sound (Web Audio, no sample). A pair of detuned sawtooth
// oscillators + a sine sub give the engine body; the fundamental tracks a
// simple gearbox model derived from speed, so the note revs up through a gear
// and drops on each "shift". Throttle opens a low-pass (brightness) and lifts
// the volume; at rest it settles to a low idle hum. A whisper of noise adds
// intake texture. Powers on with the first user gesture, per autoplay rules.
export class EngineSound {
  constructor() {
    this.ctx = null;
    this.on = false;
    this.rpm = 46;
    // power on with the first interaction anywhere (a driving key counts)
    const boot = () => this.resume();
    window.addEventListener('pointerdown', boot, { once: true });
    window.addEventListener('keydown', boot, { once: true });
  }

  _ensure() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();

    const o1 = ctx.createOscillator(); o1.type = 'sawtooth';
    const o2 = ctx.createOscillator(); o2.type = 'sawtooth'; o2.detune.value = -14;
    const sub = ctx.createOscillator(); sub.type = 'sine';

    // intake noise
    const nlen = Math.floor(ctx.sampleRate);
    const nb = ctx.createBuffer(1, nlen, ctx.sampleRate);
    const nd = nb.getChannelData(0);
    for (let i = 0; i < nlen; i++) nd[i] = (Math.random() * 2 - 1) * 0.5;
    const noise = ctx.createBufferSource(); noise.buffer = nb; noise.loop = true;

    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600; lp.Q.value = 5;
    const oscGain = ctx.createGain(); oscGain.gain.value = 0.5;
    const subGain = ctx.createGain(); subGain.gain.value = 0.7;
    const noiseGain = ctx.createGain(); noiseGain.gain.value = 0.0;
    const master = ctx.createGain(); master.gain.value = 0.0;   // ramped in update()

    o1.connect(lp); o2.connect(lp); noise.connect(noiseGain); noiseGain.connect(lp);
    lp.connect(oscGain); oscGain.connect(master);
    sub.connect(subGain); subGain.connect(master);
    master.connect(ctx.destination);
    o1.start(); o2.start(); sub.start(); noise.start();

    Object.assign(this, { ctx, o1, o2, sub, lp, oscGain, subGain, noiseGain, master });
  }

  resume() {
    this._ensure();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    this.on = true;
  }

  // s: { speed (m/s, signed), throttle 0..1, maxSpeed }
  update(dt, s) {
    if (!this.ctx || !this.on) return;
    const t = this.ctx.currentTime;
    const maxS = s.maxSpeed || 68;
    const spd = Math.min(1, Math.abs(s.speed || 0) / maxS);
    const thr = Math.max(0, Math.min(1, s.throttle || 0));

    // 5-speed box: the rev resets at each gear boundary
    const gears = 5;
    const g = Math.min(gears - 1, Math.floor(spd * gears));
    const within = spd * gears - g;                 // 0..1 through the gear
    const rev = 0.15 + within * 0.85;               // idle floor .. redline

    const baseHz = 46 + rev * (188 - 46);
    const targetHz = baseHz * (1 + thr * 0.05);     // small throttle blip
    this.rpm += (targetHz - this.rpm) * Math.min(1, dt * 8);
    const f = this.rpm;
    this.o1.frequency.setTargetAtTime(f, t, 0.03);
    this.o2.frequency.setTargetAtTime(f, t, 0.03);
    this.sub.frequency.setTargetAtTime(f * 0.5, t, 0.05);

    // brightness opens with load; loudness rises with rev + throttle
    const cutoff = 380 + (rev * 0.6 + thr * 0.4) * 2600;
    this.lp.frequency.setTargetAtTime(cutoff, t, 0.05);
    const vol = 0.045 + Math.min(1, rev * 0.7 + thr * 0.5) * 0.09;
    this.master.gain.setTargetAtTime(vol, t, 0.08);
    this.noiseGain.gain.setTargetAtTime(0.015 + thr * 0.05, t, 0.1);
  }
}

// A vintage-style radio that streams AUDIO from YouTube.
//
// The video runs in a hidden 1×1 iframe (rendered, not display:none, so the
// browser keeps its audio alive) — only the sound reaches the drive. The UI is
// stripped to what an old set really has: a station switcher and a volume dial,
// dressed as a warm backlit FM tuner to match the foggy, liminal mood.
//
// A procedural Web-Audio static "bed" hisses quietly under the music, and every
// station change blasts a burst of radio static — like tuning between frequencies.
//
// There's no play button: the set powers on with your first interaction (a
// driving key or a touch of the dial), the way you'd switch on a real radio.

// Each station is a large YouTube playlist that the player SHUFFLES and
// auto-advances through — so it plays an endless, ever-changing random mix
// rather than a single fixed link. `ids` are single-video fallbacks used only
// if the playlist can't load (private / region-blocked). A station with no
// `list` is a 24/7 live stream (already endless).
const STATIONS = [
  { freq: '89.3',  name: 'liminal · synthwave',    list: 'PLuz2XAd1YEc9ftt1OuwCYPWGc-khKdMPS', ids: ['4xDzrJKXOOY'] },
  { freq: '93.1',  name: 'liminal · vapor / lofi', list: 'PLZNQVAwlJuFP9BpqHWHJr3ytty-KTkJ3B', ids: ['jfKfPfyJRdk'] },
  { freq: '98.5',  name: 'lofi · live radio',      ids: ['jfKfPfyJRdk', 'DWcJFNfaw9c'] },
  { freq: '104.5', name: 'ilaiyaraaja · melodies', list: 'PL0ZpYcTg19EELLEz_zgPshQgcqOLD5cGQ', ids: ['GVmSrnEEWCU', 'SpjCrTHkzCA'] },
];

// ---- YouTube IFrame API (loaded once) ----
let apiPromise = null;
function loadAPI() {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prev === 'function') { try { prev(); } catch { /* ignore */ } }
      resolve(window.YT);
    };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.async = true;
    document.head.appendChild(s);
  });
  return apiPromise;
}

// ---- procedural radio static (Web Audio) ----
// A looping bed of filtered (pink-ish, band-limited) noise = radio hiss. A quiet
// continuous level sits under the music; a burst covers each station change.
class Static {
  constructor() { this.ctx = null; }
  _ensure() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const len = Math.floor(ctx.sampleRate * 2);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;                       // pink-noise shaping for warmth
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.0990460;
      b1 = 0.96300 * b1 + w * 0.2965164;
      b2 = 0.57000 * b2 + w * 1.0526913;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.05;
    }
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 550;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1650; bp.Q.value = 0.6;
    const bed = ctx.createGain(); bed.gain.value = 0;      // continuous hiss
    const burst = ctx.createGain(); burst.gain.value = 0;  // per-switch blast
    src.connect(hp); hp.connect(bp);
    bp.connect(bed); bp.connect(burst);
    bed.connect(ctx.destination); burst.connect(ctx.destination);
    src.start();
    this.ctx = ctx; this.bed = bed; this.burst = burst;
  }
  resume() { this._ensure(); if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
  setBed(level) { this._ensure(); if (!this.ctx) return; this.bed.gain.setTargetAtTime(level, this.ctx.currentTime, 0.25); }
  hit() {
    this._ensure(); if (!this.ctx) return;
    const g = this.burst.gain, t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(Math.max(g.value, 0.0001), t);
    g.linearRampToValueAtTime(0.30, t + 0.04);         // snap up…
    g.setTargetAtTime(0.0, t + 0.16, 0.35);            // …then decay as the station fades in
  }
}

export class Radio {
  constructor(mount = document.getElementById('app'), onToast) {
    this.onToast = onToast || (() => {});
    this.stations = STATIONS.slice();
    this.index = 0;
    this.cand = 0;              // which candidate id within the current station
    this.volume = 55;
    this.powered = false;
    this.ready = false;
    this.player = null;
    this.static = new Static();

    this._buildDOM(mount);
    if (this.stations.length) loadAPI().then((YT) => this._createPlayer(YT));
  }

  _bedFor(v) { return v <= 0 ? 0 : 0.006 + 0.03 * (v / 100); }

  // ---- UI ----
  _buildDOM(mount) {
    const el = document.createElement('div');
    el.id = 'radio';
    el.innerHTML = `
      <div class="vr-face">
        <div class="vr-scale"></div>
        <div class="vr-needle"></div>
        <div class="vr-read">
          <span class="vr-freq"></span>
          <span class="vr-name"></span>
        </div>
        <span class="vr-on" title="on air"></span>
      </div>
      <div class="vr-ctrl">
        <button class="vr-tune vr-prev" aria-label="Previous station">‹</button>
        <button class="vr-tune vr-next" aria-label="Next station">›</button>
        <input class="vr-vol" type="range" min="0" max="100" value="${this.volume}" aria-label="Volume" />
      </div>
      <div id="yt-audio"></div>`;
    mount.appendChild(el);
    this.el = el;
    this.$freq = el.querySelector('.vr-freq');
    this.$name = el.querySelector('.vr-name');
    this.$needle = el.querySelector('.vr-needle');

    const tap = (fn) => (e) => { this._boot(); fn(e); if (e.currentTarget) e.currentTarget.blur(); };
    el.querySelector('.vr-prev').addEventListener('click', tap(() => this.prev()));
    el.querySelector('.vr-next').addEventListener('click', tap(() => this.next()));
    const vol = el.querySelector('.vr-vol');
    vol.addEventListener('input', (e) => { this._boot(); this.setVolume(+e.target.value); });
    vol.addEventListener('change', (e) => e.target.blur());

    // Power on with user interaction. iOS blocks audio unless playVideo() runs
    // *inside* a gesture, and the first gesture may land before the player is
    // ready — so we retry on EVERY gesture (touch/click/key) until it's actually
    // playing, then detach. Tapping the radio itself also works.
    this._bootBound = () => this._boot();
    ['pointerdown', 'touchend', 'keydown'].forEach((ev) =>
      window.addEventListener(ev, this._bootBound, { passive: true }));
    el.addEventListener('click', this._bootBound);

    this._render();
  }

  _render() {
    const s = this.stations[this.index];
    this.$freq.textContent = s ? s.freq : '––.–';
    this.$name.textContent = s ? s.name : 'no signal';
    const n = this.stations.length;
    const pct = n > 1 ? (this.index / (n - 1)) * 100 : 50;
    this.$needle.style.left = `calc(8% + ${pct * 0.84}%)`;
  }

  _boot() {
    this.powered = true;
    this.el.classList.add('is-on');
    this.static.resume();
    this.static.setBed(this._bedFor(this.volume));
    this._startOrResume();
  }

  // Load the current station once (inside the first gesture, as iOS requires),
  // then just resume on later gestures.
  _startOrResume() {
    if (!this.player || !this.ready || this._playing) return;
    try { this.player.unMute(); } catch { /* ignore */ }
    if (!this._loaded) { this._loaded = true; this._loadStation(); }
    else { try { this.player.playVideo(); } catch { /* ignore */ } }
  }

  _stopKick() {
    if (!this._bootBound) return;
    ['pointerdown', 'touchend', 'keydown'].forEach((ev) =>
      window.removeEventListener(ev, this._bootBound));
  }

  // ---- player ----
  _createPlayer(YT) {
    this.player = new YT.Player('yt-audio', {
      width: 1, height: 1,
      videoId: this.stations[this.index].ids[0],
      // no muted autoplay — iOS ignores the later unmute. We start on a gesture.
      playerVars: { autoplay: 0, controls: 0, disablekb: 1, playsinline: 1, rel: 0 },
      events: {
        onReady: () => {
          this.ready = true;
          this.player.setVolume(this.volume);
          if (this.powered) this._startOrResume();
        },
        onStateChange: (e) => {
          if (e.data === YT.PlayerState.PLAYING) {
            this._playing = true; this._stopKick();
            if (this._pendingShuffle) {                 // shuffle once the playlist is live
              this._pendingShuffle = false;
              try { this.player.setShuffle(true); this.player.setLoop(true); } catch { /* ignore */ }
            }
          } else if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.ENDED) {
            this._playing = false;
          }
        },
        onError: () => this._onError(),
      },
    });
  }

  // Load whatever the current station is: a shuffled playlist (endless, random
  // auto-play, scanning in at a random position) or a single video / live stream.
  _loadStation() {
    const s = this.stations[this.index];
    this.cand = 0;
    this._fellBack = false;
    if (!this.player || !this.ready) return;
    try {
      this.player.setVolume(this.volume);
      if (s.list) {
        this._pendingShuffle = true;
        this.player.loadPlaylist({ list: s.list, listType: 'playlist', index: Math.floor(Math.random() * 25) });
      } else {
        this._pendingShuffle = false;
        this.player.loadVideoById(s.ids[0]);
      }
    } catch { /* ignore */ }
  }

  _onError() {
    const s = this.stations[this.index];
    // a dud playlist -> fall back to the station's single video
    if (s.list && !this._fellBack) {
      this._fellBack = true; this._pendingShuffle = false;
      if (this.player && this.ready) this.player.loadVideoById(s.ids[0]);
      return;
    }
    if (s.ids && this.cand < s.ids.length - 1) {
      this.cand++;
      if (this.player && this.ready) this.player.loadVideoById(s.ids[this.cand]);
      return;
    }
    this.onToast('No signal on that station', true);
  }

  _load() {
    this._render();
    this.static.hit();          // burst of static while we retune
    this._loaded = true;
    this._loadStation();
  }

  next() { if (!this.stations.length) return; this.index = (this.index + 1) % this.stations.length; this._load(); }
  prev() { if (!this.stations.length) return; this.index = (this.index - 1 + this.stations.length) % this.stations.length; this._load(); }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(100, v | 0));
    if (this.player && this.ready) this.player.setVolume(this.volume);
    this.static.setBed(this._bedFor(this.volume));
  }
}

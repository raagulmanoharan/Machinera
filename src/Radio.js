// A minimal on-screen radio that streams AUDIO from YouTube.
//
// The video plays inside a hidden 1×1 iframe (rendered, not display:none — some
// browsers pause audio for fully hidden players), so only the sound reaches the
// drive. Ships with a few curated 24/7 streams that suit the foggy, liminal
// mood, plus a "paste a YouTube link" field so any video can be the source.
//
// Autoplay-with-sound is only allowed after a user gesture, so nothing plays
// until you press the radio's play button — that click is the gesture.

const STATIONS = [
  { name: 'Lofi — beats to drive to',      id: 'jfKfPfyJRdk' },
  { name: 'Synthwave — midnight cruise',   id: '4xDzrJKXOOY' },
  { name: 'Chillhop — jazzy night roads',  id: 'DWcJFNfaw9c' },
  { name: 'Lofi — 3am sleepless drive',    id: 'rUxyKA_-grg' },
];

// Load the YouTube IFrame API once; resolve when window.YT is usable.
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

// Pull an 11-char video id out of a raw id or any YouTube URL shape.
function parseId(input) {
  if (!input) return null;
  const s = String(input).trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s);
    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.slice(1, 12);
      if (/^[\w-]{11}$/.test(id)) return id;
    }
    const v = u.searchParams.get('v');
    if (v && /^[\w-]{11}$/.test(v)) return v;
    const m = u.pathname.match(/\/(embed|shorts|live|v)\/([\w-]{11})/);
    if (m) return m[2];
  } catch { /* not a URL */ }
  const m = s.match(/[\w-]{11}/);
  return m ? m[0] : null;
}

export class Radio {
  constructor(mount = document.getElementById('app'), onToast) {
    this.onToast = onToast || (() => {});
    this.stations = STATIONS.slice();
    this.index = 0;
    this.playing = false;
    this.ready = false;
    this.wantPlay = false;      // a play requested before the player was ready
    this.volume = 55;
    this.player = null;

    this._buildDOM(mount);
    loadAPI().then((YT) => this._createPlayer(YT));
  }

  // ---- UI ----
  _buildDOM(mount) {
    const el = document.createElement('div');
    el.id = 'radio';
    el.innerHTML = `
      <button class="r-btn r-toggle" title="Play / pause (P)" aria-label="Play">
        <span class="r-eq"><i></i><i></i><i></i></span>
      </button>
      <div class="r-mid">
        <div class="r-label">RADIO</div>
        <div class="r-name"></div>
      </div>
      <button class="r-btn r-prev" title="Previous station">‹</button>
      <button class="r-btn r-next" title="Next station">›</button>
      <input class="r-vol" type="range" min="0" max="100" value="${this.volume}" title="Volume" />
      <button class="r-btn r-link" title="Play a YouTube link">＋</button>
      <div class="r-linkrow hidden">
        <input class="r-url" type="text" placeholder="Paste a YouTube link…" autocomplete="off" spellcheck="false" />
        <button class="r-btn r-go">Play</button>
      </div>
      <div id="yt-audio"></div>`;
    mount.appendChild(el);
    this.el = el;
    this.$name = el.querySelector('.r-name');
    this.$toggle = el.querySelector('.r-toggle');
    this.$linkrow = el.querySelector('.r-linkrow');
    this.$url = el.querySelector('.r-url');

    const blur = (fn) => (e) => { fn(e); if (e.currentTarget) e.currentTarget.blur(); };
    this.$toggle.addEventListener('click', blur(() => this.toggle()));
    el.querySelector('.r-prev').addEventListener('click', blur(() => this.prev()));
    el.querySelector('.r-next').addEventListener('click', blur(() => this.next()));
    el.querySelector('.r-vol').addEventListener('input', (e) => this.setVolume(+e.target.value));
    el.querySelector('.r-vol').addEventListener('change', (e) => e.target.blur());
    el.querySelector('.r-link').addEventListener('click', blur(() => this._toggleLinkRow()));
    el.querySelector('.r-go').addEventListener('click', () => this._playFromInput());
    this.$url.addEventListener('keydown', (e) => {
      e.stopPropagation();                 // keep typing out of the driving controls
      if (e.key === 'Enter') this._playFromInput();
      if (e.key === 'Escape') this._toggleLinkRow(false);
    });

    // P toggles the radio from anywhere
    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
      if (e.key.toLowerCase() === 'p') this.toggle();
    });

    this._renderName();
  }

  _renderName() {
    const s = this.stations[this.index];
    this.$name.textContent = s ? s.name : '—';
  }

  _toggleLinkRow(force) {
    const show = force === undefined ? this.$linkrow.classList.contains('hidden') : force;
    this.$linkrow.classList.toggle('hidden', !show);
    if (show) this.$url.focus();
  }

  _setPlayingUI(on) {
    this.playing = on;
    this.el.classList.toggle('is-playing', on);
    this.$toggle.setAttribute('aria-label', on ? 'Pause' : 'Play');
  }

  // ---- player ----
  _createPlayer(YT) {
    this.player = new YT.Player('yt-audio', {
      width: 1, height: 1,
      videoId: this.stations[this.index].id,
      playerVars: { autoplay: 0, controls: 0, disablekb: 1, playsinline: 1, rel: 0 },
      events: {
        onReady: () => {
          this.ready = true;
          this.player.setVolume(this.volume);
          if (this.wantPlay) { this.wantPlay = false; this.player.playVideo(); }
        },
        onStateChange: (e) => {
          if (e.data === YT.PlayerState.PLAYING) this._setPlayingUI(true);
          else if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.ENDED) this._setPlayingUI(false);
        },
        onError: (e) => this._onError(e),
      },
    });
  }

  _onError() {
    // 100/101/150 = unavailable or embedding disabled → skip to the next station
    this.onToast('That station is unavailable — skipping', true);
    if (this.stations.length > 1) this.next();
    else this._setPlayingUI(false);
  }

  // ---- public controls ----
  toggle() {
    if (!this.player || !this.ready) { this.wantPlay = true; return; }
    if (this.playing) this.player.pauseVideo();
    else this.player.playVideo();
  }

  _load(play = true) {
    const s = this.stations[this.index];
    this._renderName();
    if (!this.player || !this.ready) { this.wantPlay = play; return; }
    this.player.loadVideoById(s.id);       // loadVideoById autoplays
    if (!play) this.player.pauseVideo();
  }

  next() { this.index = (this.index + 1) % this.stations.length; this._load(true); }
  prev() { this.index = (this.index - 1 + this.stations.length) % this.stations.length; this._load(true); }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(100, v | 0));
    if (this.player && this.ready) this.player.setVolume(this.volume);
  }

  _playFromInput() {
    const id = parseId(this.$url.value);
    if (!id) { this.onToast('Could not read a YouTube link there', true); return; }
    // add as a station (dedupe) and switch to it
    let i = this.stations.findIndex((s) => s.id === id);
    if (i < 0) { this.stations.push({ name: 'Your link', id }); i = this.stations.length - 1; }
    this.index = i;
    this.$url.value = '';
    this._toggleLinkRow(false);
    this._load(true);
  }
}

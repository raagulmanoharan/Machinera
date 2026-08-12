import * as THREE from 'three';
import { Input } from './Input.js';
import { Car } from './Car.js';
import { ChaseCamera } from './ChaseCamera.js';
import { OSMWorld } from './world/OSMWorld.js';
import { ProceduralWorld } from './world/ProceduralWorld.js';
import { Environment } from './render/Environment.js';
import { Pipeline } from './render/Pipeline.js';
import { Dust } from './render/Dust.js';
import { MoodDirector } from './world/MoodDirector.js';
import { advanceWind } from './render/wind.js';
import { MODELS } from './render/AssetLibrary.js';
import { Radio } from './Radio.js';
import { EngineSound } from './EngineSound.js';

const $ = (id) => document.getElementById(id);
const canvas = $('scene');

// ---------- renderer ----------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.82;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.5, 12000);

const env = new Environment(scene, renderer);
const pipeline = new Pipeline(renderer, scene, camera);
const dust = new Dust(scene);
pipeline.depthExcludes = [env.sky, dust.points];     // don't let these write depth
// volumetric light scatter colours (as RGB vectors) + shared emission dirs
const VCOL_LAMP = new THREE.Vector3(1.0, 0.66, 0.34);   // warm sodium
const VCOL_HEAD = new THREE.Vector3(1.0, 0.95, 0.82);   // headlight white
const VCOL_TAIL = new THREE.Vector3(1.0, 0.06, 0.03);   // tail-light red
const VDIR_DOWN = new THREE.Vector3(0, -1, 0);
const _volLights = [];

const input = new Input(canvas);
const car = new Car(scene);
// ?nocar skips the heavy car load while iterating on the atmosphere/scenes;
// ?simplecar keeps the built-in procedural car (skips the DRACO Ferrari load)
const _params = new URLSearchParams(location.search);
const NOCAR = _params.has('nocar');
const SIMPLECAR = _params.has('simplecar');
if (NOCAR) {
  car.group.visible = false;
} else if (SIMPLECAR) {
  // keep the procedural car built in the constructor — no model load
} else {
  // prefer the detailed showroom car; fall back to the CC0 low-poly, then procedural
  car.loadFerrari(MODELS.ferrari).then((ok) => { if (!ok) car.loadModel(MODELS.car); });
}
const chase = new ChaseCamera(camera);
// liminal moods: the world drifts between atmospheres as you drive
const mood = new MoodDirector(env, pipeline, car, { onChange: (name) => toast('· ' + name + ' ·') });
window.__car = car; // debug handle
window.__env = env; // debug handle
window.__mood = mood; // debug handle
window.__cam = camera; // debug handle

// on-screen radio — streams audio from YouTube (curated stations + custom links)
const radio = new Radio(document.getElementById('app'), (msg, err) => toast(msg, err));
window.__radio = radio; // debug handle
// procedural engine sound — pitch tracks speed/throttle
const engine = new EngineSound();
window.__engine = engine; // debug handle

let world = null;
let loading = false;

// ---------- prefs ----------
const prefs = loadPrefs();
function loadPrefs() {
  try { return JSON.parse(localStorage.getItem('machinera') || '{}'); } catch { return {}; }
}
function savePrefs() {
  localStorage.setItem('machinera', JSON.stringify(prefs));
}

// ---------- world loading ----------
async function loadWorld() {
  if (loading) return;
  loading = true;
  showLoader(true, 'Preparing…');

  if (world) { world.dispose(); world = null; }

  const source = prefs.source || 'procedural';
  try {
    if (source === 'osm') {
      const [lat, lng] = parseLatLng(prefs.location) || [46.5197, 6.6323];
      const w = new OSMWorld(scene);
      await w.load({ lat, lng, radius: prefs.radius || 750, sunDir: env.sunDir, onProgress: (m) => setLoader(m) });
      world = w;
    } else {
      setLoader('Growing the forest…');
      world = new ProceduralWorld(scene);
      await world.populate();
    }
  } catch (err) {
    console.warn(err);
    toast('Could not load that place (' + err.message + '). Dropping you on the scenic route instead.', true);
    if (world) { world.dispose(); world = null; }
    world = new ProceduralWorld(scene);
    await world.populate();
  }

  car.reset(world.carStart.pos, world.carStart.heading);
  window.__world = world; // debug handle
  mood.setWorld(world);
  chase.snap();

  showLoader(false);
  loading = false;
}

function parseLatLng(s) {
  if (!s) return null;
  const m = String(s).split(',').map((v) => parseFloat(v.trim()));
  if (m.length === 2 && m.every((n) => !isNaN(n))) return m;
  return null;
}

// ---------- loop ----------
const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (world && !loading) {
    advanceWind(dt);
    input.update(dt);
    car.update(dt, input, world);
    if (world.update) world.update(dt, car.pos, camera);
    env.update(car.pos, dt);
    mood.update(dt);
    // collect the volumetric lights: nearest street lamps (warm, pooling down),
    // plus the car's headlights (white, forward) and tail-lights (red, behind)
    _volLights.length = 0;
    const lampLvl = (world.lampLevel || 0);
    if (world.lampHeads && lampLvl > 0) {
      const cp = car.pos;
      const near = world.lampHeads
        .map((h) => [h, h.distanceToSquared(cp)])
        .sort((a, b) => a[1] - b[1]).slice(0, 4);
      for (const [h] of near) _volLights.push({ pos: h, color: VCOL_LAMP.clone().multiplyScalar(1.1 * lampLvl), dir: VDIR_DOWN, cone: -0.35, att: 0.16 });
    }
    const ce = car.getVolumetricEmitters();
    if (ce) {
      // headlights: a soft forward glow, not a blinding wall — low intensity +
      // short reach so it fades within a few metres of fog ahead
      for (const p of ce.head) _volLights.push({ pos: p, color: VCOL_HEAD.clone().multiplyScalar(0.5 * ce.level), dir: ce.fwd, cone: 0.82, att: 0.09 });
      for (const p of ce.tail) _volLights.push({ pos: p, color: VCOL_TAIL.clone().multiplyScalar(0.45 * ce.level), dir: ce.back, cone: 0.2, att: 0.3 });
    }
    pipeline.updateVolumetric(camera, _volLights, {
      strength: _volLights.length ? 0.11 : 0,
      fog: (scene.fog && scene.fog.density) || 0.02,
    });
    dust.update(camera.position, dt);
    chase.update(dt, car);
    engine.update(dt, { speed: car.speed, throttle: input.throttle });
  }
  pipeline.render(dt);
}

// ---------- UI ----------
function showLoader(on, msg) {
  $('loader').classList.toggle('hidden', !on);
  if (msg) setLoader(msg);
}
function setLoader(msg) {
  const h = document.querySelector('#loader .hint');
  if (h) h.textContent = msg;
}

let toastEl = null;
function toast(msg, err = false) {
  if (toastEl) toastEl.remove();
  toastEl = document.createElement('div');
  toastEl.className = 'toast' + (err ? ' err' : '');
  toastEl.textContent = msg;
  $('app').appendChild(toastEl);
  setTimeout(() => { if (toastEl) { toastEl.remove(); toastEl = null; } }, 6000);
}

function openSettings(open) {
  $('settings').classList.toggle('hidden', !open);
}

// settings wiring
function initSettings() {
  const source = $('source'), preset = $('preset'), custom = $('customRow'),
    latlng = $('latlng'), radius = $('radius'), osmSection = $('osm-section');

  source.value = prefs.source || 'osm';
  if (prefs.location) {
    const match = [...preset.options].find((o) => o.value === prefs.location);
    preset.value = match ? prefs.location : 'custom';
    if (!match) { custom.style.display = ''; latlng.value = prefs.location; }
  }
  if (prefs.radius) radius.value = String(prefs.radius);

  const syncSource = () => osmSection.style.display = source.value === 'osm' ? '' : 'none';
  syncSource();
  source.addEventListener('change', syncSource);
  preset.addEventListener('change', () => {
    custom.style.display = preset.value === 'custom' ? '' : 'none';
  });

  $('apply').addEventListener('click', () => {
    prefs.source = source.value;
    prefs.location = preset.value === 'custom' ? latlng.value.trim() : preset.value;
    prefs.radius = parseInt(radius.value, 10);
    savePrefs();
    openSettings(false);
    loadWorld();
  });
  $('close').addEventListener('click', () => openSettings(false));
}

// keys
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'escape') openSettings($('settings').classList.contains('hidden'));
  if (k === 'c') chase.cycle();
  if (k === 'r' && world) { car.reset(world.carStart.pos, world.carStart.heading); chase.snap(); }
});

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  pipeline.setSize(innerWidth, innerHeight);
});

// ---------- boot ----------
initSettings();
frame();
loadWorld();

// Photoreal city mode — a port of three.js' webgl_loader_3dtiles example into
// our stack. Google Photorealistic 3D Tiles (Cesium Ion) under @takram's
// physically-based atmosphere + volumetric clouds.
//
// The example targets three.js *master* and uses renderer.setEffects(), which
// r170 doesn't have — so here the same @takram effects run through the pmndrs
// `postprocessing` EffectComposer (their supported vanilla path).
//
// SECURITY: the Cesium Ion token below ships in client JS. Restrict it in your
// Cesium Ion account (Access Tokens → allowed URLs = your Pages domain) so it
// can't be reused elsewhere.

import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { TilesRenderer, GlobeControls, CAMERA_FRAME } from '3d-tiles-renderer';
import { CesiumIonAuthPlugin } from '3d-tiles-renderer/core/plugins';
import { GLTFExtensionsPlugin, TilesFadePlugin, UpdateOnChangePlugin } from '3d-tiles-renderer/three/plugins';
import {
  EffectComposer, RenderPass, NormalPass, EffectPass, SMAAEffect,
  ToneMappingEffect, ToneMappingMode, Effect,
} from 'postprocessing';
import {
  CloudsEffect,
  CLOUD_SHAPE_TEXTURE_SIZE, CLOUD_SHAPE_DETAIL_TEXTURE_SIZE,
  DEFAULT_LOCAL_WEATHER_URL, DEFAULT_SHAPE_URL, DEFAULT_SHAPE_DETAIL_URL, DEFAULT_TURBULENCE_URL,
} from '@takram/three-clouds';
import { AerialPerspectiveEffect, PrecomputedTexturesGenerator, getSunDirectionECEF } from '@takram/three-atmosphere';
import { STBNLoader, DEFAULT_STBN_URL } from '@takram/three-geospatial';
import { DitheringEffect, LensFlareEffect } from '@takram/three-geospatial-effects';

const ION_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIyZDYwOTRhZS04MTRiLTQ4NzUtYWVlNS0wZTg4NmE1MzJlMTAiLCJpZCI6NDY3NDM2LCJzdWIiOiJyYWFndWwiLCJpc3MiOiJodHRwczovL2FwaS5jZXNpdW0uY29tIiwiYXVkIjoiVW50aXRsZWQiLCJpYXQiOjE3ODY1OTI1MDV9.SHlvY6dezrDiSn362P9QBW1PzXSxBOKxeAS6I08ztGY';
const ASSET_ID = '2275207';               // Google Photorealistic 3D Tiles
const DEG = Math.PI / 180;
// lat, lon, height(m), heading, pitch, roll — camera framing above a city
const START = { lat: 35.6812, lon: 139.80, height: 500, heading: -90, pitch: -10 };

let camera, scene, renderer, composer;
let tiles, controls, clouds, aerialPerspective;
let prevTime = 0, deltaTime = 0;

const qs = new URLSearchParams(location.search);
const NO_CLOUDS = qs.has('noclouds');
// pmndrs' AgX tone mapping ignores renderer.toneMappingExposure, so scale the
// HDR radiance ourselves before tone mapping (the example used exposure 10).
const EXPOSURE = parseFloat(qs.get('exp')) || 10;
let firstFrame = false;

// a minimal exposure multiply as a pmndrs Effect (runs before AgX)
class ExposureEffect extends Effect {
  constructor(exposure = 10) {
    super('ExposureEffect',
      'uniform float exposure; void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor){ outputColor = vec4(inputColor.rgb * exposure, inputColor.a); }',
      { uniforms: new Map([['exposure', new THREE.Uniform(exposure)]]) });
  }
  set value(v) { this.uniforms.get('exposure').value = v; }
  get value() { return this.uniforms.get('exposure').value; }
}

function hideLoader() { const l = document.getElementById('cityLoader'); if (l) l.style.display = 'none'; }
function status(msg) { const l = document.getElementById('cityLoader'); if (l) l.textContent = msg; console.log('[city]', msg); }
function fail(msg) {
  const el = document.getElementById('cityErr');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
  hideLoader();
  console.error('[city]', msg);
}

// guarantee the loader never sticks (looks like a black screen) even if init stalls
setTimeout(hideLoader, 5000);
init().catch((e) => fail('City failed: ' + (e && e.message ? e.message : e)));

async function init() {
  camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 10, 1e6);
  scene = new THREE.Scene();

  renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  // the @takram atmosphere/clouds + pmndrs postprocessing require WebGL2
  if (!renderer.capabilities.isWebGL2) { fail('This device/browser has no WebGL2 — the photoreal city needs it.'); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  // tone mapping is applied in the effect chain (pmndrs), not by the renderer
  renderer.toneMapping = THREE.NoToneMapping;
  document.body.appendChild(renderer.domElement);
  status('Starting the atmosphere…');

  // ---- tiles (Google Photorealistic 3D Tiles via Cesium Ion) ----
  const draco = new DRACOLoader();
  draco.setDecoderPath('draco/');          // decoder bundled under public/draco/

  tiles = new TilesRenderer();
  tiles.registerPlugin(new CesiumIonAuthPlugin({ apiToken: ION_KEY, assetId: ASSET_ID, autoRefreshToken: true }));
  tiles.registerPlugin(new GLTFExtensionsPlugin({ dracoLoader: draco }));
  tiles.registerPlugin(new TilesFadePlugin());
  tiles.registerPlugin(new UpdateOnChangePlugin());
  tiles.setCamera(camera);
  tiles.setResolutionFromRenderer(camera, renderer);
  scene.add(tiles.group);

  // frame the camera above the city
  tiles.ellipsoid.getObjectFrame(
    START.lat * DEG, START.lon * DEG, START.height,
    START.heading * DEG, START.pitch * DEG, 0,
    camera.matrix, CAMERA_FRAME,
  );
  camera.matrix.decompose(camera.position, camera.quaternion, camera.scale);

  // ---- controls ----
  controls = new GlobeControls(scene, camera, renderer.domElement);
  controls.setEllipsoid(tiles.ellipsoid, tiles.group);
  controls.enableDamping = true;
  controls.adjustHeight = false;           // avoid camera drift while tiles stream in
  const enableAdjust = () => {
    controls.adjustHeight = true;
    renderer.domElement.removeEventListener('pointerdown', enableAdjust);
    renderer.domElement.removeEventListener('wheel', enableAdjust);
  };
  renderer.domElement.addEventListener('pointerdown', enableAdjust);
  renderer.domElement.addEventListener('wheel', enableAdjust);

  // ---- atmosphere (sky + aerial perspective + deferred sun/sky light) ----
  aerialPerspective = new AerialPerspectiveEffect(camera);
  aerialPerspective.sky = true;
  aerialPerspective.sunLight = true;
  aerialPerspective.skyLight = true;

  // ---- volumetric clouds ----
  clouds = new CloudsEffect(camera);
  clouds.coverage = 0.3;
  clouds.localWeatherVelocity.set(0.001, 0);
  clouds.shadow.farScale = 0.25;
  clouds.shadow.maxFar = 1e5;
  clouds.shadow.cascadeCount = 2;
  clouds.shadow.mapSize.set(512, 512);
  clouds.shadow.splitMode = 'practical';
  clouds.shadow.splitLambda = 0.71;
  clouds.events.addEventListener('change', (event) => {
    if (event.property === 'atmosphereOverlay') aerialPerspective.overlay = clouds.atmosphereOverlay;
    if (event.property === 'atmosphereShadow') aerialPerspective.shadow = clouds.atmosphereShadow;
    if (event.property === 'atmosphereShadowLength') aerialPerspective.shadowLength = clouds.atmosphereShadowLength;
  });

  // ---- post pipeline (pmndrs postprocessing; HDR HalfFloat buffer) ----
  // Canonical @takram order: scene -> normals -> [clouds +] aerial + AgX tonemap.
  composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType });
  const normalPass = new NormalPass(scene, camera);
  aerialPerspective.normalBuffer = normalPass.texture;
  const exposure = new ExposureEffect(EXPOSURE);
  const toneMapping = new ToneMappingEffect({ mode: ToneMappingMode.AGX });
  const skyEffects = NO_CLOUDS
    ? [aerialPerspective, exposure, toneMapping]
    : [clouds, aerialPerspective, exposure, toneMapping];
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(normalPass);
  composer.addPass(new EffectPass(camera, ...skyEffects));
  composer.addPass(new EffectPass(camera, new LensFlareEffect()));
  composer.addPass(new EffectPass(camera, new DitheringEffect()));
  composer.addPass(new EffectPass(camera, new SMAAEffect()));

  // ---- precomputed atmosphere textures (generated on the GPU) ----
  status('Precomputing atmosphere…');
  const generator = new PrecomputedTexturesGenerator(renderer);
  const textures = await generator.update();
  Object.assign(aerialPerspective, textures);
  Object.assign(clouds, textures);
  status('Loading the city…');

  // ---- cloud noise / weather textures (streamed from the @takram CDN) ----
  if (!NO_CLOUDS) {
    const texLoader = new THREE.TextureLoader();
    const loadTex = (url, prop) => texLoader.load(url, (t) => {
      t.minFilter = THREE.LinearMipMapLinearFilter; t.magFilter = THREE.LinearFilter;
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true;
      clouds[prop] = t;
    }, undefined, () => console.warn('[city] cloud texture failed:', url));
    loadTex(DEFAULT_LOCAL_WEATHER_URL, 'localWeatherTexture');
    loadTex(DEFAULT_TURBULENCE_URL, 'turbulenceTexture');

    const load3D = (url, size, prop) => fetch(url).then((r) => r.arrayBuffer()).then((buf) => {
      const t = new THREE.Data3DTexture(new Uint8Array(buf), size, size, size);
      t.format = THREE.RedFormat; t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
      t.wrapS = t.wrapT = t.wrapR = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true;
      clouds[prop] = t;
    }).catch(() => console.warn('[city] cloud 3D texture failed:', url));
    load3D(DEFAULT_SHAPE_URL, CLOUD_SHAPE_TEXTURE_SIZE, 'shapeTexture');
    load3D(DEFAULT_SHAPE_DETAIL_URL, CLOUD_SHAPE_DETAIL_TEXTURE_SIZE, 'shapeDetailTexture');
    new STBNLoader().load(DEFAULT_STBN_URL, (t) => { clouds.stbnTexture = t; aerialPerspective.stbnTexture = t; });
  }

  // ---- sun position (time of day) ----
  const sunDirection = new THREE.Vector3();
  const params = { hourUTC: 3 };            // ~noon in Tokyo (brightest for now)
  const updateSun = () => {
    const ms = params.hourUTC * 3600000;
    const date = new Date(Date.UTC(2024, 2, 1) + ms);
    getSunDirectionECEF(date, sunDirection);
    aerialPerspective.sunDirection.copy(sunDirection);
    clouds.sunDirection.copy(sunDirection);
  };
  updateSun();
  const hour = document.getElementById('hour');
  if (hour) { hour.value = String(params.hourUTC); hour.addEventListener('input', (e) => { params.hourUTC = parseFloat(e.target.value); updateSun(); }); }

  // surface tile/token/network problems instead of a silent black screen
  tiles.addEventListener('load-error', (e) => fail('Tiles error (check the Cesium Ion token / its allowed URLs): ' + (e && e.error ? e.error.message || e.error : '')));

  addEventListener('resize', onResize);
  onResize();

  window.__city = {
    camera, scene, renderer, composer, tiles, controls, clouds, aerialPerspective, params, updateSun, NO_CLOUDS,
    setExposure: (v) => { exposure.value = v; },     // live-tune: __city.setExposure(20)
  };
  renderer.setAnimationLoop(animate);
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  tiles.setResolutionFromRenderer(camera, renderer);
}

function animate(time) {
  deltaTime = (time - prevTime) / 1000;
  prevTime = time;
  controls.update();
  camera.updateMatrixWorld();
  tiles.update();
  composer.render(deltaTime);
  if (!firstFrame) { firstFrame = true; hideLoader(); }   // rendering has begun
}

import * as THREE from 'three';
// The ocean example's Sky, vendored from three.js master — the Sky shipped with
// the pinned 0.170 has no clouds, which is most of why our sky looked nothing
// like the reference.
import { Sky } from './vendor/Sky.js';

// A real gradient sky via atmospheric scattering (three.js Sky / Preetham),
// tunable per mood — a proper coloured dusk/night gradient instead of a flat
// grey. It's PMREM-baked into the scene environment for reflections + ambient,
// and a directional sun aligned to it casts the shadows. Exponential fog blends
// the horizon so distant mountains fade into haze.
export class Environment {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.nightFactor = 0;
    this.sunDir = new THREE.Vector3(0, 0.1, 1);

    this.sky = new Sky();
    this.sky.scale.setScalar(10000);
    scene.add(this.sky);
    const u = this.sky.material.uniforms;
    u.turbidity.value = 8;
    u.rayleigh.value = 2;
    u.mieCoefficient.value = 0.005;
    u.mieDirectionalG.value = 0.8;

    // Clouds, at the vendored Sky's own defaults. This is the layer that was
    // missing entirely — the reference's sky is mostly cloud.
    u.cloudScale.value = 0.0002;
    u.cloudSpeed.value = 0.0001;
    u.cloudCoverage.value = 0.4;
    u.cloudDensity.value = 0.4;
    u.cloudElevation.value = 0.5;

    // The old fog-band and sunset-ember shader patch is gone: it existed for the
    // fogged-terrain moods, it has no counterpart in the reference, and it
    // patched against shader text this Sky no longer contains.

    // The one deliberate departure from webgl_shaders_ocean, which creates no
    // lights at all. Sky light alone has no direction, so the car sat as a
    // silhouette against its own glare — the sea reads because Water is
    // specular, and the car had no equivalent. This directional sun rides the
    // same vector the sky puts its disc on, so the rim it lays on the car comes
    // from exactly where the glare does, and it grounds the car with a shadow.
    this.sun = new THREE.DirectionalLight(0xffe8cc, 0);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.5;
    const s = this.sun.shadow.camera;
    // A sun this low throws very long shadows — roughly h/tan(elevation), tens
    // of metres for the car alone — so the box has to be generous or they are
    // clipped off mid-deck.
    s.near = 1; s.far = 700; s.left = -110; s.right = 110; s.top = 110; s.bottom = -110;
    scene.add(this.sun, this.sun.target);

    scene.fog = new THREE.FogExp2(0x9aa7b4, 0.0);
    renderer.toneMappingExposure = 0.1;   // the example's exposure

    this.pmrem = new THREE.PMREMGenerator(renderer);
    this._skyScene = new THREE.Scene();
    this._sunV = new THREE.Vector3();
    this.setSky(4, 165, 8, 2);   // default: winter-dusk low sun
  }

  // elevation/azimuth in degrees; turbidity/rayleigh shape the haze + blue.
  setSky(elevationDeg, azimuthDeg = 165, turbidity = 8, rayleigh = 2) {
    const u = this.sky.material.uniforms;
    u.turbidity.value = turbidity;
    u.rayleigh.value = rayleigh;
    const phi = THREE.MathUtils.degToRad(90 - elevationDeg);
    const theta = THREE.MathUtils.degToRad(azimuthDeg);
    this._sunV.setFromSphericalCoords(1, phi, theta);
    u.sunPosition.value.copy(this._sunV);
    this.sunDir.copy(this._sunV).normalize();
    this._syncWater();
    this._updateEnv();
  }

  // The ocean example feeds the same sun vector to both the sky and the water,
  // so the specular highlight sits exactly where the sky says the sun is.
  setWater(water) { this.water = water; this._syncWater(); }
  _syncWater() {
    if (this.water) this.water.material.uniforms.sunDirection.value.copy(this.sunDir).normalize();
  }

  // bake the sky into the scene environment (reflections + ambient IBL)
  _updateEnv() {
    if (this._envRT) this._envRT.dispose();
    this.scene.remove(this.sky);
    this._skyScene.add(this.sky);
    this._envRT = this.pmrem.fromScene(this._skyScene);
    this._skyScene.remove(this.sky);
    this.scene.add(this.sky);
    this.scene.environment = this._envRT.texture;
  }

  // warm sunset ember behind the terrain. Only sets the uniforms; the caller
  // should follow with setSky() so it's baked into the environment IBL too.
  setSunset(color, amount = 0) {
    const u = this.sky.material.uniforms;
    if (u.uSunset) u.uSunset.value.set(color);
    if (u.uSunsetAmt) u.uSunsetAmt.value = amount;
  }

  // kept for API compatibility
  setSun() {}
  applyWeather() {}
  setBackground() {}

  setFog(color, density) {
    if (!this.scene.fog) return;
    this.scene.fog.color.set(color);
    this.scene.fog.density = density;
    // keep the sky's horizon band matched to the fog so they read as one scene
    const hf = this.sky.material.uniforms.uHorizonFog;
    if (hf) hf.value.copy(this.scene.fog.color);
  }
  setExposure(e) { this.renderer.toneMappingExposure = e; }
  setLight(sunColor, sunI) { this.sun.color.set(sunColor); this.sun.intensity = sunI; }
  setEnvIntensity(v) { this.scene.environmentIntensity = v; }
  setMoon() {}

  update(target, dt = 1 / 60) {
    // drives the cloud motion in the vendored Sky
    this.sky.material.uniforms.time.value += dt;
    // sun and its shadow box travel with the car, so the map always covers the
    // stretch of deck on screen rather than somewhere back down the causeway
    this.sun.position.copy(target).addScaledVector(this.sunDir, 300);
    this.sun.target.position.copy(target);
    this.sky.position.copy(target);
  }

  dispose() {
    this.scene.environment = null;
    if (this._envRT) this._envRT.dispose();
    this.pmrem.dispose();
    this.scene.remove(this.sun, this.sun.target, this.sky);
    this.scene.fog = null;
  }
}

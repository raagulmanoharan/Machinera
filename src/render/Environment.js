import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';

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

    // Fade the lower sky into the fog colour so the sky dome and the fogged
    // terrain meet seamlessly at the horizon — no "composite" seam. uHorizonFog
    // tracks the live fog colour (see setFog).
    const sm = this.sky.material;
    sm.uniforms.uHorizonFog = { value: new THREE.Color(0x9aa7b4) };
    // The band over which the sky fades into fog colour. Reaching well up the
    // sky (uFogBandHi) means distant mountain ridges sit inside a haze-coloured
    // sky, so their silhouettes dissolve softly instead of cutting a hard edge.
    // Band pushed below the horizon so the mix is a no-op and the Preetham sky
    // renders exactly as the example does. Raising uFogBandHi re-enables the
    // fade for a fog-based mood.
    sm.uniforms.uFogBandLo = { value: -1.2 };
    sm.uniforms.uFogBandHi = { value: -1.0 };
    // A faint warm sunset ember low on the horizon — late-dusk light behind the
    // terrain. It lives only at the very bottom of the sky, fading out before it
    // reaches mountain-ridge height, so the ridges still meet cool haze and stay
    // soft. Baked into the environment (below), it also lifts the ambient light.
    sm.uniforms.uSunset = { value: new THREE.Color(0xff9a52) };
    sm.uniforms.uSunsetAmt = { value: 0.0 };
    sm.fragmentShader = sm.fragmentShader
      .replace('uniform float mieDirectionalG;', 'uniform float mieDirectionalG;\nuniform vec3 uHorizonFog;\nuniform float uFogBandLo;\nuniform float uFogBandHi;\nuniform vec3 uSunset;\nuniform float uSunsetAmt;')
      .replace(
        'gl_FragColor = vec4( retColor, 1.0 );',
        `float _ember = smoothstep(0.17, -0.06, direction.y) * uSunsetAmt;
         vec3 _hzCol = mix( uHorizonFog, uSunset, _ember );
         float _hz = smoothstep(uFogBandLo, uFogBandHi, direction.y);
         retColor = mix( _hzCol, retColor, _hz );
         gl_FragColor = vec4( retColor, 1.0 );`);
    sm.needsUpdate = true;

    // A single directional sun, aimed along the same vector the sky puts the sun
    // on. The ocean example has no lights at all, so nothing in it casts a
    // shadow — its "sun" is the bright disc in the sky plus specular on water.
    // Ambient sky light alone gives shape but no direction, which is why the
    // scene read as having no light source. This is the one addition.
    this.sun = new THREE.DirectionalLight(0xfff0dc, 0);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.4;
    const s = this.sun.shadow.camera;
    // tight around the stretch of causeway in view — a wider box spreads the
    // same 2048 map over more ground and the pillar shadows go soft and blocky
    s.near = 1; s.far = 500; s.left = -70; s.right = 70; s.top = 70; s.bottom = -70;
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
  setMoon() {}                     // no moon in this mood set

  update(target) {
    // keep the sun (and its shadow box) travelling with the car, so the shadow
    // map always covers the stretch of road actually on screen
    this.sun.position.copy(target).addScaledVector(this.sunDir, 220);
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

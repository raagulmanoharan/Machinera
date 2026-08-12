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
    sm.fragmentShader = sm.fragmentShader
      .replace('uniform float mieDirectionalG;', 'uniform float mieDirectionalG;\nuniform vec3 uHorizonFog;')
      .replace(
        'gl_FragColor = vec4( retColor, 1.0 );',
        `float _hz = smoothstep(-0.03, 0.26, direction.y);
         retColor = mix( uHorizonFog, retColor, _hz );
         gl_FragColor = vec4( retColor, 1.0 );`);
    sm.needsUpdate = true;

    this.sun = new THREE.DirectionalLight(0xcfe0ff, 1.2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0003;
    this.sun.shadow.normalBias = 0.5;
    const s = this.sun.shadow.camera;
    s.near = 1; s.far = 420; s.left = -110; s.right = 110; s.top = 110; s.bottom = -110;
    scene.add(this.sun, this.sun.target);

    this.hemi = new THREE.HemisphereLight(0x9fb0c4, 0x3a3630, 0.5);
    scene.add(this.hemi);

    // a soft, cool moonlight — a low fill from a fixed high angle that shapes
    // and rim-lights the terrain/road without brightening the sky dome (kept
    // separate from the below-horizon sun). Driven per mood.
    this.moonDir = new THREE.Vector3().setFromSphericalCoords(
      1, THREE.MathUtils.degToRad(90 - 34), THREE.MathUtils.degToRad(-48),
    ).normalize();
    this.moon = new THREE.DirectionalLight(0x9fb4d8, 0.0);
    scene.add(this.moon, this.moon.target);

    scene.fog = new THREE.FogExp2(0x9aa7b4, 0.012);
    renderer.toneMappingExposure = 0.9;

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
    this._updateEnv();
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
  setLight(sunColor, sunI, hemiColor, hemiI) {
    this.sun.color.set(sunColor);
    this.sun.intensity = sunI;
    this.hemi.color.set(hemiColor);
    this.hemi.intensity = hemiI;
  }
  setEnvIntensity(v) { this.scene.environmentIntensity = v; }
  setMoon(color, intensity) { this.moon.color.set(color); this.moon.intensity = intensity; }

  update(target) {
    this.sun.position.copy(target).addScaledVector(this.sunDir, 200);
    this.sun.target.position.copy(target);
    this.moon.position.copy(target).addScaledVector(this.moonDir, 300);
    this.moon.target.position.copy(target);
    this.sky.position.copy(target);
  }

  dispose() {
    this.scene.environment = null;
    if (this._envRT) this._envRT.dispose();
    this.pmrem.dispose();
    this.scene.remove(this.sun, this.sun.target, this.moon, this.moon.target, this.hemi, this.sky);
    this.scene.fog = null;
  }
}

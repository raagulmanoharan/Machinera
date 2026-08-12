import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';

// Atmospheric sky (Preetham scattering) + sun light + image-based lighting.
// The environment map is rendered from the sky itself, so reflections and
// ambient light physically match the sky — no external HDRI needed.
export class Environment {
  constructor(scene, renderer, opts = {}) {
    this.scene = scene;
    this.renderer = renderer;

    // ---- sky dome ----
    this.sky = new Sky();
    this.sky.scale.setScalar(45000);
    this.sky.frustumCulled = false;
    scene.add(this.sky);
    const u = this.sky.material.uniforms;
    u.turbidity.value = opts.turbidity ?? 2.6;
    u.rayleigh.value = opts.rayleigh ?? 1.1;   // lower = deeper blue, less white haze
    u.mieCoefficient.value = opts.mieCoefficient ?? 0.004;
    u.mieDirectionalG.value = opts.mieDirectionalG ?? 0.8;

    // ---- sun direction ----
    this.elevation = opts.elevation ?? 40; // degrees above horizon
    this.azimuth = opts.azimuth ?? 150;
    this.sunDir = new THREE.Vector3();
    this._applySun();

    // ---- sun (key light) ----
    this.sun = new THREE.DirectionalLight(0xfff2da, 2.1);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0003;
    this.sun.shadow.normalBias = 0.5;
    const s = this.sun.shadow.camera;
    s.near = 1; s.far = 420; s.left = -110; s.right = 110; s.top = 110; s.bottom = -110;
    scene.add(this.sun);
    scene.add(this.sun.target);

    // ---- soft sky fill (kept low; IBL provides most ambient) ----
    this.hemi = new THREE.HemisphereLight(0xaec6e8, 0x53514a, 0.22);
    scene.add(this.hemi);

    // ---- fog matched to horizon ----
    scene.fog = new THREE.Fog(0xaebfd0, opts.fogNear ?? 600, opts.fogFar ?? 3600);

    // ---- image-based lighting from the sky ----
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.pmrem.compileEquirectangularShader();
    this._updateEnv();
  }

  _applySun() {
    const phi = THREE.MathUtils.degToRad(90 - this.elevation);
    const theta = THREE.MathUtils.degToRad(this.azimuth);
    this.sunDir.setFromSphericalCoords(1, phi, theta);
    this.sky.material.uniforms.sunPosition.value.copy(this.sunDir);
  }

  // regenerate the environment map after any sky/sun change
  _updateEnv() {
    if (this._envRT) this._envRT.dispose();
    // render just the sky into the PMREM
    const skyScene = new THREE.Scene();
    const sky2 = this.sky.clone();
    sky2.material = this.sky.material; // share uniforms
    skyScene.add(sky2);
    this._envRT = this.pmrem.fromScene(skyScene, 0, 0.1, 1000);
    this.scene.environment = this._envRT.texture;
    this.scene.environmentIntensity = 0.55;
  }

  setTimeOfDay(elevation, azimuth) {
    this.elevation = elevation;
    if (azimuth != null) this.azimuth = azimuth;
    this._applySun();
    // warm the sun toward horizon
    const warm = THREE.MathUtils.clamp((elevation - 2) / 25, 0, 1);
    this.sun.color.setHSL(0.09 + 0.02 * warm, 0.55 - 0.25 * warm, 0.55 + 0.08 * warm);
    this.sun.intensity = 1.4 + 1.6 * warm;
    this._updateEnv();
  }

  // keep the sun rig and shadow frustum centred on the car
  update(target) {
    this.sun.position.copy(target).addScaledVector(this.sunDir, 200);
    this.sun.target.position.copy(target);
    this.sky.position.copy(target);
  }

  dispose() {
    this.scene.environment = null;
    if (this._envRT) this._envRT.dispose();
    this.pmrem.dispose();
    this.scene.remove(this.sky, this.sun, this.sun.target, this.hemi);
    this.scene.fog = null;
  }
}

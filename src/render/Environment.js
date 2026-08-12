import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

// Realistic image-based lighting from an HDR sky (three.js "webgl_materials_car"
// example environment). The HDR provides ambient light, reflections and the sky
// itself; a matching directional sun adds the crisp cast shadows that IBL alone
// can't. This is what makes the car — and the whole scene — read as real.
export class Environment {
  constructor(scene, renderer, opts = {}) {
    this.scene = scene;
    this.renderer = renderer;
    this.nightFactor = 0;               // HDR is a fixed golden-hour look
    // sun direction chosen to match the HDR's warm low sun (tuned by eye)
    this.sunDir = new THREE.Vector3(-0.62, 0.42, 0.66).normalize();

    this.sun = new THREE.DirectionalLight(0xffe6bf, 2.4);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0003;
    this.sun.shadow.normalBias = 0.5;
    const s = this.sun.shadow.camera;
    s.near = 1; s.far = 420; s.left = -110; s.right = 110; s.top = 110; s.bottom = -110;
    scene.add(this.sun, this.sun.target);

    this.hemi = new THREE.HemisphereLight(0xcfe0ff, 0x554634, 0.35);
    scene.add(this.hemi);

    scene.fog = new THREE.Fog(0xd8c6a6, 550, 3600);   // warm haze to blend the horizon

    renderer.toneMappingExposure = 0.95;

    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.pmrem.compileEquirectangularShader();
    this._loadHDR(opts.hdr || (import.meta.env.BASE_URL || './') + 'textures/night_1k.hdr');
  }

  _loadHDR(url) {
    // A dark night HDR: it lights the scene, casts soft reflections on the wet
    // road, and is the sky itself. Kept dim (backgroundIntensity) so it stays
    // dark and mysterious, but real detail beats a flat solid colour.
    new RGBELoader().load(url, (tex) => {
      tex.mapping = THREE.EquirectangularReflectionMapping;
      this._envRT = this.pmrem.fromEquirectangular(tex);
      this.scene.environment = this._envRT.texture;
      this.scene.environmentIntensity = 0.7;
      this.scene.background = tex;
      this.scene.backgroundIntensity = 0.5;
      this.scene.backgroundBlurriness = 0.85;  // smear the stars into a hazy dark sky
      this._hdr = tex;
    }, undefined, () => { this.scene.background = new THREE.Color(0x0c1018); });
  }

  // mood hook: scale how bright the HDR sky reads (dark moods dim it further)
  setBackground(intensity) { if (intensity != null) this.scene.backgroundIntensity = intensity; }

  // kept for API compatibility — the HDR is the look, so these are no-ops
  setSun() {}
  applyWeather() {}

  // ---- dynamic hooks for the liminal mood system ----
  setFog(color, near, far) {
    if (!this.scene.fog) return;
    this.scene.fog.color.set(color);
    this.scene.fog.near = near;
    this.scene.fog.far = far;
  }
  setExposure(e) { this.renderer.toneMappingExposure = e; }
  setLight(sunColor, sunI, hemiColor, hemiI) {
    this.sun.color.set(sunColor);
    this.sun.intensity = sunI;
    this.hemi.color.set(hemiColor);
    this.hemi.intensity = hemiI;
  }
  // dim the HDR reflections for dark, foggy moods
  setEnvIntensity(v) { this.scene.environmentIntensity = v; }

  update(target) {
    this.sun.position.copy(target).addScaledVector(this.sunDir, 200);
    this.sun.target.position.copy(target);
  }

  dispose() {
    this.scene.environment = null;
    this.scene.background = null;
    if (this._envRT) this._envRT.dispose();
    if (this._hdr) this._hdr.dispose();
    this.pmrem.dispose();
    this.scene.remove(this.sun, this.sun.target, this.hemi);
    this.scene.fog = null;
  }
}

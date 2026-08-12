import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { Lensflare, LensflareElement } from 'three/examples/jsm/objects/Lensflare.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

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

    this._sunGlare();
    this._clouds();
  }

  // Load a real photographic sky (HDRI) as the background + image-based lighting,
  // replacing the procedural sky/clouds. Keeps the directional sun for shadows.
  async loadHDRI(url) {
    let tex;
    try {
      tex = await new Promise((res, rej) => new RGBELoader().load(url, res, undefined, rej));
    } catch { return false; }
    tex.mapping = THREE.EquirectangularReflectionMapping;
    this.scene.background = tex;
    this.scene.backgroundIntensity = 1.0;
    const env = this.pmrem.fromEquirectangular(tex).texture;
    if (this._envRT) this._envRT.dispose();
    this.scene.environment = env;
    this.scene.environmentIntensity = 1.0;
    this._hdr = tex;
    // remove the procedural sky, clouds and lens flare — the HDRI has real sky, clouds and sun
    if (this.sky) { this.scene.remove(this.sky); this.sky = null; }
    if (this._clouds_) { this.scene.remove(this._clouds_); this._clouds_ = null; }
    if (this._flareAnchor) { this.scene.remove(this._flareAnchor); this._flareAnchor = null; }
    // lift the sun to roughly match the HDRI, soften the fill
    this.hemi.intensity = 0.35;
    this.sun.intensity = 2.4;
    return true;
  }

  // ---- sun glare / lens flare ----
  _radialTex(inner, stops) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    for (const [o, col] of stops) grd.addColorStop(o, col);
    g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }

  _sunGlare() {
    const glow = this._radialTex(0, [[0, 'rgba(255,246,224,1)'], [0.2, 'rgba(255,230,180,0.7)'], [0.5, 'rgba(255,210,150,0.15)'], [1, 'rgba(255,200,140,0)']]);
    const ghost = this._radialTex(0, [[0, 'rgba(255,240,220,0.5)'], [0.6, 'rgba(200,220,255,0.12)'], [1, 'rgba(255,255,255,0)']]);
    const lf = new Lensflare();
    lf.addElement(new LensflareElement(glow, 620, 0, new THREE.Color(0xfff2da)));
    lf.addElement(new LensflareElement(ghost, 60, 0.55));
    lf.addElement(new LensflareElement(ghost, 90, 0.7));
    lf.addElement(new LensflareElement(ghost, 140, 0.9));
    lf.addElement(new LensflareElement(ghost, 70, 1.0));
    const anchor = new THREE.Object3D();
    anchor.add(lf);
    this.scene.add(anchor);
    this._flareAnchor = anchor;
  }

  // ---- drifting clouds on a seamless sky dome (no visible edge) ----
  _clouds() {
    const W = 1024, H = 512;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.clearRect(0, 0, W, H);
    let s = 5; const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    for (let i = 0; i < 80; i++) {
      const x = rnd() * W;
      const y = H * (0.22 + rnd() * 0.5);          // band above the horizon
      const r = 30 + rnd() * 110;
      const a = 0.35 + rnd() * 0.4;
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, `rgba(255,255,255,${a})`);
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd; g.beginPath(); g.ellipse(x, y, r, r * 0.6, 0, 0, 7); g.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    const geo = new THREE.SphereGeometry(7000, 32, 20);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.BackSide, fog: false, color: 0xf2f5f8 });
    const dome = new THREE.Mesh(geo, mat);
    dome.frustumCulled = false;
    this.scene.add(dome);
    this._clouds_ = dome; this._cloudTex = tex;
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

  // keep the sun rig, sky, glare and clouds centred on the car
  update(target, dt = 0.016) {
    this.sun.position.copy(target).addScaledVector(this.sunDir, 200);
    this.sun.target.position.copy(target);
    if (this.sky) this.sky.position.copy(target);
    if (this._flareAnchor) this._flareAnchor.position.copy(target).addScaledVector(this.sunDir, 6000);
    if (this._clouds_) {
      this._clouds_.position.x = target.x; this._clouds_.position.z = target.z;
      if (this._cloudTex) { this._cloudTex.offset.x += dt * 0.0045; this._cloudTex.offset.y += dt * 0.0012; } // wind
    }
  }

  dispose() {
    this.scene.environment = null;
    if (this._envRT) this._envRT.dispose();
    this.pmrem.dispose();
    this.scene.remove(this.sky, this.sun, this.sun.target, this.hemi);
    this.scene.fog = null;
  }
}

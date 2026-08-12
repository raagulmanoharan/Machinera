import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { Lensflare, LensflareElement } from 'three/examples/jsm/objects/Lensflare.js';
import { sunPosition, sunDirection } from './sun.js';

// Contextual sky: atmospheric scattering driven by the real sun position for a
// location + time, plus live-weather cloud cover / haze / fog. Image-based
// lighting is rendered from the sky, so the whole scene lights to match.
export class Environment {
  constructor(scene, renderer, opts = {}) {
    this.scene = scene;
    this.renderer = renderer;
    this._elev = 0.6;                 // sun elevation (radians)
    this._weather = { cloudCover: 0.25, precip: 0, isDay: true };
    this.sunDir = new THREE.Vector3(0.4, 0.6, 0.3).normalize();

    this.sky = new Sky();
    this.sky.scale.setScalar(45000);
    this.sky.frustumCulled = false;
    scene.add(this.sky);

    this.sun = new THREE.DirectionalLight(0xfff2da, 2.1);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0003;
    this.sun.shadow.normalBias = 0.5;
    const s = this.sun.shadow.camera;
    s.near = 1; s.far = 420; s.left = -110; s.right = 110; s.top = 110; s.bottom = -110;
    scene.add(this.sun, this.sun.target);

    this.hemi = new THREE.HemisphereLight(0xaec6e8, 0x53514a, 0.25);
    scene.add(this.hemi);

    // faint cool moonlight so night is atmospheric-dark, not pitch black
    this.moon = new THREE.AmbientLight(0x2a3550, 0);
    scene.add(this.moon);
    this.nightFactor = 0;             // 0 day → 1 night (read by the car for headlights)

    scene.fog = new THREE.Fog(0xaebfd0, 500, 3200);

    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.pmrem.compileEquirectangularShader();

    this._sunGlare();
    this._clouds();

    // default: current time at a scenic default location until told otherwise
    this.setSun(opts.lat ?? 46.55, opts.lng ?? 8.0, new Date());
  }

  // ---- set the sun from a real place + moment ----
  setSun(lat, lng, date = new Date()) {
    const { elevation, azimuth } = sunPosition(lat, lng, date);
    this._elev = elevation;
    this.sunDir.copy(sunDirection(elevation, azimuth));
    this.sky.material.uniforms.sunPosition.value.copy(this.sunDir);
    this._apply();
  }

  // ---- set current weather (from Open-Meteo) ----
  applyWeather(w) {
    if (w) this._weather = w;
    this._apply();
  }

  // recompute sky uniforms, lighting, fog, clouds and IBL from sun + weather
  _apply() {
    const eDeg = THREE.MathUtils.radToDeg(this._elev);
    const day = THREE.MathUtils.smoothstep(eDeg, -4, 8);   // 0 night → 1 day
    const cloud = THREE.MathUtils.clamp(this._weather.cloudCover, 0, 1);
    const rain = THREE.MathUtils.clamp((this._weather.precip || 0) / 3, 0, 1);
    this.nightFactor = 1 - THREE.MathUtils.smoothstep(eDeg, -6, 3); // headlights on

    // moonlight fills in as the sun sets
    this.moon.intensity = 0.55 * this.nightFactor;

    // sky scattering: hazier/greyer with cloud
    const u = this.sky.material.uniforms;
    u.turbidity.value = 2.4 + cloud * 9;
    u.rayleigh.value = Math.max(0.2, 1.2 - cloud * 0.6);
    u.mieCoefficient.value = 0.004 + cloud * 0.006;
    u.mieDirectionalG.value = 0.8;

    // sun light: warm near horizon → white high; dimmed by cloud
    this.sun.color.copy(new THREE.Color(0xff7a2c)).lerp(new THREE.Color(0xfff2da), THREE.MathUtils.clamp((eDeg - 1) / 16, 0, 1));
    this.sun.intensity = (0.15 + 2.6 * day) * (1 - cloud * 0.75);

    // hemisphere fill
    this.hemi.intensity = 0.1 + 0.32 * day + cloud * 0.12 * day;
    this.hemi.color.setHSL(0.6, 0.45, 0.35 + 0.25 * day);

    // fog: dark blue at night, light by day, grey when overcast/raining
    const fog = new THREE.Color(0x0b111c).lerp(new THREE.Color(0xaebfd0), day)
      .lerp(new THREE.Color(0x9299a0), cloud * 0.55 + rain * 0.2);
    this.scene.fog.color.copy(fog);
    this.scene.fog.near = 380 - (cloud + rain) * 180;
    this.scene.fog.far = (3400 - (cloud + rain) * 2100) * (0.35 + 0.65 * day);

    // exposure: dim at night / overcast
    this.renderer.toneMappingExposure = (0.18 + 0.82 * day) * (1 - cloud * 0.3);

    // clouds + glare
    if (this._clouds_) {
      this._clouds_.material.opacity = THREE.MathUtils.clamp(0.12 + cloud * 0.85, 0.08, 0.97);
      this._clouds_.material.color.setScalar(0.5 + 0.5 * day - cloud * 0.15);
    }
    if (this._flareAnchor) this._flareAnchor.visible = eDeg > 3 && cloud < 0.6;

    this._updateEnv();
  }

  _radialTex(stops) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    for (const [o, col] of stops) grd.addColorStop(o, col);
    g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }

  _sunGlare() {
    const glow = this._radialTex([[0, 'rgba(255,246,224,1)'], [0.2, 'rgba(255,230,180,0.7)'], [0.5, 'rgba(255,210,150,0.15)'], [1, 'rgba(255,200,140,0)']]);
    const ghost = this._radialTex([[0, 'rgba(255,240,220,0.5)'], [0.6, 'rgba(200,220,255,0.12)'], [1, 'rgba(255,255,255,0)']]);
    const lf = new Lensflare();
    lf.addElement(new LensflareElement(glow, 560, 0, new THREE.Color(0xfff2da)));
    lf.addElement(new LensflareElement(ghost, 60, 0.6));
    lf.addElement(new LensflareElement(ghost, 90, 0.75));
    lf.addElement(new LensflareElement(ghost, 130, 0.95));
    const anchor = new THREE.Object3D();
    anchor.add(lf);
    this.scene.add(anchor);
    this._flareAnchor = anchor;
  }

  _clouds() {
    const W = 1024, H = 512;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    let s = 5; const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    for (let i = 0; i < 90; i++) {
      const x = rnd() * W, y = H * (0.2 + rnd() * 0.55), r = 28 + rnd() * 120, a = 0.35 + rnd() * 0.4;
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, `rgba(255,255,255,${a})`);
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd; g.beginPath(); g.ellipse(x, y, r, r * 0.6, 0, 0, 7); g.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.BackSide, fog: false, color: 0xf2f5f8 });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(7000, 32, 20), mat);
    dome.frustumCulled = false;
    this.scene.add(dome);
    this._clouds_ = dome; this._cloudTex = tex;
  }

  _updateEnv() {
    if (this._envRT) this._envRT.dispose();
    const skyScene = new THREE.Scene();
    const sky2 = this.sky.clone();
    sky2.material = this.sky.material;
    skyScene.add(sky2);
    this._envRT = this.pmrem.fromScene(skyScene, 0, 0.1, 1000);
    this.scene.environment = this._envRT.texture;
    this.scene.environmentIntensity = 0.6;
  }

  update(target, dt = 0.016) {
    this.sun.position.copy(target).addScaledVector(this.sunDir, 200);
    this.sun.target.position.copy(target);
    if (this.sky) this.sky.position.copy(target);
    if (this._flareAnchor) this._flareAnchor.position.copy(target).addScaledVector(this.sunDir, 6000);
    if (this._clouds_) {
      this._clouds_.position.set(target.x, 0, target.z);
      const wind = (this._weather.wind || 5) * 0.00015;
      this._cloudTex.offset.x += dt * (0.003 + wind);
      this._cloudTex.offset.y += dt * 0.001;
    }
  }

  dispose() {
    this.scene.environment = null;
    if (this._envRT) this._envRT.dispose();
    this.pmrem.dispose();
    this.scene.remove(this.sky, this.sun, this.sun.target, this.hemi, this.moon);
    if (this._clouds_) this.scene.remove(this._clouds_);
    if (this._flareAnchor) this.scene.remove(this._flareAnchor);
    this.scene.fog = null;
  }
}

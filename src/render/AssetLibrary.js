import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Loads bundled CC0 models (Kenney, https://kenney.nl — public domain) from the
// same origin and instances them efficiently. Everything degrades to procedural
// props if a model fails, so the game always runs.
const BASE = import.meta.env.BASE_URL || './';
export const MODELS = {
  tree: `${BASE}models/kenney/tree.glb`,
  car: `${BASE}models/kenney/car.glb`,
  ferrari: `${BASE}models/ferrari/ferrari.glb`,
};
export const TEXTURES = {
  grassDiff: `${BASE}textures/grass_diff.jpg`,
  grassNor: `${BASE}textures/grass_nor.jpg`,
  grassArm: `${BASE}textures/grass_arm.jpg`,
  asphaltDiff: `${BASE}textures/asphalt_diff.jpg`,
  asphaltNor: `${BASE}textures/asphalt_nor.jpg`,
  dirtDiff: `${BASE}textures/dirt_diff.jpg`,
  dirtNor: `${BASE}textures/dirt_nor.jpg`,
  waterNormals: `${BASE}textures/waternormals.jpg`,
};

// Break obvious texture repetition by modulating the albedo with a large-scale
// noise (in the fragment shader). Cheap way to make tiled ground read natural.
export function deTile(material, { scale = 0.08, amount = 0.4 } = {}) {
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader =
      `float _h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
       float _vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
         return mix(mix(_h(i),_h(i+vec2(1,0)),f.x),mix(_h(i+vec2(0,1)),_h(i+vec2(1,1)),f.x),f.y);}
      ` + shader.fragmentShader.replace(
        '#include <map_fragment>',
        `#include <map_fragment>
         float _m = _vn(vMapUv*${scale.toFixed(3)})*0.65 + _vn(vMapUv*${(scale * 3.1).toFixed(3)})*0.35;
         diffuseColor.rgb *= (1.0 - ${amount.toFixed(3)}) + ${amount.toFixed(3)} * (0.6 + 0.9*_m);`
      );
  };
  material.customProgramCacheKey = () => 'detile' + scale + amount;
  return material;
}

// Worn-asphalt shader: patchy surface wear (like deTile) plus a crumbling,
// noisy edge that fades the asphalt into the dirt shoulder beneath it (via the
// ribbon's across-width uv.x), so the road never has a hard painted edge.
export function roadShade(material, { scale = 0.12, amount = 0.42, edge = 0.11 } = {}) {
  const s1 = scale.toFixed(3), s2 = (scale * 3.1).toFixed(3), a = amount.toFixed(3), e = edge.toFixed(3);
  material.alphaTest = 0.5;
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = 'varying float vRoadU;\n' + shader.vertexShader.replace(
      '#include <uv_vertex>',
      '#include <uv_vertex>\n\tvRoadU = uv.x;',
    );
    shader.fragmentShader =
      `varying float vRoadU;
       float _h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
       float _vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
         return mix(mix(_h(i),_h(i+vec2(1,0)),f.x),mix(_h(i+vec2(0,1)),_h(i+vec2(1,1)),f.x),f.y);}
      ` + shader.fragmentShader.replace(
        '#include <map_fragment>',
        `#include <map_fragment>
         float _m = _vn(vMapUv*${s1})*0.65 + _vn(vMapUv*${s2})*0.35;
         diffuseColor.rgb *= (1.0 - ${a}) + ${a} * (0.5 + 1.0*_m);   // patchy worn asphalt
         float _ed = min(vRoadU, 1.0 - vRoadU);                       // 0 at edges .. 0.5 centre
         float _en = _vn(vMapUv*0.6 + 4.0)*0.55 + _vn(vMapUv*1.7)*0.45;
         diffuseColor.a *= smoothstep(0.0, ${e}, _ed + (_en - 0.5) * ${e} * 1.9);  // crumble into dirt
        `,
      );
  };
  material.customProgramCacheKey = () => 'roadshade' + scale + amount + edge;
  return material;
}

// Load a tiling texture (returns immediately, fills in when decoded).
export function loadTexture(url, { srgb = false, repeat = 1, anisotropy = 8 } = {}) {
  const t = new THREE.TextureLoader().load(url);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = anisotropy;
  return t;
}

class AssetLibrary {
  constructor() {
    this.loader = new GLTFLoader();
    this.cache = new Map();
  }

  _load(url) {
    if (this.cache.has(url)) return this.cache.get(url);
    const p = new Promise((resolve, reject) => this.loader.load(url, resolve, undefined, reject))
      .catch((e) => { this.cache.delete(url); throw e; });
    this.cache.set(url, p);
    return p;
  }

  // normalize to 1 unit tall, base at y=0, centred on x/z; cache the parts.
  async prepared(url) {
    const key = 'prep:' + url;
    if (this.cache.has(key)) return this.cache.get(key);
    const g = await this._load(url);
    const root = g.scene;
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3(); box.getSize(size);
    const s = size.y > 1e-4 ? 1 / size.y : 1;
    const center = new THREE.Matrix4().makeTranslation(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
    const scale = new THREE.Matrix4().makeScale(s, s, s);
    const meshes = [];
    root.traverse((o) => {
      if (!o.isMesh) return;
      const m = o.matrixWorld.clone();
      m.premultiply(center);
      m.premultiply(scale);
      const mat = o.material;
      if (mat) { mat.envMapIntensity = 0.6; }
      meshes.push({ geometry: o.geometry, material: mat, matrix: m });
    });
    const prep = { meshes, size };
    this.cache.set(key, prep);
    return prep;
  }

  // Build instanced meshes for `placements` (Matrix4[]). Returns a Group or null.
  async instances(url, placements) {
    if (!placements.length) return new THREE.Group();
    let prep;
    try { prep = await this.prepared(url); } catch { return null; }
    const group = new THREE.Group();
    const tmp = new THREE.Matrix4();
    for (const part of prep.meshes) {
      const inst = new THREE.InstancedMesh(part.geometry, part.material, placements.length);
      inst.castShadow = true;
      inst.receiveShadow = true;
      for (let i = 0; i < placements.length; i++) {
        tmp.multiplyMatrices(placements[i], part.matrix);
        inst.setMatrixAt(i, tmp);
      }
      inst.instanceMatrix.needsUpdate = true;
      group.add(inst);
    }
    return group;
  }
}

export const assets = new AssetLibrary();

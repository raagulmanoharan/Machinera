import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Loads real CC0 models from free libraries (Poly Haven) at runtime and
// instances them efficiently. Everything degrades to procedural props if a
// model can't be reached, so the game always runs with zero required downloads.
//
// Poly Haven assets are CC0 (public domain). Model data © Poly Haven,
// https://polyhaven.com — served with permissive CORS from dl.polyhaven.org.
const PH = 'https://dl.polyhaven.org/file/ph-assets/Models/gltf/1k';
export const PH_MODELS = {
  pine: `${PH}/pine_tree_01/pine_tree_01_1k.gltf`,
  tree: `${PH}/tree_small_02/tree_small_02_1k.gltf`,
  island_tree: `${PH}/island_tree_01/island_tree_01_1k.gltf`,
  fir: `${PH}/fir_tree_01/fir_tree_01_1k.gltf`,
  lamp: `${PH}/street_lamp_01/street_lamp_01_1k.gltf`,
  boulder: `${PH}/boulder_01/boulder_01_1k.gltf`,
  hydrant: `${PH}/fire_hydrant/fire_hydrant_1k.gltf`,
};

class AssetLibrary {
  constructor() {
    this.loader = new GLTFLoader();
    this.cache = new Map();
    this.timeout = 12000;
  }

  _load(url) {
    if (this.cache.has(url)) return this.cache.get(url);
    const p = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('asset timeout')), this.timeout);
      this.loader.load(url, (g) => { clearTimeout(timer); resolve(g); }, undefined, (e) => { clearTimeout(timer); reject(e); });
    }).catch((e) => { this.cache.delete(url); throw e; });
    this.cache.set(url, p);
    return p;
  }

  // Returns { meshes:[{geometry, material, matrix}], size } normalized so the
  // model base sits at y=0 and it is centred on x/z. Cached per URL.
  async prepared(url) {
    const key = 'prep:' + url;
    if (this.cache.has(key)) return this.cache.get(key);
    const g = await this._load(url);
    const root = g.scene;
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3(); box.getSize(size);
    const offset = new THREE.Vector3(
      -(box.min.x + box.max.x) / 2,
      -box.min.y,
      -(box.min.z + box.max.z) / 2
    );
    // normalize so the model is 1 unit tall with its base at y=0 and centred on x/z;
    // callers then scale by the real height they want (metres).
    const s = size.y > 1e-4 ? 1 / size.y : 1;
    const center = new THREE.Matrix4().makeTranslation(offset.x, offset.y, offset.z);
    const scale = new THREE.Matrix4().makeScale(s, s, s);
    const meshes = [];
    root.traverse((o) => {
      if (!o.isMesh) return;
      const m = o.matrixWorld.clone();
      m.premultiply(center);
      m.premultiply(scale);
      const mat = o.material;
      if (mat) { mat.envMapIntensity = 0.8; mat.shadowSide = THREE.FrontSide; }
      meshes.push({ geometry: o.geometry, material: mat, matrix: m });
    });
    const prep = { meshes, size, aspect: size.x / size.y };
    this.cache.set(key, prep);
    return prep;
  }

  // Build instanced meshes for `placements` (array of Matrix4 world transforms).
  // Returns a THREE.Group, or null if the model can't be loaded.
  async instances(url, placements) {
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

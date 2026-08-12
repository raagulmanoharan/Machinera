import * as THREE from 'three';
import { Tree } from '@dgreenheck/ez-tree';

// Generate a procedural tree from an ez-tree preset (dgreenheck/ez-tree, MIT)
// and return unit-height geometry + materials ready to instance across the
// world: { barkGeo, barkMat, leafGeo, leafMat }. Bark and leaves are separate
// meshes so each becomes its own InstancedMesh sharing the same transforms.
export function makeEzTree(preset = 'Oak Medium', seed = 1) {
  const tree = new Tree();
  tree.loadPreset(preset);
  try { tree.options.seed = seed; } catch { /* preset may lock the seed */ }
  tree.generate();

  const barkGeo = tree.branchesMesh.geometry.clone();
  const leafGeo = tree.leavesMesh.geometry.clone();
  const barkMat = tree.branchesMesh.material;
  const leafMat = tree.leavesMesh.material;

  // normalize to unit height with the trunk base at y = 0
  barkGeo.computeBoundingBox();
  leafGeo.computeBoundingBox();
  const bb = barkGeo.boundingBox.clone().union(leafGeo.boundingBox);
  const h = (bb.max.y - bb.min.y) || 1;
  const norm = new THREE.Matrix4().makeScale(1 / h, 1 / h, 1 / h)
    .multiply(new THREE.Matrix4().makeTranslation(0, -bb.min.y, 0));
  barkGeo.applyMatrix4(norm);
  leafGeo.applyMatrix4(norm);

  // sit well under image-based lighting; cutout leaves so thousands stay cheap
  barkMat.envMapIntensity = 1.0;
  leafMat.envMapIntensity = 1.0;
  leafMat.alphaTest = Math.max(leafMat.alphaTest || 0, 0.4);
  leafMat.transparent = false;
  leafMat.depthWrite = true;
  leafMat.side = THREE.DoubleSide;

  return { barkGeo, barkMat, leafGeo, leafMat };
}

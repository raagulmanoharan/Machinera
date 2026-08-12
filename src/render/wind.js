// Shared wind phase, advanced once per frame; injected into foliage materials
// so tree canopies sway. Instanced geometry is unit-height, so transformed.y
// (0..1) weights the sway toward the top.
export const wind = { value: 0 };

export function advanceWind(dt) { wind.value += (dt || 0.016) * 1.3; }

export function applyWind(material, amp = 0.06) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWind = wind;
    shader.uniforms.uWindAmp = { value: amp };
    shader.vertexShader =
      'uniform float uWind;\nuniform float uWindAmp;\n' +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         float w = uWind + transformed.x * 0.6 + transformed.z * 0.6;
         float sway = (sin(w) + 0.4 * sin(w * 2.3 + 1.1)) * uWindAmp * transformed.y;
         transformed.x += sway;
         transformed.z += sway * 0.5;`
      );
  };
  material.customProgramCacheKey = () => 'wind' + amp;
  return material;
}

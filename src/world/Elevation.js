import * as THREE from 'three';

// Real-world elevation from free, open Terrarium tiles (AWS open data, CORS-enabled,
// no key). Elevation is decoded as (R*256 + G + B/256) - 32768 metres.
// https://registry.opendata.aws/terrain-tiles/
const TILE = 256;
const ENDPOINTS = [
  'https://s3.amazonaws.com/elevation-tiles-prod/terrarium',
  'https://elevation-tiles-prod.s3.amazonaws.com/terrarium',
];

function lon2tile(lon, z) { return ((lon + 180) / 360) * Math.pow(2, z); }
function lat2tile(lat, z) {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.asinh(Math.tan(r)) / Math.PI) / 2) * Math.pow(2, z);
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('tile load failed'));
    img.src = url;
  });
}

// Returns a sampler with sample(lat,lng) -> metres, or null if unavailable.
export async function loadElevation(lat0, lng0, radius, zoom = 14) {
  const mPerLat = 111320;
  const mPerLng = 111320 * Math.cos((lat0 * Math.PI) / 180);
  const dLat = radius / mPerLat, dLng = radius / mPerLng;

  const tx0 = Math.floor(lon2tile(lng0 - dLng, zoom));
  const tx1 = Math.floor(lon2tile(lng0 + dLng, zoom));
  const ty0 = Math.floor(lat2tile(lat0 + dLat, zoom)); // north = smaller y
  const ty1 = Math.floor(lat2tile(lat0 - dLat, zoom));

  const cols = tx1 - tx0 + 1, rows = ty1 - ty0 + 1;
  if (cols < 1 || rows < 1 || cols * rows > 16) return null;

  const canvas = document.createElement('canvas');
  canvas.width = cols * TILE;
  canvas.height = rows * TILE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  let loaded = 0;
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      let img = null;
      for (const base of ENDPOINTS) {
        try { img = await loadImage(`${base}/${zoom}/${tx}/${ty}.png`); break; } catch { /* next */ }
      }
      if (!img) continue;
      ctx.drawImage(img, (tx - tx0) * TILE, (ty - ty0) * TILE);
      loaded++;
    }
  }
  if (!loaded) return null;

  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const W = canvas.width, H = canvas.height;
  const elevAt = (px, py) => {
    const i = (py * W + px) * 4;
    return data[i] * 256 + data[i + 1] + data[i + 2] / 256 - 32768;
  };

  const n = Math.pow(2, zoom);
  const sample = (lat, lng) => {
    const gx = (lon2tile(lng, zoom) - tx0) * TILE;
    const gy = (lat2tile(lat, zoom) - ty0) * TILE;
    const x0 = Math.max(0, Math.min(W - 2, Math.floor(gx)));
    const y0 = Math.max(0, Math.min(H - 2, Math.floor(gy)));
    const fx = Math.max(0, Math.min(1, gx - x0));
    const fy = Math.max(0, Math.min(1, gy - y0));
    const a = elevAt(x0, y0), b = elevAt(x0 + 1, y0);
    const c = elevAt(x0, y0 + 1), d = elevAt(x0 + 1, y0 + 1);
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
  };

  const base = sample(lat0, lng0);
  return {
    base,
    // elevation relative to the start point (so the car starts near y=0)
    sample: (lat, lng) => sample(lat, lng) - base,
  };
}

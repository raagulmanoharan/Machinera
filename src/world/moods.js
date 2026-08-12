// A vocabulary of liminal "moods" the world drifts between as you drive —
// familiar-but-unsettling atmospheres. Each retunes fog, light, exposure, the
// colour grade, the meadow and the street lamps. Heavy fog lets a mood's colour
// dominate the (fixed HDR) sky, so each reads as its own liminal place.
//
// fog:  [colorHex, near, far]     grade: [r,g,b] cast + night 0..1
// sun:  [colorHex, intensity]     hemi:  [colorHex, intensity]
// env:  HDR sky/reflection intensity   exposure: tone-map exposure
// lamps: street-lamp glow 0..1    headlights: car headlights 0..1
// grass: { tint, h }  (tint multiplies blade colour, h scales height)

export const MOODS = [
  {
    name: 'Amber Dusk',
    fog: [0xd8c6a6, 550, 3600], exposure: 0.95, env: 1.0, rays: 0.5,
    sun: [0xffe6bf, 2.4], hemi: [0xcfe0ff, 0.35],
    grade: [1.0, 1.0, 1.0], night: 0.0, lamps: 0.0, headlights: 0.0,
    grass: { tint: 0xffffff, h: 1.0 },
  },
  {
    name: 'Fog Night',
    fog: [0x0d141d, 8, 120], exposure: 0.6, env: 0.12, rays: 0,
    sun: [0x2b3b52, 0.12], hemi: [0x18202e, 0.22],
    grade: [0.9, 0.97, 1.12], night: 0.9, lamps: 1.0, headlights: 1.0,
    grass: { tint: 0x4a5a68, h: 0.5 },
  },
  {
    name: 'Blue Hour',
    fog: [0x1b2a3c, 40, 620], exposure: 0.72, env: 0.55, rays: 0.5,
    sun: [0x6f8cb8, 0.5], hemi: [0x39496a, 0.42],
    grade: [0.84, 0.95, 1.16], night: 0.5, lamps: 0.45, headlights: 0.6,
    grass: { tint: 0x6f918d, h: 1.0 },
  },
  {
    name: 'White Mist',
    fog: [0xd9dee1, 10, 150], exposure: 1.06, env: 0.9, rays: 0.6,
    sun: [0xffffff, 0.55], hemi: [0xe2e8ec, 0.75],
    grade: [1.0, 1.0, 1.02], night: 0.0, lamps: 0.0, headlights: 0.3,
    grass: { tint: 0xcdd5c2, h: 1.1 },
  },
  {
    name: 'Overgrown',
    fog: [0x8aa15c, 30, 480], exposure: 0.9, env: 0.75, rays: 0.6,
    sun: [0xe4f2b4, 1.5], hemi: [0x86a86e, 0.5],
    grade: [0.95, 1.12, 0.84], night: 0.0, lamps: 0.0, headlights: 0.0,
    grass: { tint: 0x9fd062, h: 1.5 },
  },
  {
    name: 'Barren Dust',
    fog: [0x8c7a5c, 22, 380], exposure: 0.85, env: 0.7, rays: 0.7,
    sun: [0xdcb587, 1.15], hemi: [0x6a5a44, 0.35],
    grade: [1.1, 1.0, 0.82], night: 0.05, lamps: 0.1, headlights: 0.15,
    grass: { tint: 0x9a8a60, h: 0.22 },
  },
];

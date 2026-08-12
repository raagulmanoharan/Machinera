// A vocabulary of dark, gloomy liminal "moods" the world drifts between as you
// drive — barren, foggy, a little wrong. Each retunes fog, light, exposure, the
// colour grade and the street lamps. Heavy fog lets a mood's colour dominate the
// (fixed HDR) sky, so each reads as its own gloomy place.
//
// fog:  [colorHex, near, far]     grade: [r,g,b] cast + night 0..1
// sun:  [colorHex, intensity]     hemi:  [colorHex, intensity]
// env:  HDR sky/reflection intensity   exposure: tone-map exposure
// lamps: street-lamp glow 0..1    headlights: car headlights 0..1

export const MOODS = [
  {
    name: 'Grey Gloom',
    fog: [0x2a2e33, 35, 280], exposure: 0.6, env: 0.4,
    sky: 0x34393f,
    sun: [0x6b6f76, 0.6], hemi: [0x2d3138, 0.4],
    grade: [0.95, 0.97, 1.0], night: 0.3, lamps: 0.35, headlights: 0.5,
  },
  {
    name: 'Fog Night',
    fog: [0x141e30, 10, 150], exposure: 0.74, env: 0.55,
    sky: 0x0c1220,
    sun: [0x4a648c, 0.4], hemi: [0x3a5170, 0.9],
    grade: [0.9, 0.97, 1.12], night: 0.9, lamps: 1.0, headlights: 1.0,
  },
  {
    name: 'Blue Dusk',
    fog: [0x131b27, 25, 300], exposure: 0.6, env: 0.3,
    sky: 0x161d29,
    sun: [0x49607f, 0.4], hemi: [0x27313f, 0.35],
    grade: [0.85, 0.94, 1.14], night: 0.6, lamps: 0.6, headlights: 0.75,
  },
  {
    name: 'Ash Mist',
    fog: [0x8f9498, 12, 150], exposure: 0.82, env: 0.5,
    sky: 0x9ea2a6,
    sun: [0xaab0b4, 0.5], hemi: [0x86898d, 0.5],
    grade: [0.97, 0.98, 0.99], night: 0.12, lamps: 0.2, headlights: 0.4,
  },
  {
    name: 'Dead Fields',
    fog: [0x2a2d26, 28, 300], exposure: 0.6, env: 0.35,
    sky: 0x2b2e27,
    sun: [0x6f7360, 0.7], hemi: [0x2c3026, 0.4],
    grade: [0.98, 1.0, 0.9], night: 0.32, lamps: 0.35, headlights: 0.55,
  },
  {
    name: 'Barren Dust',
    fog: [0x2f2a1e, 24, 260], exposure: 0.62, env: 0.32,
    sky: 0x322d21,
    sun: [0x897953, 0.7], hemi: [0x2c281e, 0.35],
    grade: [1.05, 1.0, 0.88], night: 0.25, lamps: 0.35, headlights: 0.5,
  },
];

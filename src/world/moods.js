// A vocabulary of dark, gloomy, misty liminal "moods" the world drifts between
// — barren winter dusk, foggy nights, cold blue hours. Each retunes exponential
// fog (colour + density), light, exposure, the colour grade and the street
// lamps. Dense fog + a dark HDR sky keep it moody and mysterious.
//
// fog:  [colorHex, density]        grade: [r,g,b] cast + night 0..1
// sun:  [colorHex, intensity]      hemi:  [colorHex, intensity]
// env:  HDR reflection/sky intensity   exposure: tone-map exposure
// lamps: street-lamp glow 0..1     headlights: car headlights 0..1

export const MOODS = [
  {
    name: 'Winter Dusk',
    fog: [0xaeb9c6, 0.011], exposure: 0.95, env: 0.75,
    sun: [0x9fb0c4, 0.7], hemi: [0x8fa0b4, 0.7],
    grade: [0.96, 0.99, 1.06], night: 0.12, lamps: 0.3, headlights: 0.45,
  },
  {
    name: 'Fog Night',
    fog: [0x141e30, 0.03], exposure: 0.74, env: 0.55,
    sun: [0x4a648c, 0.4], hemi: [0x3a5170, 0.9],
    grade: [0.9, 0.97, 1.12], night: 0.9, lamps: 1.0, headlights: 1.0,
  },
  {
    name: 'Blue Dusk',
    fog: [0x1b2636, 0.014], exposure: 0.7, env: 0.45,
    sun: [0x5a76a0, 0.5], hemi: [0x33465f, 0.6],
    grade: [0.85, 0.94, 1.14], night: 0.6, lamps: 0.6, headlights: 0.75,
  },
  {
    name: 'Ash Mist',
    fog: [0x9ba0a4, 0.022], exposure: 0.86, env: 0.55,
    sun: [0xaab0b4, 0.55], hemi: [0x8a8e92, 0.6],
    grade: [0.97, 0.98, 0.99], night: 0.12, lamps: 0.25, headlights: 0.4,
  },
  {
    name: 'Dead Fields',
    fog: [0x2c2f28, 0.013], exposure: 0.66, env: 0.4,
    sun: [0x77795f, 0.7], hemi: [0x33372b, 0.5],
    grade: [0.98, 1.0, 0.9], night: 0.3, lamps: 0.35, headlights: 0.55,
  },
  {
    name: 'Barren Dust',
    fog: [0x38321f, 0.015], exposure: 0.68, env: 0.38,
    sun: [0x928050, 0.7], hemi: [0x35301f, 0.45],
    grade: [1.05, 1.0, 0.86], night: 0.25, lamps: 0.35, headlights: 0.5,
  },
];

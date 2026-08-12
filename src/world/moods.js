// A vocabulary of dark, gloomy, subtle liminal "moods" the world drifts between
// — cold winter dusk, deep blue nights, ashen overcast. Each retunes exponential
// fog (colour + density), the gradient sky (sun elevation / turbidity), light,
// exposure and the colour grade. Kept dark and low-key — not washed out.
//
// fog:  [colorHex, density]        grade: [r,g,b] cast + night 0..1
// sun:  [colorHex, intensity]      hemi:  [colorHex, intensity]
// env:  sky reflection/IBL intensity   exposure: tone-map exposure
// sky:  skyElev (deg), skyTurb, skyRayl   |   lamps/headlights: 0..1

export const MOODS = [
  {
    name: 'Winter Dusk',
    fog: [0x4a545f, 0.014], exposure: 0.58, env: 0.42,
    skyElev: 1.5, skyTurb: 4, skyRayl: 2.4,
    sun: [0x7e8b9a, 0.5], hemi: [0x353d47, 0.5],
    grade: [0.93, 0.96, 1.03], night: 0.25, lamps: 0.0, headlights: 0.5,
  },
  {
    name: 'Deep Night',
    fog: [0x0c131f, 0.03], exposure: 0.5, env: 0.28,
    skyElev: -4, skyTurb: 3, skyRayl: 1.1,
    sun: [0x33465f, 0.25], hemi: [0x181f2c, 0.55],
    grade: [0.9, 0.96, 1.12], night: 0.92, lamps: 0.0, headlights: 1.0,
  },
  {
    name: 'Blue Dusk',
    fog: [0x18222f, 0.016], exposure: 0.56, env: 0.34,
    skyElev: -1, skyTurb: 4, skyRayl: 2.6,
    sun: [0x44597a, 0.4], hemi: [0x232f40, 0.55],
    grade: [0.85, 0.94, 1.13], night: 0.6, lamps: 0.0, headlights: 0.8,
  },
  {
    name: 'Ashen Overcast',
    fog: [0x565a5e, 0.02], exposure: 0.6, env: 0.4,
    skyElev: 4, skyTurb: 9, skyRayl: 1.6,
    sun: [0x8b8f93, 0.5], hemi: [0x44484c, 0.55],
    grade: [0.96, 0.97, 0.98], night: 0.2, lamps: 0.0, headlights: 0.5,
  },
  {
    name: 'Dead Fields',
    fog: [0x2a2d26, 0.014], exposure: 0.56, env: 0.32,
    skyElev: 2, skyTurb: 6, skyRayl: 2.0,
    sun: [0x6d7060, 0.55], hemi: [0x2c3026, 0.5],
    grade: [0.97, 1.0, 0.9], night: 0.35, lamps: 0.0, headlights: 0.6,
  },
  {
    name: 'Barren Dust',
    fog: [0x36301f, 0.016], exposure: 0.58, env: 0.3,
    skyElev: 2, skyTurb: 10, skyRayl: 1.6,
    sun: [0x87764e, 0.55], hemi: [0x2f2a1d, 0.45],
    grade: [1.04, 1.0, 0.86], night: 0.3, lamps: 0.0, headlights: 0.55,
  },
];

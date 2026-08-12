// Dark, gloomy, low-key liminal moods. The sun sits at or below the horizon so
// the sky stays a dim dusk gradient; a raised hemisphere fill (a desaturated
// grey-blue, not a near-black saturated tint) subtly reveals the terrain and
// road without touching the sky dome — so the ground reads while the sky stays
// gloomy. Fog is kept light enough that the near road isn't swallowed but the
// far mountains still fade to silhouettes.
//
// fog:  [colorHex, density]        grade: [r,g,b] cast + night 0..1
// sun:  [colorHex, intensity]      hemi:  [colorHex, intensity]
// env:  sky reflection/IBL intensity   exposure: tone-map exposure
// sky:  skyElev (deg), skyTurb, skyRayl   |   lamps/headlights: 0..1

export const MOODS = [
  {
    name: 'Winter Dusk',
    fog: [0x161b22, 0.009], exposure: 0.6, env: 0.4,
    skyElev: -3, skyTurb: 3, skyRayl: 2.0,
    sun: [0x5a6675, 0.35], hemi: [0x8a94a2, 2.2],
    grade: [0.93, 0.96, 1.03], night: 0.45, lamps: 0.0, headlights: 0.6,
  },
  {
    name: 'Deep Night',
    fog: [0x070b12, 0.013], exposure: 0.52, env: 0.26,
    skyElev: -9, skyTurb: 2, skyRayl: 0.9,
    sun: [0x28374d, 0.18], hemi: [0x646f82, 1.9],
    grade: [0.9, 0.96, 1.12], night: 0.95, lamps: 0.0, headlights: 1.0,
  },
  {
    name: 'Blue Dusk',
    fog: [0x0f1622, 0.010], exposure: 0.56, env: 0.34,
    skyElev: -5, skyTurb: 3, skyRayl: 2.4,
    sun: [0x3a4d6c, 0.34], hemi: [0x78879b, 2.1],
    grade: [0.85, 0.94, 1.13], night: 0.7, lamps: 0.0, headlights: 0.9,
  },
  {
    name: 'Ashen Overcast',
    fog: [0x272b2f, 0.009], exposure: 0.6, env: 0.4,
    skyElev: 0, skyTurb: 7, skyRayl: 1.6,
    sun: [0x777b7f, 0.48], hemi: [0x8f96a0, 2.2],
    grade: [0.96, 0.97, 0.98], night: 0.3, lamps: 0.0, headlights: 0.6,
  },
  {
    name: 'Dead Fields',
    fog: [0x1a1d16, 0.010], exposure: 0.58, env: 0.34,
    skyElev: -2, skyTurb: 5, skyRayl: 1.9,
    sun: [0x5f6252, 0.48], hemi: [0x878d76, 2.0],
    grade: [0.97, 1.0, 0.9], night: 0.45, lamps: 0.0, headlights: 0.7,
  },
  {
    name: 'Barren Dust',
    fog: [0x201b11, 0.010], exposure: 0.58, env: 0.32,
    skyElev: -2, skyTurb: 9, skyRayl: 1.5,
    sun: [0x7a6a44, 0.48], hemi: [0x968b76, 2.0],
    grade: [1.04, 1.0, 0.86], night: 0.4, lamps: 0.0, headlights: 0.65,
  },
];

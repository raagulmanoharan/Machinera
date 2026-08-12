// Dark, gloomy, low-key liminal moods. The sun sits at or below the horizon so
// the sky stays a dim dusk gradient; a raised hemisphere fill (a desaturated
// grey-blue, not a near-black saturated tint) subtly reveals the terrain and
// road without touching the sky dome — so the ground reads while the sky stays
// gloomy. Fog is kept light enough that the near road isn't swallowed but the
// far mountains still fade to silhouettes.
//
// fog:  [colorHex, density]        grade: [r,g,b] cast + night 0..1
// sun:  [colorHex, intensity]      hemi:  [colorHex, intensity]
// moon: [colorHex, intensity]      a cool directional fill (shapes the ground,
//                                  not the sky) — the moonlight
// env:  sky reflection/IBL intensity   exposure: tone-map exposure
// sky:  skyElev (deg), skyTurb, skyRayl   |   lamps/headlights: 0..1

export const MOODS = [
  {
    name: 'Winter Dusk',
    fog: [0x101620, 0.009], exposure: 0.68, env: 0.42,
    skyElev: -3, skyTurb: 3, skyRayl: 1.8,
    sun: [0x5a6675, 0.4], hemi: [0x9aa4b4, 3.4], moon: [0x9fb4d8, 1.2],
    grade: [0.93, 0.96, 1.03], night: 0.4, lamps: 0.0, headlights: 0.6,
  },
  {
    name: 'Deep Night',
    fog: [0x090d16, 0.012], exposure: 0.62, env: 0.3,
    skyElev: -8, skyTurb: 2, skyRayl: 0.9,
    sun: [0x28374d, 0.2], hemi: [0x6b7690, 3.1], moon: [0x9ab2dc, 1.6],
    grade: [0.9, 0.96, 1.12], night: 0.8, lamps: 0.0, headlights: 1.0,
  },
  {
    name: 'Blue Dusk',
    fog: [0x0e1524, 0.010], exposure: 0.66, env: 0.36,
    skyElev: -5, skyTurb: 3, skyRayl: 2.2,
    sun: [0x3a4d6c, 0.38], hemi: [0x8797ad, 3.3], moon: [0x93abd4, 1.3],
    grade: [0.85, 0.94, 1.13], night: 0.65, lamps: 0.0, headlights: 0.9,
  },
  {
    name: 'Ashen Overcast',
    fog: [0x20242a, 0.010], exposure: 0.68, env: 0.42,
    skyElev: -1, skyTurb: 7, skyRayl: 1.5,
    sun: [0x777b7f, 0.52], hemi: [0xa3aab6, 3.5], moon: [0xb2b8c4, 0.85],
    grade: [0.96, 0.97, 0.98], night: 0.28, lamps: 0.0, headlights: 0.6,
  },
  {
    name: 'Dead Fields',
    fog: [0x161a10, 0.010], exposure: 0.66, env: 0.36,
    skyElev: -2, skyTurb: 5, skyRayl: 1.7,
    sun: [0x5f6252, 0.52], hemi: [0x97a084, 3.2], moon: [0xa6b2b8, 1.0],
    grade: [0.97, 1.0, 0.9], night: 0.4, lamps: 0.0, headlights: 0.7,
  },
  {
    name: 'Barren Dust',
    fog: [0x1c160e, 0.010], exposure: 0.66, env: 0.34,
    skyElev: -2, skyTurb: 9, skyRayl: 1.5,
    sun: [0x7a6a44, 0.52], hemi: [0xa89b82, 3.2], moon: [0xc0bba8, 1.0],
    grade: [1.04, 1.0, 0.86], night: 0.38, lamps: 0.0, headlights: 0.65,
  },
];

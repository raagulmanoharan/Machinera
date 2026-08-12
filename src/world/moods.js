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
    fog: [0x0c1017, 0.010], exposure: 0.46, env: 0.3,
    skyElev: -5, skyTurb: 3, skyRayl: 1.6,
    sun: [0x5a6675, 0.32], hemi: [0x8f99a8, 2.8],
    grade: [0.93, 0.96, 1.03], night: 0.5, lamps: 0.0, headlights: 0.6,
  },
  {
    name: 'Deep Night',
    fog: [0x05080e, 0.014], exposure: 0.4, env: 0.2,
    skyElev: -11, skyTurb: 2, skyRayl: 0.7,
    sun: [0x28374d, 0.16], hemi: [0x5c6678, 2.5],
    grade: [0.9, 0.96, 1.12], night: 0.97, lamps: 0.0, headlights: 1.0,
  },
  {
    name: 'Blue Dusk',
    fog: [0x0a0f1a, 0.011], exposure: 0.44, env: 0.26,
    skyElev: -7, skyTurb: 3, skyRayl: 2.0,
    sun: [0x3a4d6c, 0.3], hemi: [0x7a8aa0, 2.7],
    grade: [0.85, 0.94, 1.13], night: 0.75, lamps: 0.0, headlights: 0.9,
  },
  {
    name: 'Ashen Overcast',
    fog: [0x181b1e, 0.011], exposure: 0.47, env: 0.3,
    skyElev: -3, skyTurb: 7, skyRayl: 1.3,
    sun: [0x777b7f, 0.44], hemi: [0x969ca6, 2.9],
    grade: [0.96, 0.97, 0.98], night: 0.35, lamps: 0.0, headlights: 0.6,
  },
  {
    name: 'Dead Fields',
    fog: [0x111309, 0.011], exposure: 0.46, env: 0.26,
    skyElev: -4, skyTurb: 5, skyRayl: 1.5,
    sun: [0x5f6252, 0.44], hemi: [0x8b917a, 2.6],
    grade: [0.97, 1.0, 0.9], night: 0.5, lamps: 0.0, headlights: 0.7,
  },
  {
    name: 'Barren Dust',
    fog: [0x14100a, 0.011], exposure: 0.46, env: 0.26,
    skyElev: -4, skyTurb: 9, skyRayl: 1.3,
    sun: [0x7a6a44, 0.44], hemi: [0x9a8f78, 2.6],
    grade: [1.04, 1.0, 0.86], night: 0.45, lamps: 0.0, headlights: 0.65,
  },
];

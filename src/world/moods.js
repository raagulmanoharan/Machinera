// Dark, foggy liminal moods with dense haze. The scene stays DARK — the sun
// sits below the horizon so the sky is a dim dusk, exposure is low and lifted
// only a little so the smog is just perceptible (not a bright wash). The fog is
// dense but DARK-tinted, so the terrain loses visibility into gloomy haze
// rather than bright white "snow caps". A cool moonlight + hemisphere fill keep
// the road and near ground subtly readable.
//
// fog:  [colorHex, density]        grade: [r,g,b] cast + night 0..1
// sun:  [colorHex, intensity]      hemi:  [colorHex, intensity]
// moon: [colorHex, intensity]      a soft directional fill (shapes the ground)
// env:  sky reflection/IBL intensity   exposure: tone-map exposure
// sky:  skyElev (deg), skyTurb, skyRayl   |   lamps/headlights: 0..1

export const MOODS = [
  {
    name: 'Winter Dusk',
    fog: [0x28303b, 0.022], exposure: 0.66, env: 0.34,
    skyElev: -3, skyTurb: 6, skyRayl: 1.6,
    sun: [0x5a6675, 0.4], hemi: [0x8f99a8, 2.8], moon: [0x9fb4d8, 0.85],
    grade: [0.93, 0.96, 1.03], night: 0.42, lamps: 0.85, headlights: 0.6,
    sunset: [0xff9a55, 0.55],
  },
  {
    name: 'Deep Night',
    fog: [0x1a222d, 0.024], exposure: 0.6, env: 0.26,
    skyElev: -8, skyTurb: 4, skyRayl: 1.0,
    sun: [0x28374d, 0.2], hemi: [0x6f7a8e, 2.6], moon: [0x9ab2dc, 1.15],
    grade: [0.9, 0.96, 1.12], night: 0.7, lamps: 1.0, headlights: 1.0,
    sunset: [0xff8348, 0.34],
  },
  {
    name: 'Blue Dusk',
    fog: [0x1f2d3c, 0.024], exposure: 0.62, env: 0.32,
    skyElev: -5, skyTurb: 5, skyRayl: 2.0,
    sun: [0x3a4d6c, 0.36], hemi: [0x8493a8, 2.7], moon: [0x93abd4, 0.95],
    grade: [0.85, 0.94, 1.13], night: 0.56, lamps: 0.95, headlights: 0.9,
    sunset: [0xff9a5a, 0.6],
  },
  {
    name: 'Ashen Overcast',
    fog: [0x33373d, 0.023], exposure: 0.68, env: 0.36,
    skyElev: -1, skyTurb: 7, skyRayl: 1.4,
    sun: [0x777b7f, 0.5], hemi: [0x9aa1ab, 2.9], moon: [0xb2b8c4, 0.6],
    grade: [0.96, 0.97, 0.98], night: 0.28, lamps: 0.7, headlights: 0.6,
    sunset: [0xdcae82, 0.34],
  },
  {
    name: 'Dead Fields',
    fog: [0x2a2c1f, 0.023], exposure: 0.65, env: 0.32,
    skyElev: -2, skyTurb: 5, skyRayl: 1.6,
    sun: [0x5f6252, 0.5], hemi: [0x8d9479, 2.7], moon: [0xa6b2b8, 0.8],
    grade: [0.97, 1.0, 0.9], night: 0.4, lamps: 0.7, headlights: 0.7,
    sunset: [0xffab5c, 0.5],
  },
  {
    name: 'Barren Dust',
    fog: [0x30291d, 0.023], exposure: 0.65, env: 0.32,
    skyElev: -2, skyTurb: 8, skyRayl: 1.4,
    sun: [0x7a6a44, 0.5], hemi: [0xa2977e, 2.7], moon: [0xc0bba8, 0.8],
    grade: [1.04, 1.0, 0.86], night: 0.38, lamps: 0.6, headlights: 0.65,
    sunset: [0xffb463, 0.55],
  },
];

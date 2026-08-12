// Bright, dense-smog liminal moods. Thick haze swallows the distance so the
// road dissolves into a glowing wall of smog — unsettling and nostalgic. The
// scene is lifted bright (hazy daylight/dusk, not night): the sun sits above
// the horizon behind high turbidity for a flat luminous sky, a strong
// hemisphere fill lights the ground, and the fog colour is a bright,
// desaturated smog tint that varies per mood (cool, ashen, sickly, dusty).
//
// fog:  [colorHex, density]        grade: [r,g,b] cast + night 0..1
// sun:  [colorHex, intensity]      hemi:  [colorHex, intensity]
// moon: [colorHex, intensity]      a soft directional fill (shapes the ground)
// env:  sky reflection/IBL intensity   exposure: tone-map exposure
// sky:  skyElev (deg), skyTurb, skyRayl   |   lamps/headlights: 0..1

export const MOODS = [
  {
    name: 'Winter Dusk',
    fog: [0xbcc6d2, 0.019], exposure: 0.92, env: 0.6,
    skyElev: 5, skyTurb: 9, skyRayl: 1.4,
    sun: [0xccd6e2, 0.7], hemi: [0xb2bcc8, 2.6], moon: [0xaebfd8, 0.3],
    grade: [0.96, 0.98, 1.04], night: 0.12, lamps: 0.0, headlights: 0.4,
  },
  {
    name: 'Deep Night',
    fog: [0x818994, 0.024], exposure: 0.8, env: 0.44,
    skyElev: 1, skyTurb: 8, skyRayl: 1.2,
    sun: [0x9aa4b6, 0.44], hemi: [0x8b95a6, 2.7], moon: [0x9fb2d4, 0.6],
    grade: [0.9, 0.96, 1.1], night: 0.4, lamps: 0.0, headlights: 0.75,
  },
  {
    name: 'Blue Dusk',
    fog: [0xabb7c9, 0.020], exposure: 0.9, env: 0.56,
    skyElev: 3, skyTurb: 8, skyRayl: 2.0,
    sun: [0xb9c7df, 0.62], hemi: [0xa4b1c6, 2.7], moon: [0x9fb4d8, 0.35],
    grade: [0.9, 0.95, 1.1], night: 0.2, lamps: 0.0, headlights: 0.5,
  },
  {
    name: 'Ashen Overcast',
    fog: [0xc4c6c8, 0.021], exposure: 0.96, env: 0.6,
    skyElev: 7, skyTurb: 10, skyRayl: 1.0,
    sun: [0xd0d3d6, 0.66], hemi: [0xc2c6ca, 2.9], moon: [0xc6cace, 0.25],
    grade: [0.99, 0.99, 1.0], night: 0.08, lamps: 0.0, headlights: 0.4,
  },
  {
    name: 'Dead Fields',
    fog: [0xb4b9a4, 0.020], exposure: 0.9, env: 0.52,
    skyElev: 4, skyTurb: 9, skyRayl: 1.3,
    sun: [0xc6c8ae, 0.64], hemi: [0xb0b59c, 2.7], moon: [0xb2bcae, 0.3],
    grade: [0.98, 1.0, 0.92], night: 0.12, lamps: 0.0, headlights: 0.5,
  },
  {
    name: 'Barren Dust',
    fog: [0xc2b59c, 0.020], exposure: 0.9, env: 0.5,
    skyElev: 4, skyTurb: 11, skyRayl: 1.2,
    sun: [0xd8cbaa, 0.64], hemi: [0xc2b49a, 2.7], moon: [0xccc4b0, 0.3],
    grade: [1.05, 1.0, 0.88], night: 0.12, lamps: 0.0, headlights: 0.5,
  },
];

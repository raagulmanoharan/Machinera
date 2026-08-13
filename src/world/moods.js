// Enclosed foggy tunnel: warm sodium light filling dense haze. There's no open
// sky or terrain — the atmosphere is a single, fixed warm-fog mood, lit by the
// wall lamps and a warm ambient fill.
//
// fog:  [colorHex, density]        grade: [r,g,b] cast + night 0..1
// sun:  [colorHex, intensity]      hemi:  [colorHex, intensity]
// moon: [colorHex, intensity]      env:   sky reflection/IBL intensity
// sunset: [colorHex, amount]       sky:   skyElev/skyTurb/skyRayl (mostly hidden)

export const MOODS = [
  {
    name: 'Tunnel',
    fog: [0x7a4a22, 0.048], exposure: 1.12, env: 0.12,
    skyElev: -8, skyTurb: 8, skyRayl: 1.0,
    sun: [0x1a1206, 0.1], hemi: [0xb0702e, 4.6], moon: [0x8a5a30, 0.7],
    grade: [1.08, 0.99, 0.85], night: 0.4, lamps: 1.0, headlights: 1.0,
    sunset: [0x000000, 0.0],
  },
];

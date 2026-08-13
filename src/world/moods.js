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
    // A warm sodium-lit fog tunnel (the reference): a luminous amber haze with
    // real depth — near is clear, the distance dissolves into glowing amber.
    // Lit like three.js' ocean demo: a warm low-sun sky baked to a PMREM
    // environment (soft IBL) under controlled ACES exposure, plus a moderate
    // warm ambient and the sodium lamps as the glowing accents. Moderate fog
    // density is what keeps the depth — dense fog flattens it into a wall.
    fog: [0x4e2f18, 0.03], exposure: 0.95, env: 0.45,
    skyElev: 2, skyTurb: 10, skyRayl: 2,
    sun: [0x2a1c0c, 0.06], hemi: [0x9a5626, 2.0], moon: [0x7a4a24, 0.5],
    grade: [1.07, 0.99, 0.86], night: 0.2, lamps: 1.0, headlights: 1.0,
    sunset: [0xff7a2a, 0.85],
  },
];

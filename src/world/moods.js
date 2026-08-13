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
    // A warm sodium-lit tunnel. Fog density is the critical dial: thin enough
    // that the walls, ribs and the receding lamp row stay legible for a long
    // way (so the tunnel's length and curve read, and lit surfaces hold
    // contrast against the haze), while still stacking into a warm amber glow
    // in the far distance. Dense fog flattens all of that into a featureless
    // wash. Lit like three.js' ocean demo — a warm low-sun sky baked to a PMREM
    // environment under controlled ACES exposure, not an ambient flood.
    fog: [0x3a2110, 0.011], exposure: 1.0, env: 0.62,
    skyElev: 2, skyTurb: 10, skyRayl: 2,
    // ambient has to carry the walls between the sparse lamps — without it the
    // bore goes pitch black a few metres past each fixture
    sun: [0x2a1c0c, 0.06], hemi: [0x9a5626, 3.6], moon: [0x7a4a24, 0.7],
    grade: [1.07, 0.99, 0.86], night: 0.12, lamps: 1.0, headlights: 1.0,
    sunset: [0xff7a2a, 0.85],
  },
];

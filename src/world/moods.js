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
    // dark, gloomy tube: near-black warm fog so the distance falls into shadow
    // (real depth), a low warm ambient so the walls aren't flooded flat, and the
    // lamps + their volumetric scatter carry the light — pools glowing in the dark.
    fog: [0x140b04, 0.05], exposure: 1.0, env: 0.2,
    skyElev: -8, skyTurb: 8, skyRayl: 1.0,
    sun: [0x140d05, 0.05], hemi: [0x5a3315, 0.85], moon: [0x6e4520, 0.35],
    grade: [1.06, 0.98, 0.86], night: 0.55, lamps: 1.0, headlights: 1.0,
    sunset: [0x000000, 0.0],
  },
];

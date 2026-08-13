// Sky-lit only. The scene holds no Light objects: the Preetham sky is baked to
// a PMREM and assigned as scene.environment, which is the sole illumination —
// the setup three.js' webgl_shaders_ocean uses.
//
// fog:  [colorHex, density]        grade: [r,g,b] cast + night 0..1
// sun:  [colorHex, intensity]      hemi:  [colorHex, intensity]
// moon: [colorHex, intensity]      env:   sky reflection/IBL intensity
// sunset: [colorHex, amount]       sky:   skyElev/skyTurb/skyRayl (mostly hidden)

export const MOODS = [
  {
    // Lighting lifted wholesale from three.js' webgl_shaders_ocean: a low sun at
    // 2° elevation / 180° azimuth driving the Preetham sky, baked to a PMREM and
    // used as the only light in the scene. No fog, no discrete lights, no colour
    // grade — exposure 0.1 under ACES, exactly as the example runs it.
    name: 'Ocean Sky',
    // The example's own exposure, reachable now that the sun sits high enough to
    // burn the sky brightly — the earlier 0.4 was propping up a twilight scene.
    fog: [0x000000, 0.0], exposure: 0.11, env: 1.0,
    // Sun swung round to the side of the causeway rather than straight down it:
    // at azimuth 180 the light runs parallel to the road and the pillar shadows
    // lie along it, invisible. Across the road they rake through the bays.
    // Elevation lifted off 2 so the disc actually clears the sea horizon.
    // Elevation matters twice over: it sets how brightly the sky burns (and so
    // what exposure suits), and it decides whether sun entering a bay reaches
    // the deck at all. At 7 deg the light needs ~39 m of run to drop from the
    // roofline to the road — further than the deck is wide — so nothing landed.
    skyElev: 26, skyAzi: 95, skyTurb: 10, skyRayl: 2,
    // Intensity is set against the sky IBL, not in isolation: at 3 the sun was
    // swamped by it and cast no readable shadow at all.
    sun: [0xfff0dc, 50], hemi: [0x000000, 0], moon: [0x000000, 0],
    grade: [1, 1, 1], night: 0, lamps: 0, headlights: 0,
    sunset: [0x000000, 0.0],
  },
];

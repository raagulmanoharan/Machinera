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
    // Near the example's 0.1, which its bright specular sea is calibrated for —
    // we now have both that sea and a rain-slick deck mirroring the sky. Not all
    // the way down to 0.1: the example's frame is wide-open sky, ours is a
    // roofed gallery whose underside faces the dark lower hemisphere, and at 0.1
    // the whole scene goes under.
    fog: [0x000000, 0.0], exposure: 0.4, env: 1.0,
    skyElev: 2, skyAzi: 180, skyTurb: 10, skyRayl: 2,
    sun: [0x000000, 0], hemi: [0x000000, 0], moon: [0x000000, 0],
    grade: [1, 1, 1], night: 0, lamps: 0, headlights: 0,
    sunset: [0x000000, 0.0],
  },
];

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
    // The example runs exposure 0.1, but its frame is almost entirely sky and
    // specular water — both enormously bright. Ours is mostly diffuse concrete
    // and asphalt under a 2° sun, which at 0.1 tone-maps to black. Same rig and
    // same sky, opened up until the scene actually reads.
    fog: [0x000000, 0.0], exposure: 2.4, env: 1.0,
    skyElev: 2, skyAzi: 180, skyTurb: 10, skyRayl: 2,
    sun: [0x000000, 0], hemi: [0x000000, 0], moon: [0x000000, 0],
    grade: [1, 1, 1], night: 0, lamps: 0, headlights: 0,
    sunset: [0x000000, 0.0],
  },
];

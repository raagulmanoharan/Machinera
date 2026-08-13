// Sky-lit, following three.js' webgl_shaders_ocean: the Preetham sky is baked
// to a PMREM and assigned as scene.environment. The values are the example's
// own — turbidity 10, rayleigh 2, ACES at exposure 0.1, no fog, no colour
// grade, and a post chain of a single bloom pass.
//
// fog:  [colorHex, density]        grade: [r,g,b] cast + night 0..1
// sun:  [colorHex, intensity]      hemi:  [colorHex, intensity]
// moon: [colorHex, intensity]      env:   sky reflection/IBL intensity
// sunset: [colorHex, amount]       sky:   skyElev/skyAzi/skyTurb/skyRayl

export const MOODS = [
  {
    name: 'Ocean Sky',
        // The example's exposure. It is this low because the sky it renders — with
    // clouds, and bloomed — is enormously bright.
    fog: [0x000000, 0.0], exposure: 0.1, env: 1.0,

    // The example's sky. Azimuth is the one change: at its 180 the sun sits
    // opposite the example's camera, which looks toward it — ours looks down
    // the road the other way, so the same number would put the sun behind us.
    // Swung ahead so we drive into the sunrise, as the example's camera faces
    // its own.
    skyElev: 2, skyAzi: 8, skyTurb: 10, skyRayl: 2,

    // The one thing the example doesn't have: a directional sun. Sky light
    // alone carries no direction, which left the car a silhouette against its
    // own glare — the sea reads because Water is specular, and the car has no
    // equivalent. Aimed along the sky's own sun vector, so the rim it lays on
    // the car arrives from exactly where the glare does.
    sun: [0xffe8cc, 10], hemi: [0x000000, 0], moon: [0x000000, 0],

    grade: [1, 1, 1], night: 0, lamps: 0, headlights: 0,
    sunset: [0x000000, 0.0],
  },
];

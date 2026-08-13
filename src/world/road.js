// The highway centerline is a function of z, so it never doubles back —
// an endless-feeling ribbon that gently winds through the terrain.
export const ROAD = {
  halfWidth: 10.5,    // half of drivable surface — 6 lanes (~3.5 m each)
  shoulder: 2.4,      // extra flat ground beyond the lane
  lengthStart: -400,
  lengthEnd: 9000,
};

// Lateral position of the road center at a given z.
export function roadX(z) {
  return (
    30 * Math.sin(z * 0.0032) +
    14 * Math.sin(z * 0.0089 + 1.3) +
    6 * Math.sin(z * 0.021 + 0.7)
  );
}

// dX/dz — used to orient the road ribbon and align roadside props.
export function roadSlope(z) {
  return (
    30 * 0.0032 * Math.cos(z * 0.0032) +
    14 * 0.0089 * Math.cos(z * 0.0089 + 1.3) +
    6 * 0.021 * Math.cos(z * 0.021 + 0.7)
  );
}

// Distance from a point to the (approximate) road corridor center.
// Because the road is a function of z, |x - roadX(z)| is a good proxy.
export function distToRoad(x, z) {
  return Math.abs(x - roadX(z));
}

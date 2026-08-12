import * as THREE from 'three';

// Solar position (SunCalc algorithm, MIT, Vladimir Agafonkin). Given a real
// location and moment, returns the sun's elevation and azimuth — so the sky can
// match the actual time of day at that place.
const rad = Math.PI / 180;
const dayMs = 86400000;
const J1970 = 2440588, J2000 = 2451545;
const e = rad * 23.4397; // obliquity of the ecliptic

const toDays = (date) => date.valueOf() / dayMs - 0.5 + J1970 - J2000;
const solarMeanAnomaly = (d) => rad * (357.5291 + 0.98560028 * d);
const eclipticLongitude = (M) => {
  const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  return M + C + rad * 102.9372 + Math.PI;
};
const siderealTime = (d, lw) => rad * (280.16 + 360.9856235 * d) - lw;

// { elevation, azimuth } in radians. azimuth measured from due south, +west.
export function sunPosition(lat, lng, date = new Date()) {
  const lw = -lng * rad, phi = lat * rad, d = toDays(date);
  const M = solarMeanAnomaly(d), L = eclipticLongitude(M);
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  const ra = Math.atan2(Math.sin(L) * Math.cos(e), Math.cos(L));
  const H = siderealTime(d, lw) - ra;
  const elevation = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
  const azimuth = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi));
  return { elevation, azimuth };
}

// World-space unit vector toward the sun. World: +Z = north, +X = east, +Y = up.
export function sunDirection(elevation, azimuth) {
  const ca = Math.cos(elevation);
  return new THREE.Vector3(
    -Math.sin(azimuth) * ca,   // east/west
    Math.sin(elevation),       // up
    -Math.cos(azimuth) * ca    // north/south (from south)
  ).normalize();
}

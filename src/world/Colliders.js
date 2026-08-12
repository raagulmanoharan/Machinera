// Lightweight circle colliders in a uniform spatial hash. Point props (trees,
// rocks, lamps, cars) are single circles; building walls are sampled into rows
// of overlapping circles. Resolve pushes a moving circle out of any overlap.
export class Colliders {
  constructor(cell = 6) {
    this.cell = cell;
    this.grid = new Map();
  }

  _key(cx, cz) { return cx * 73856093 ^ cz * 19349663; }

  add(x, z, r) {
    const c = this.cell;
    const item = { x, z, r };
    const x0 = Math.floor((x - r) / c), x1 = Math.floor((x + r) / c);
    const z0 = Math.floor((z - r) / c), z1 = Math.floor((z + r) / c);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cz = z0; cz <= z1; cz++) {
        const k = this._key(cx, cz);
        let a = this.grid.get(k);
        if (!a) { a = []; this.grid.set(k, a); }
        a.push(item);
      }
    }
  }

  // sample a wall segment (a→b) into circles of radius r
  addSegment(ax, az, bx, bz, r) {
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.round(len / (r * 1.3)));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      this.add(ax + (bx - ax) * t, az + (bz - az) * t, r);
    }
  }

  // Push a moving circle (px,pz,rad) out of overlaps. Returns {x,z,hit,nx,nz}.
  resolve(px, pz, rad) {
    const c = this.cell;
    const cx = Math.floor(px / c), cz = Math.floor(pz / c);
    let x = px, z = pz, hit = false, nx = 0, nz = 0;
    const seen = new Set();
    for (let ax = cx - 1; ax <= cx + 1; ax++) {
      for (let az = cz - 1; az <= cz + 1; az++) {
        const arr = this.grid.get(this._key(ax, az));
        if (!arr) continue;
        for (const o of arr) {
          if (seen.has(o)) continue;
          seen.add(o);
          const dx = x - o.x, dz = z - o.z;
          const rr = o.r + rad;
          const d2 = dx * dx + dz * dz;
          if (d2 < rr * rr && d2 > 1e-9) {
            const d = Math.sqrt(d2);
            const push = rr - d;
            const ux = dx / d, uz = dz / d;
            x += ux * push; z += uz * push;
            nx += ux; nz += uz; hit = true;
          }
        }
      }
    }
    if (hit) { const l = Math.hypot(nx, nz) || 1; nx /= l; nz /= l; }
    return { x, z, hit, nx, nz };
  }
}

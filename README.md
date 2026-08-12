# Machinera Drive

**Open a link and drive.** A no-install, browser-based 3D driving game built for a
soothing cruise through picturesque scenery — with real free-library assets, real-world
terrain, and a warm, nostalgic film look. No account, no API key, no downloads.

## Play

Once GitHub Pages is enabled (Settings → Pages → **Source: GitHub Actions**), the game
deploys on every push to the default branch and is playable at:

> **https://raagulmanoharan.github.io/Machinera/**

### Controls

| Key | Action |
| --- | --- |
| `W` / `↑` | Accelerate |
| `S` / `↓` | Brake / reverse |
| `A` `D` / `←` `→` | Steer |
| `Space` | Handbrake (slide) |
| `C` | Change camera (chase / close / hood) |
| `R` | Reset to start |
| `Esc` | Settings — pick a route or a real place |

Touch also works: left half of the screen steers, right half is throttle (top) / brake (bottom).

## Two ways to drive

- **Scenic route (default).** A smooth, always-drivable winding road through rolling
  hills, forest and dramatic snow-capped mountains — tuned to be relaxing to cruise, not
  to fight. This is the star of the experience.
- **Real place (OpenStreetMap).** Build any location live from free OpenStreetMap data +
  open elevation tiles: real streets, buildings, water and parks, draped over real
  terrain elevation. Great for picturesque spots. No account or API key.

## What makes it feel good

- **Real free-library assets.** Trees are bundled CC0 low-poly models from
  [Kenney](https://kenney.nl) (public domain), instanced in the thousands for
  performance, mixed with procedural conifers, lamps and rocks.
- **Solid collisions.** Buildings, trees, rocks, lamps, parked cars and guardrails are
  all solid — you bump and slide off them instead of driving through.
- **Driving that isn't a block.** The body squats under acceleration, dives under braking,
  rolls into corners and bobs over road humps, on top of an arcade + bicycle-model
  handling model with speed-sensitive steering and a handbrake slide.
- **Atmosphere.** Physically-based sky with image-based lighting, sun glare, soft drifting
  clouds, wind that sways the trees, ground-truth ambient occlusion, and a nostalgic film
  grade (warm tint, lifted blacks, vignette, grain).
- **Real materials.** PBR asphalt with painted lane markings and grime, windowed building
  facades (concrete/brick and reflective glass towers), reflective water, and clearcoat
  car paint — all generated in code or streamed as CC0 assets; nothing heavy is bundled.

## Develop

```bash
npm install
npm run dev      # local dev server
npm run build    # production build to dist/
npm run preview  # preview the production build
```

## Assets & data

- 3D models © [Kenney](https://kenney.nl) — CC0 (public domain), bundled under `public/models/`.
- Map data © OpenStreetMap contributors ([ODbL](https://www.openstreetmap.org/copyright)),
  via the public Overpass API.
- Elevation from the [Terrain Tiles](https://registry.opendata.aws/terrain-tiles/) open
  dataset.
- Rendering by [three.js](https://threejs.org).

Want a specific CC0 model pack (Kenney, Quaternius, …) wired in? Drop it in `public/models/`
and register it in `src/render/AssetLibrary.js` — the instancing pipeline is ready for it.

# Machinera Drive

**Open a link and drive.** A no-install, browser-based 3D driving game that builds
real-world cities from live [OpenStreetMap](https://www.openstreetmap.org) data — real
streets, buildings, water and parks — and lets you cruise them. No account, no API key,
no downloads.

Inspired by open-data 3D map projects like [hop.earth](https://hop.earth).

## Play

Once GitHub Pages is enabled for this repo (Settings → Pages → **Source: GitHub Actions**),
the game deploys automatically on every push to the default branch and is playable at:

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
| `Esc` | Settings — pick a new location |

Touch controls work too: left half of the screen steers, right half is throttle (top) /
brake (bottom).

## How it works

- **Real-world mode (default).** On load, the game queries the free
  [Overpass API](https://overpass-api.de) for a patch of OpenStreetMap around a chosen
  location, projects the geometry to local metres, and builds the scene on the fly:
  road network → drivable ribbons, building footprints → extruded 3D volumes, water and
  parkland → filled areas. You start on the nearest street, aligned to it. Pick any of the
  preset cities or enter your own `lat, lng` in the settings panel.
- **Procedural mode (offline fallback).** A self-contained, endless-feeling highway
  winding through hills, forest and snow-capped mountains — no network needed. The game
  automatically drops you here if OpenStreetMap can't be reached.
- **Driving model.** An arcade + bicycle-model vehicle: speed-sensitive steering,
  lateral grip with a handbrake slide, engine/brake/drag forces, and wheels that spin and
  turn. In procedural mode the car also conforms to the terrain slope.

Everything renders with [three.js](https://threejs.org). No assets are shipped — the car,
world and sky are all generated in code.

## Develop

```bash
npm install
npm run dev      # local dev server (http://localhost:5173)
npm run build    # production build to dist/
npm run preview  # preview the production build
```

## Data & licensing

Map data © OpenStreetMap contributors, available under the
[Open Database License](https://www.openstreetmap.org/copyright). This project fetches it
live at runtime via public Overpass API endpoints.

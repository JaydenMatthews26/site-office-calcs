# Site Office Calcs

UK construction calculator suite. **Sister product to My Site Office** (quoting / invoicing) but a **completely separate codebase**: no shared packages, no imports from any site-office repo, no shared cloud. The only future link is optional cross-selling.

A 2D floor plan **or typed measurements** is the single take-off model. Every calculator reads span, length, footprint, eaves/perimeter, storey height, storeys and openings from that model. Edits ripple through immediately. Everything is stored **on this device** (`localStorage`). There is no backend.

## Live site (iPad / any browser)

**https://jaydenmatthews26.github.io/site-office-calcs/**

Pushes to `main` (and manual **Actions → Deploy GitHub Pages → Run workflow**) build with Node 20 (`npm ci`, `npm run build`) and publish `dist/` via the official Pages actions (`actions/upload-pages-artifact` + `actions/deploy-pages`). Vite `base` is `/site-office-calcs/` for that production build only; `npm run dev` still serves `/` at `http://localhost:5173`. The production build copies `index.html` to `404.html` so GitHub Pages can still load the app if a path is missing (this app has no URL routes — sections live in the page).

First-time setup (once per repo): **Settings → Pages → Source: GitHub Actions**. Until that is set, the workflow cannot finish deploying.

## How to run

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm test` | Formula tests |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build |

**Requirements:** Node 20+. Modern browser (canvas). iPad-sized viewports are first-class: 44 px tools, pinch/zoom buttons, local save.

## Job input mode

**Job input** at the top of the app (and the sidebar) chooses how the job starts:

1. **Draw plan** — Konva millimetre canvas (default). Geometry drives automatic take-offs.
2. **Manual** — type span, length, footprint, perimeter/eaves, partitions, heights, opening counts. No canvas.

Both modes write the same take-off model. Calculators never care which mode produced span, eaves or opening counts. Switching maps what it can; you are warned only if typed sizes would be overwritten, or if Draw plan would leave calculators on an empty canvas. The last choice is stored in `localStorage`. Pitch and eaves overhang live once on roofing (also shown in Manual so you are not asked twice).

## What this app does

1. **Floor plan editor (Konva)** — rectangular building, external walls, partitions, doorways and openings (40 px = 1 m, snap 100 mm).
2. **Roofing — coverings + carpentry** (cut / truss) plus opt-in cut list. Dormers, rooflights and snow guards have sizes that change tiles, battens, felt, valleys and clips.
3. **Fascias, soffits & guttering** — PVCU or timber (timber paint + tins). Guttering materials and downpipes.
4. **Building structure** — masonry or timber frame; skins unlock materials; block outer → render; steel-brick hybrid flags an SE.
5. **Windows & doors** — numbered schedule (WG1, FD1…), photos, glazing, 2D mock-up PDF.
6. **Foundations to DPC** — strip or raft; substrate clay/sand/rock; DPC; spoil; SE flag.
7. **Ground floor** — slab / beam & block / timber; Part L insulation; DPM; UFH / radon flags.
8. **Internal walls** — timber / metal stud or block; board layers; door lintels.
9. **First floor** — joists, noggins, strutting, herringbone, stair trimmers.
10. **Stairs** — Part K-style rise/going/pitch checks (brief: 200 / 220 / 42°); red FAIL + suggestion; cut list.
11. **External walls above DPC** — cavity, lintel schedule (Catnic vs concrete + padstones), cavity barriers.
12. **Internal finishes** — board, skim, paint tins from wall/ceiling areas (openings deducted).
13. **Skirting & architrave** — visual profile thumbnails, MDF/pine/oak, finishing PDF.
14. **Floor coverings** — **whole house** (footprint × storeys) **or room-by-room** (editable rooms: name, floor m², optional wall-tile m²; openings deducted from wall tile). Tile size, grout, waste 5–20%, grout/adhesive bags.
15. **Plumbing & electrics** — materials guide only (not BS 7671 / heat-loss design).
16. **Painting** — new plaster / existing / render coats; woodwork; external fascias/joinery.
17. **Externals** — drive, fence, soakaway, 110 mm drainage.
18. **Scaffolding** — bays, lifts, boards, hire from height + perimeter.

UK units: **mm / m / £**. Figures are **take-off aids**, not structural design.

## Whole-job PDF

**Export whole job PDF** in the app header (next to Reset job) downloads one A4 file for the current job. It always starts with the shared take-off snapshot (drawn plan or typed measurements: span, length, footprint, eaves, openings, heights). It then appends each calculator that is **toggled on** in the sidebar, in registry order (roofing → fascias → … → scaffolding). Unticked sections are omitted. Each section still has its own PDF button for a single-trade printout.

The file is generated in the browser with jsPDF (`site-office-calcs-whole-job-…pdf`) and is not uploaded anywhere.

## Independence from My Site Office

- This repository is standalone.
- Do not add a dependency on My Site Office, a shared monorepo package, or a shared API.
- Job data never leaves the browser.

## Project layout

```
src/
  calc/              # Commented UK formulas + tests
  geometry/          # Plan take-off + draw/manual effective geometry
  sections/          # Registry
  store/             # Zustand + localStorage
  components/plan        # Canvas + typed measurements
  components/roofing
  components/fascias
  components/takeoff     # Remaining calculators
  pdf/               # jsPDF section exports + whole-job PDF
```

# Site Office Calcs

UK construction calculator suite. **Sister product to My Site Office** (quoting / invoicing) but a **completely separate codebase**: no shared packages, no imports from any site-office repo, no shared cloud. The only future link is optional cross-selling.

POC: a 2D floor plan is the single source of truth. Roofing coverings and carpentry **read wall lengths, footprint, ceiling area and openings from that geometry**. Fascias, soffits and guttering **read eaves perimeter, property width and storey height** from the same plan (with editable overrides). Edits ripple through immediately. Everything is stored **on this device** (`localStorage`). There is no backend.

## How to run

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm test` | Formula tests (geometry, coverings, carpentry, fascias) |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build |

**Requirements:** Node 20+. Modern browser (canvas). iPad-sized viewports are first-class: 44 px tools, pinch/zoom buttons, local save.

## What this POC does

1. **Floor plan editor (Konva)** — draw a rectangular building, external walls, internal partitions, doorways and openings on a millimetre grid (40 px = 1 m, snap 100 mm). Derived take-off: wall lengths, footprint / ceiling area, span × length, door and opening counts. Persist locally.
2. **Roofing — coverings** — tile or slate size, batten gauge (single-lap vs double-lap), felt (bitumen or breathable), battens at 10 per bundle **+ 20% waste**, ridge / hip tiles, verge and valley lengths. Dormers, rooflights and snow guards are **stubs**. Ridge, hip and verge come from the plan plus pitch / shape.
3. **Roofing — carpentry**
   - **Cut roof:** pitch, span, eaves overhang, rafter spacing; common rafter length, plumb cut, bird’s mouth, seat cut; rafter count, ridge board, wall plate; hip / valley, jack rafters (diminishing), collar ties, purlins. Shape: gable-to-gable / gable-to-hip / hip-to-hip.
   - **Truss:** span, pitch, eaves; Fink / attic / mono-pitch / scissor / raised tie; count at **600 mm centres**; member sizes; total timber; indicative cost **~£85/m²** footprint. Attic flags a heavier floor joist.
4. **Opt-in cut list** — one common rafter drawn and labelled × N; jacks shown diminishing. Print from the page or include in PDF.
5. **Fascias, soffits & guttering** — PVCU or timber (timber adds paint colour, coverage from linear metres, tins). Guttering: property width, eaves height, elbows, outlets, downpipe length; plastic / metal / aluminium / copper. Linear metres from plan eaves / property width, with overrides.
6. **Section toggle + section PDFs** (jsPDF) for roofing and fascias. Formulas live in comments in `src/calc/` and `src/geometry/`.
7. **Modular sections** — later calculators register in `src/sections/registry.ts` and must read the plan. Stubs only for everything after fascias.

UK units throughout: **mm / m / £**. Figures are **take-off aids**, not structural design or a substitute for Approved Document A, BS 5534 or a truss fabricator.

## Independence from My Site Office

- This repository is standalone.
- Do not add a dependency on My Site Office, a shared monorepo package, or a shared API.
- Job data never leaves the browser in this POC.

## Project layout

```
src/
  calc/           # Coverings, carpentry, fascias (commented UK formulas + tests)
  geometry/       # Plan take-off (shoelace, span, openings)
  sections/       # Registry so future modules plug in
  store/          # Zustand + localStorage
  components/plan     # Konva editor
  components/roofing  # Coverings, carpentry, cut list
  components/fascias  # Fascia/soffit, paint, guttering
  components/stubs    # Placeholder panels
  pdf/            # jsPDF section exports
```

## Roadmap (not in this POC)

These appear in the section list as stubs only:

- Building structure
- Windows & doors
- Foundations
- Floors
- Stairs
- Finishes
- Plumbing & electrics (BS 7671 later)
- Painting
- Externals
- Scaffolding

Each should consume the same derived geometry. Do not re-enter wall lengths or areas.

import { jsPDF } from 'jspdf'
import type { ExternalWallResult } from '../calc/externalWalls'
import type { ExternalsResult } from '../calc/externals'
import type { FinishesResult } from '../calc/finishes'
import type { FirstFloorResult } from '../calc/firstFloor'
import type { FloorCoverResult } from '../calc/floorCover'
import type { FoundationsResult } from '../calc/foundations'
import type { GroundFloorResult } from '../calc/groundFloor'
import type { JoineryResult } from '../calc/joinery'
import type { MepResult } from '../calc/mep'
import type { PaintingResult } from '../calc/painting'
import type { PartitionResult } from '../calc/partitions'
import type { ScaffoldResult } from '../calc/scaffold'
import type { SkirtingResult } from '../calc/skirting'
import type { StairsResult } from '../calc/stairs'
import type { StructureResult } from '../calc/structure'
import { formatGBP, formatM, formatM2, formatM3 } from './../calc/units'
import type { DerivedGeometry } from '../geometry/derive'
import type { JoineryItem } from '../types/modules'
import type { JobState } from '../types/job'
import { drawPlanBlock, ensureSpace, finishPdf, heading, line, noteList, startSectionPdf } from './common'

function pack(job: JobState, g: DerivedGeometry, subtitle: string, slug: string, draw: (doc: jsPDF, y: number) => number, notes: string[]) {
  const { doc, y: y0 } = startSectionPdf(job, subtitle)
  let y = drawPlanBlock(doc, y0, g)
  y = draw(doc, y + 4)
  y = noteList(doc, y + 4, notes)
  finishPdf(doc, job, slug)
}

export function exportStructurePdf(job: JobState, g: DerivedGeometry, r: StructureResult) {
  pack(job, g, 'Building structure', 'structure', (doc, y) => {
    y = heading(doc, y, job.structure.frame === 'timber' ? 'Timber frame' : 'Masonry')
    y = line(doc, y, 'Gross / net elevation', `${formatM2(r.grossElevationM2)} / ${formatM2(r.netElevationM2)}`)
    y = line(doc, y, 'Inner / outer units', `${r.innerUnits} / ${r.outerUnits}`)
    y = line(doc, y, 'Mortar / wall ties', `${formatM3(r.mortarM3)} / ${r.wallTies}`)
    if (r.renderM2) y = line(doc, y, 'Render', `${formatM2(r.renderM2)}  ·  ${formatM3(r.renderM3)}`)
    if (r.timberStuds) y = line(doc, y, 'Studs / plates / sheathing', `${r.timberStuds} / ${r.timberPlatesM.toFixed(1)} m / ${formatM2(r.sheathingM2)}`)
    if (r.seFlag) y = line(doc, y, 'SE flag', 'Steel-brick hybrid — engineer sign-off')
    return y
  }, r.notes)
}

export function exportJoineryPdf(job: JobState, g: DerivedGeometry, r: JoineryResult) {
  const { doc, y: y0 } = startSectionPdf(job, 'Windows & doors schedule')
  let y = drawPlanBlock(doc, y0, g)
  y = heading(doc, y + 2, 'Counts')
  y = line(doc, y, 'GF windows / doors', `${r.gfWindows} / ${r.gfDoors}`)
  y = line(doc, y, 'FF windows / rooflights', `${r.ffWindows} / ${r.rooflights}`)
  y = line(doc, y, 'Total area', formatM2(r.totalAreaM2))
  for (const it of r.items) {
    y = ensureSpace(doc, y, 55)
    y = heading(doc, y + 4, `${it.code}  ·  ${it.kind}  ·  ${it.storey.toUpperCase()}`)
    y = line(doc, y, 'Size', `${it.widthMm} × ${it.heightMm} mm`)
    y = line(doc, y, 'Openings / panes / glazing', `${it.openings} / ${it.panes} / ${it.glazing}`)
    y = line(doc, y, 'Sill / sub-sill', `${it.sillWidthMm} / ${it.subSillWidthMm} mm`)
    y = drawJoineryMock(doc, y + 2, it)
    if (it.photoDataUrl && it.photoDataUrl.startsWith('data:image')) {
      try {
        y = ensureSpace(doc, y, 42)
        doc.addImage(it.photoDataUrl, 'JPEG', 18, y, 36, 28)
        y += 32
      } catch {
        y = line(doc, y, 'Photo', 'Could not embed')
      }
    }
  }
  finishPdf(doc, job, 'joinery')
}

function drawJoineryMock(doc: jsPDF, y: number, it: JoineryItem): number {
  const maxW = 70
  const maxH = 40
  const scale = Math.min(maxW / Math.max(it.widthMm, 1), maxH / Math.max(it.heightMm, 1))
  const w = it.widthMm * scale
  const h = it.heightMm * scale
  const x = 18
  doc.setDrawColor(15, 28, 46)
  doc.setLineWidth(0.6)
  doc.rect(x, y, w, h)
  const cols = Math.max(1, Math.min(it.panes, 3))
  const rows = Math.max(1, Math.ceil(it.panes / cols))
  doc.setLineWidth(0.3)
  for (let c = 1; c < cols; c++) doc.line(x + (w * c) / cols, y, x + (w * c) / cols, y + h)
  for (let r = 1; r < rows; r++) doc.line(x, y + (h * r) / rows, x + w, y + (h * r) / rows)
  doc.setFontSize(8)
  doc.text(`${it.widthMm} × ${it.heightMm} mm  ·  ${it.panes} pane(s)  ·  ${it.glazing}`, x, y + h + 5)
  return y + h + 10
}

export function exportFoundationsPdf(job: JobState, g: DerivedGeometry, r: FoundationsResult) {
  pack(job, g, 'Foundations to DPC', 'foundations', (doc, y) => {
    y = heading(doc, y, job.foundations.type === 'raft' ? 'Raft' : 'Strip')
    y = line(doc, y, 'Run / width / depth', `${formatM(r.runMm / 1000)} / ${r.widthMm} mm / ${r.depthMm} mm`)
    y = line(doc, y, 'Concrete / excavation / spoil', `${formatM3(r.concreteM3)} / ${formatM3(r.excavationM3)} / ${formatM3(r.spoilM3)}`)
    y = line(doc, y, 'DPC', `${r.dpcLinearM.toFixed(1)} m  ·  ${job.foundations.dpcMaterial} @ ${r.dpcHeightMm} mm`)
    if (r.seFlag) y = line(doc, y, 'SE flag', 'Non-standard / underpinning')
    return y
  }, r.notes)
}

export function exportGroundFloorPdf(job: JobState, g: DerivedGeometry, r: GroundFloorResult) {
  pack(job, g, 'Ground floor structure', 'ground-floor', (doc, y) => {
    y = heading(doc, y, job.groundFloor.type)
    y = line(doc, y, 'Area', formatM2(r.areaM2))
    y = line(doc, y, 'Concrete / insulation / DPM', `${formatM3(r.concreteM3)} / ${formatM3(r.insulationM3)} / ${formatM2(r.dpmM2)}`)
    y = line(doc, y, 'Beams / joists', `${r.beams} / ${r.joists} (${r.joistLinearM.toFixed(1)} m)`)
    return y
  }, r.notes)
}

export function exportPartitionsPdf(job: JobState, g: DerivedGeometry, r: PartitionResult) {
  pack(job, g, 'Internal walls', 'partitions', (doc, y) => {
    y = heading(doc, y, job.partitions.type)
    y = line(doc, y, 'Length / area', `${formatM(r.lengthM)} / ${formatM2(r.areaM2)}`)
    y = line(doc, y, 'Studs / plates / blocks', `${r.studs} / ${r.platesM.toFixed(1)} m / ${r.blocks}`)
    y = line(doc, y, 'PB sheets', String(r.plasterboardSheets))
    y = line(doc, y, 'Doors / lintels / doubled studs', `${r.doorsOnPartitions} / ${r.lintels} / ${r.doubledStuds}`)
    return y
  }, r.notes)
}

export function exportFirstFloorPdf(job: JobState, g: DerivedGeometry, r: FirstFloorResult) {
  pack(job, g, 'First floor structure', 'first-floor', (doc, y) => {
    y = heading(doc, y, 'Joists')
    y = line(doc, y, 'Count / linear', `${r.joists} / ${r.joistLinearM.toFixed(1)} m`)
    y = line(doc, y, 'Noggins / strutting / herringbone', `${r.nogginsM.toFixed(1)} / ${r.struttingM.toFixed(1)} / ${r.herringboneM.toFixed(1)} m`)
    y = line(doc, y, 'Trimmers', `${r.trimmers}  ·  ${r.trimmerLengthMm} mm combined`)
    return y
  }, r.notes)
}

export function exportStairsPdf(job: JobState, g: DerivedGeometry, r: StairsResult) {
  pack(job, g, 'Stairs', 'stairs', (doc, y) => {
    y = heading(doc, y, job.stairs.plan)
    y = line(doc, y, 'Rise / going / pitch', `${r.riseMm.toFixed(1)} mm / ${r.goingMm} mm / ${r.pitchDeg.toFixed(1)}°`)
    y = line(doc, y, 'Risers / treads / 2R+G', `${r.risers} / ${r.treads} / ${r.twoRplusG.toFixed(0)} mm`)
    y = line(doc, y, 'Part K-style check', r.pass ? 'PASS' : 'FAIL')
    if (r.suggestion) y = line(doc, y, 'Suggestion', r.suggestion)
    y = line(doc, y, 'Strings / handrail / balusters / newels', `${r.strings} × ${r.stringLengthMm.toFixed(0)} mm / ${r.handrailM.toFixed(2)} m / ${r.balusters} / ${r.newels}`)
    return y
  }, r.notes)
}

export function exportExternalWallsPdf(job: JobState, g: DerivedGeometry, r: ExternalWallResult) {
  pack(job, g, 'External walls above DPC', 'external-walls', (doc, y) => {
    y = heading(doc, y, 'Skins & cavity')
    y = line(doc, y, 'Net elevation / insulation', `${formatM2(r.netElevationM2)} / ${formatM3(r.insulationM3)}`)
    y = line(doc, y, 'Inner blocks / outer units', `${r.innerBlocks} / ${r.outerUnits}`)
    y = line(doc, y, 'Cavity barriers / fire stops', `${r.cavityBarriersM.toFixed(1)} m / ${r.fireStopsM.toFixed(1)} m`)
    y = heading(doc, y + 2, 'Lintel schedule')
    for (const L of r.lintels) {
      y = ensureSpace(doc, y)
      y = line(doc, y, L.code, `${L.kind}  ${L.lengthMm} mm  ·  padstones ${L.padstones}`)
    }
    return y
  }, r.notes)
}

export function exportFinishesPdf(job: JobState, g: DerivedGeometry, r: FinishesResult) {
  pack(job, g, 'Internal finishes', 'finishes', (doc, y) => {
    y = heading(doc, y, 'Areas')
    y = line(doc, y, 'Walls / ceiling', `${formatM2(r.wallM2)} / ${formatM2(r.ceilingM2)}`)
    y = line(doc, y, 'PB sheets / skim / compound', `${r.pbSheets} / ${formatM2(r.skimM2)} / ${r.compoundBags} bags`)
    y = line(doc, y, 'Paint', `${r.paintLitres.toFixed(1)} L  ·  ${r.paintTins} tins`)
    y = line(doc, y, 'Coving', formatM(r.covingM))
    return y
  }, r.notes)
}

export function exportSkirtingPdf(job: JobState, g: DerivedGeometry, r: SkirtingResult) {
  pack(job, g, 'Skirting & architrave', 'skirting', (doc, y) => {
    y = heading(doc, y, `${r.profile} · ${r.material}`)
    y = line(doc, y, 'Skirting', `${formatM(r.skirtingM)}  ·  ${r.skirtingLengths} lengths`)
    y = line(doc, y, 'Architrave', `${formatM(r.architraveM)}  ·  ${r.architraveLengths} lengths`)
    return y
  }, r.notes)
}

export function exportFloorCoverPdf(job: JobState, g: DerivedGeometry, r: FloorCoverResult) {
  pack(job, g, 'Floor coverings', 'floor-coverings', (doc, y) => {
    y = heading(doc, y, job.floorCover.kind)
    y = line(doc, y, 'Floor / wall area', `${formatM2(r.floorM2)} / ${formatM2(r.wallM2)}`)
    y = line(doc, y, 'Tiles / m² / count', `${r.tilesPerM2.toFixed(2)} / ${r.tiles}`)
    y = line(doc, y, 'Grout / adhesive bags', `${r.groutBags} / ${r.adhesiveBags}`)
    return y
  }, r.notes)
}

export function exportMepPdf(job: JobState, g: DerivedGeometry, r: MepResult) {
  pack(job, g, 'Plumbing & electrics (guide)', 'mep', (doc, y) => {
    y = heading(doc, y, 'Plumbing')
    y = line(doc, y, 'H / C pipe', `${r.hotM.toFixed(1)} m / ${r.coldM.toFixed(1)} m`)
    y = line(doc, y, 'Fittings / radiators / boiler', `${r.fittings} / ${r.radiators} / ${r.boilerKw} kW`)
    y = heading(doc, y + 2, 'Electrics')
    y = line(doc, y, 'Sockets / lights / CU ways', `${r.sockets} / ${r.lights} / ${r.cuWays}`)
    y = line(doc, y, '2.5 / 1.5 / 6 mm²', `${r.cable25M.toFixed(0)} / ${r.cable15M.toFixed(0)} / ${r.cable6M.toFixed(0)} m`)
    y = line(doc, y, 'Installed range', `${formatGBP(r.installedLowGbp)} – ${formatGBP(r.installedHighGbp)}`)
    return y
  }, r.notes)
}

export function exportPaintingPdf(job: JobState, g: DerivedGeometry, r: PaintingResult) {
  pack(job, g, 'Painting & decorating', 'painting', (doc, y) => {
    y = heading(doc, y, job.painting.substrate)
    y = line(doc, y, 'Coats', `mist ${r.coats.mist} + top ${r.coats.top}`)
    y = line(doc, y, 'Walls+ceilings / woodwork / external', `${formatM2(r.wallCeilingM2)} / ${formatM2(r.woodworkM2)} / ${formatM2(r.externalM2)}`)
    y = line(doc, y, 'Paint', `${r.litres.toFixed(1)} L  ·  ${r.tins} tins`)
    return y
  }, r.notes)
}

export function exportExternalsPdf(job: JobState, g: DerivedGeometry, r: ExternalsResult) {
  pack(job, g, 'Externals', 'externals', (doc, y) => {
    y = heading(doc, y, 'Hard landscape')
    y = line(doc, y, 'Drive / path', `${formatM2(r.driveM2)} / ${formatM2(r.pathM2)}`)
    y = line(doc, y, 'Hardcore', `${r.hardcoreT.toFixed(1)} t  ·  ${r.hardcoreBags} bags`)
    y = heading(doc, y + 2, 'Fence / drainage')
    y = line(doc, y, 'Bays / posts / panels', `${r.fenceBays} / ${r.posts} / ${r.panels}`)
    y = line(doc, y, 'Soakaway / 110 mm pipe', `${formatM3(r.soakawayM3)} / ${r.pipeM.toFixed(1)} m + ${r.pipeFittings} fittings`)
    return y
  }, r.notes)
}

export function exportScaffoldPdf(job: JobState, g: DerivedGeometry, r: ScaffoldResult) {
  pack(job, g, 'Scaffolding', 'scaffold', (doc, y) => {
    y = heading(doc, y, 'Schedule')
    y = line(doc, y, 'Height / perimeter / lifts / bays', `${r.heightM.toFixed(2)} m / ${r.perimeterM.toFixed(2)} m / ${r.lifts} / ${r.bays}`)
    y = line(doc, y, 'Standards / ledgers / transoms', `${r.standards} / ${r.ledgers} / ${r.transoms}`)
    y = line(doc, y, 'Boards / toe boards', `${r.boards} / ${r.toeBoards}`)
    y = line(doc, y, `Hire (${r.hireWeeks} weeks)`, formatGBP(r.hireGbp))
    return y
  }, r.notes)
}

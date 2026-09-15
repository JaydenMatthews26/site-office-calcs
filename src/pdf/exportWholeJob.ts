import { jsPDF } from 'jspdf'
import { calcExternalWalls } from '../calc/externalWalls'
import { calcExternals } from '../calc/externals'
import { calcFascias } from '../calc/fascias'
import { calcFinishes } from '../calc/finishes'
import { calcFirstFloor } from '../calc/firstFloor'
import { calcFloorCover } from '../calc/floorCover'
import { calcFoundations } from '../calc/foundations'
import { calcGroundFloor } from '../calc/groundFloor'
import { calcJoinery } from '../calc/joinery'
import { calcMep } from '../calc/mep'
import { calcPainting } from '../calc/painting'
import { calcPartitions, partitionDoorCount } from '../calc/partitions'
import { calcCarpentry } from '../calc/roofCarpentry'
import { calcCoverings } from '../calc/roofCoverings'
import { calcScaffold } from '../calc/scaffold'
import { calcSkirting } from '../calc/skirting'
import { calcStairs } from '../calc/stairs'
import { calcStructure } from '../calc/structure'
import type { DerivedGeometry } from '../geometry/derive'
import { enabledCalculatorSections } from '../sections/enabled'
import { DOOR_HEIGHT_MM, DOOR_WIDTH_MM, type JobState } from '../types/job'
import {
  drawJobSnapshot,
  finishPdf,
  heading,
  line,
  noteList,
  startCalculatorPage,
  startSectionPdf,
} from './common'
import { drawFasciasTakeoff } from './exportFascias'
import { drawRoofingTakeoff } from './exportRoofing'
import {
  drawExternalWallsTakeoff,
  drawExternalsTakeoff,
  drawFinishesTakeoff,
  drawFirstFloorTakeoff,
  drawFloorCoverTakeoff,
  drawFoundationsTakeoff,
  drawGroundFloorTakeoff,
  drawJoineryTakeoff,
  drawMepTakeoff,
  drawPaintingTakeoff,
  drawPartitionsTakeoff,
  drawScaffoldTakeoff,
  drawSkirtingTakeoff,
  drawStairsTakeoff,
  drawStructureTakeoff,
} from './exportTakeoff'

/**
 * One PDF for the job: plan/measurements snapshot, then each enabled calculator
 * in registry order. Reuses section calc + PDF drawers — no second set of formulas.
 */
export function exportWholeJobPdf(job: JobState, geometry: DerivedGeometry): void {
  const included = enabledCalculatorSections(job.sectionEnabled)
  const { doc, y: y0 } = startSectionPdf(job, 'Whole job take-off')
  let y = drawJobSnapshot(doc, y0, job, geometry)

  y = heading(doc, y + 4, 'Included calculators')
  if (included.length === 0) {
    y = line(doc, y, 'None', 'Toggle sections on in the sidebar to include them here')
  } else {
    for (const section of included) {
      y = line(doc, y, section.title, section.shortTitle)
    }
  }

  for (const section of included) {
    y = startCalculatorPage(doc, section.title)
    y = appendCalculator(doc, y, section.id, job, geometry)
  }

  finishPdf(doc, job, 'whole-job')
}

function appendCalculator(
  doc: jsPDF,
  y: number,
  id: string,
  job: JobState,
  geometry: DerivedGeometry,
): number {
  switch (id) {
    case 'roofing': {
      const coverings = calcCoverings(geometry, job.roofing)
      const carpentry = calcCarpentry(geometry, job.roofing)
      y = drawRoofingTakeoff(doc, y, { job, geometry, coverings, carpentry })
      return noteList(doc, y + 4, coverings.notes)
    }
    case 'fascias': {
      const fascias = calcFascias(geometry, job.roofing, job.fascias)
      y = drawFasciasTakeoff(doc, y, { job, geometry, fascias })
      return noteList(doc, y + 4, fascias.notes)
    }
    case 'structure': {
      const r = calcStructure(geometry, job.structure, job.joinery)
      y = drawStructureTakeoff(doc, y, job, r)
      return noteList(doc, y + 4, r.notes)
    }
    case 'windows-doors': {
      const sizes = {
        doorWidthMm: job.manual.doorWidthMm,
        doorHeightMm: job.manual.doorHeightMm,
        windowWidthMm: job.manual.windowWidthMm,
        windowHeightMm: job.manual.windowHeightMm,
      }
      const r = calcJoinery(job.plan, geometry, job.joinery, sizes)
      const items = job.joinery.items.length > 0 ? job.joinery.items : r.items
      return drawJoineryTakeoff(doc, y, { ...r, items })
    }
    case 'foundations': {
      const r = calcFoundations(geometry, job.foundations)
      y = drawFoundationsTakeoff(doc, y, job, r)
      return noteList(doc, y + 4, r.notes)
    }
    case 'ground-floor': {
      const r = calcGroundFloor(geometry, job.groundFloor)
      y = drawGroundFloorTakeoff(doc, y, job, r)
      return noteList(doc, y + 4, r.notes)
    }
    case 'partitions': {
      const doors = partitionDoorCount(job.plan, geometry.doorCount, geometry.source)
      const r = calcPartitions(geometry, job.partitions, doors)
      y = drawPartitionsTakeoff(doc, y, job, r)
      return noteList(doc, y + 4, r.notes)
    }
    case 'first-floor': {
      const r = calcFirstFloor(geometry, job.firstFloor)
      y = drawFirstFloorTakeoff(doc, y, r)
      return noteList(doc, y + 4, r.notes)
    }
    case 'stairs': {
      const r = calcStairs(geometry, job.stairs)
      y = drawStairsTakeoff(doc, y, job, r)
      return noteList(doc, y + 4, r.notes)
    }
    case 'external-walls': {
      const r = calcExternalWalls(geometry, job.externalWalls, job.joinery.items)
      y = drawExternalWallsTakeoff(doc, y, r)
      return noteList(doc, y + 4, r.notes)
    }
    case 'finishes': {
      const r = calcFinishes(geometry, job.finishes)
      y = drawFinishesTakeoff(doc, y, r)
      return noteList(doc, y + 4, r.notes)
    }
    case 'skirting': {
      const r = calcSkirting(geometry, job.skirting, geometry.doorCount, DOOR_WIDTH_MM, DOOR_HEIGHT_MM)
      y = drawSkirtingTakeoff(doc, y, r)
      return noteList(doc, y + 4, r.notes)
    }
    case 'floor-coverings': {
      const r = calcFloorCover(geometry, job.floorCover)
      y = drawFloorCoverTakeoff(doc, y, job, r)
      return noteList(doc, y + 4, r.notes)
    }
    case 'mep': {
      const r = calcMep(geometry, job.mep)
      y = drawMepTakeoff(doc, y, r)
      return noteList(doc, y + 4, r.notes)
    }
    case 'painting': {
      const r = calcPainting(geometry, job.painting, job.roofing, job.fascias, geometry.doorCount)
      y = drawPaintingTakeoff(doc, y, job, r)
      return noteList(doc, y + 4, r.notes)
    }
    case 'externals': {
      const r = calcExternals(geometry, job.externals)
      y = drawExternalsTakeoff(doc, y, r)
      return noteList(doc, y + 4, r.notes)
    }
    case 'scaffolding': {
      const r = calcScaffold(geometry, job.scaffold)
      y = drawScaffoldTakeoff(doc, y, r)
      return noteList(doc, y + 4, r.notes)
    }
    default:
      return line(doc, y, 'Not exported', 'No take-off drawer for this section yet')
  }
}

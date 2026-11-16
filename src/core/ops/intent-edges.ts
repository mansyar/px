/**
 * Design-driven edge treatments.
 *
 * The edge class of a pixel is decided from the entry snapshot — before this
 * pass writes anything — by looking at the painted pixel and its four
 * neighbours:
 *
 *   - transparent neighbour            -> silhouette
 *   - different part, different material -> material
 *   - different part, same material, or
 *     same part with a different tone    -> detail
 *
 * Priority is silhouette > material > detail; when two neighbours yield the
 * same class the first one in N/E/S/W order wins, so the result is deterministic.
 * Outside the canvas counts as transparent. Only already-painted pixels are
 * recoloured, so the treatment never changes geometry or ownership.
 *
 * A treatment maps to a role of the *neighbour's* ramp family, falling back to
 * the pixel's own family when the neighbour is transparent (it has no family).
 * `none` paints nothing. A family lacking the role leaves the pixel alone.
 */

import type { SlotCanvas } from '../canvas.js';
import { roleSlot, type SlotRoles, TRANSPARENT_SLOT } from '../palette.js';
import type {
  Design,
  DesignEdgeClass,
  EdgeTreatment,
  OutlineWhere,
  Parts,
} from '../recipe/types.js';

type Offset = readonly [number, number];

const NEIGHBOURS_4: readonly Offset[] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

const CLASS_PRIORITY: readonly DesignEdgeClass[] = ['silhouette', 'material', 'detail'];

function edgeClass(
  here: number,
  hereOwner: number,
  neighbour: number,
  neighbourOwner: number,
  materialOfOwner: readonly string[],
): DesignEdgeClass | undefined {
  if (neighbour === TRANSPARENT_SLOT) {
    return 'silhouette';
  }
  const hereMaterial = materialOfOwner[hereOwner];
  const neighbourMaterial = materialOfOwner[neighbourOwner];
  if (neighbourOwner !== hereOwner && neighbourMaterial !== hereMaterial) {
    return 'material';
  }
  if (
    (neighbourOwner !== hereOwner && neighbourMaterial === hereMaterial) ||
    (neighbourOwner === hereOwner && neighbour !== here)
  ) {
    return 'detail';
  }
  return undefined;
}

function roleForTreatment(
  treatment: EdgeTreatment,
): 'outline' | 'shadow' | 'highlight' | undefined {
  return treatment === 'none' ? undefined : treatment;
}

export interface IntentEdgeInput {
  /** Painted slots at the moment the edge op runs. */
  source: Int16Array;
  /** Owners alongside `source`; UNOWNED means no declared part. */
  owners: Int16Array;
  roles: SlotRoles;
  parts: Parts;
  /** Owner index to declared part name. */
  ownerNames: ReadonlyMap<number, string>;
  design: Design;
  /** `inner` (default) borrows the neighbour's family; `outer` keeps the part's own. */
  where?: OutlineWhere;
}

/** Returns how many pixels were recoloured; zero means the pass was a no-op. */
export function applyIntentEdges(canvas: SlotCanvas, input: IntentEdgeInput): number {
  const { width, height } = canvas;
  const { source, owners, roles, design } = input;
  const materialOfOwner: string[] = [];
  for (const [owner, name] of input.ownerNames) {
    materialOfOwner[owner] = input.parts[name]?.material ?? '';
  }

  // All sets are chosen up front from the entry snapshot, then written in one
  // pass: a pixel recoloured here must not change the class of its neighbour.
  const writes: Array<{ index: number; slot: number }> = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const here = source[index] ?? TRANSPARENT_SLOT;
      if (here === TRANSPARENT_SLOT) {
        continue;
      }
      const hereOwner = owners[index] ?? -1;
      const found: Partial<Record<DesignEdgeClass, number>> = {};
      for (const [dx, dy] of NEIGHBOURS_4) {
        const nx = x + dx;
        const ny = y + dy;
        const inside = nx >= 0 && ny >= 0 && nx < width && ny < height;
        const neighbourIndex = inside ? ny * width + nx : -1;
        const neighbour = inside ? (source[neighbourIndex] ?? TRANSPARENT_SLOT) : TRANSPARENT_SLOT;
        const neighbourOwner = inside ? (owners[neighbourIndex] ?? -1) : -1;
        const foundClass = edgeClass(here, hereOwner, neighbour, neighbourOwner, materialOfOwner);
        if (foundClass !== undefined && found[foundClass] === undefined) {
          found[foundClass] = neighbourIndex;
        }
      }
      for (const edgeKind of CLASS_PRIORITY) {
        const neighbourIndex = found[edgeKind];
        if (neighbourIndex === undefined) {
          continue;
        }
        const treatment = design.edges[edgeKind] as EdgeTreatment;
        const role = roleForTreatment(treatment);
        if (role === undefined) {
          break;
        }
        // Transparent neighbours have no family; the part's own ramp supplies
        // the role instead. Otherwise the neighbour's ramp owns the boundary.
        const fromSlot =
          input.where === 'outer' ||
          neighbourIndex < 0 ||
          source[neighbourIndex] === TRANSPARENT_SLOT
            ? here
            : (source[neighbourIndex] ?? here);
        const write = roleSlot(roles, fromSlot, role);
        if (write !== undefined && write !== here) {
          writes.push({ index, slot: write });
        }
        break;
      }
    }
  }

  for (const { index, slot } of writes) {
    canvas.set(index % width, Math.floor(index / width), slot);
  }
  return writes.length;
}

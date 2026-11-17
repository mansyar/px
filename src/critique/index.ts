/**
 * Whole-image critique (FR-11, NFR-5).
 *
 * The numbers here are diagnostic proxies, not the project rubric's scores. A
 * criterion is compared against what the recipe's `design` block declares and
 * what the linter already found; `observed` is derived only from the compiled
 * sprite and those lint findings. No model, no file fetch, no clock, no RNG:
 * the same recipe, sprite and findings always produce the same report.
 */

import { getTemplate, SUBJECTS } from '../brief/index.js';
import type { CompiledRecipe } from '../core/compile.js';
import type { PxWarning } from '../core/errors.js';
import { planeDot, planeRole } from '../core/facing.js';
import { edgeClassCounts } from '../core/ops/intent-edges.js';
import { buildSlotRoles, roleSlot, TRANSPARENT_SLOT } from '../core/palette.js';
import type { Design, EdgeTreatment, RawOp, Recipe } from '../core/recipe/types.js';
import { EDGE_TREATMENTS, recipeParts } from '../core/recipe/types.js';
import type { LintFinding } from '../lint/index.js';
import { EMPTY_TRIM, type TrimBox, trimBounds } from '../meta/bounds.js';
import { sha256Hex } from '../render/render.js';

/** The six rubric criteria, in their exact names, in report order before ranking. */
export const CRITIQUE_CRITERIA = [
  'silhouette',
  'value_separation',
  'lighting',
  'edge_language',
  'cluster_discipline',
  'palette_craft',
] as const;
export type Criterion = (typeof CRITIQUE_CRITERIA)[number];

/** NFR-4: never emit more than this many fixes, whatever the true count. */
export const CRITIQUE_MAX_FIXES = 20;
/** FR-13: default streak a caller must report before stagnation is emitted. */
export const CRITIQUE_STAGNATION_CALLS = 4;

/**
 * A raw recipe op in the snake_case JSON form `px fix` appends to a layer. Every
 * required parameter is filled from the design, so no further information is
 * needed to apply it. `normalizeOp` turns it into a canonical `RawOp`.
 */
export interface CritiqueFixOp {
  op: string;
  [key: string]: unknown;
}

/** A complete, concrete recipe op plus the rationale and the claimed delta. */
export interface CritiqueFix {
  op: CritiqueFixOp;
  why: string;
  expected_delta: string;
}

/** One ranked entry in the gap report. */
export interface CritiqueFinding {
  index: number;
  criterion: Criterion;
  intended: string;
  observed: string;
  /** Absolute shortfall; part of a total order with criterion and op name. */
  gap: number;
  fix: CritiqueFix;
}

/** The intended vs observed reading for every criterion, including met ones. */
export interface CriterionObservation {
  criterion: Criterion;
  intended: string;
  observed: string;
  gap: number;
  met: boolean;
}

export interface StagnationSignal {
  streak: number;
  calls: number;
  fingerprint: string;
  message: string;
}

export interface CritiqueReport {
  canvas: { width: number; height: number };
  /** SHA-256 of painted count + trim bounds + sorted painted slot names. */
  fingerprint: string;
  /** SHA-256 of the PNG the same recipe renders to, for `px fix` staleness. */
  render_sha256: string;
  criteria: CriterionObservation[];
  findings: CritiqueFinding[];
  /** True count before the NFR-4 cap. */
  fixes_total: number;
  truncated: boolean;
  stagnation?: StagnationSignal;
  warnings: PxWarning[];
}

interface FixContext {
  compiled: CompiledRecipe;
  design: Design | undefined;
  layerId: string;
  /** A slot name guaranteed to resolve in the compiled palette. */
  color: string;
  /** A painted slot name, used as the source of a swap. */
  from: string;
}

interface Observation {
  criterion: Criterion;
  intended: string;
  observed: string;
  gap: number;
  fix: CritiqueFix | undefined;
}

function countPainted(flattened: Int16Array): number {
  let count = 0;
  for (const slot of flattened) {
    if (slot !== TRANSPARENT_SLOT) {
      count += 1;
    }
  }
  return count;
}

function paintedSlots(compiled: CompiledRecipe): string[] {
  const names = new Set<string>();
  for (const slot of compiled.flattened) {
    if (slot !== TRANSPARENT_SLOT) {
      names.add(compiled.slots.names[slot] ?? '?');
    }
  }
  return [...names].sort();
}

/**
 * The blockout template supplies the silhouette's minimum share for known
 * subjects; without a design block there is no target and no finding.
 */
function silhouetteTarget(design: Design | undefined): { min: number; hero: string } | undefined {
  if (design === undefined || !SUBJECTS.includes(design.subject)) {
    return undefined;
  }
  const template = getTemplate(design.subject);
  const hero = template.parts.find((part) => part.hero) ?? template.parts[0];
  if (hero === undefined) {
    return undefined;
  }
  return { min: hero.proportion.min, hero: hero.name };
}

function safeColor(compiled: CompiledRecipe, design: Design | undefined): string {
  if (design !== undefined) {
    for (const material of design.materials) {
      for (const role of ['outline', 'base', 'highlight', 'shadow']) {
        const name = `${material}.${role}`;
        if (compiled.slots.resolve(name) !== undefined) {
          return name;
        }
      }
    }
  }
  const painted = paintedSlots(compiled);
  if (painted.length > 0) {
    return painted[0];
  }
  return compiled.slots.names[0] ?? '';
}

function roleIsPainted(
  compiled: CompiledRecipe,
  roles: ReturnType<typeof buildSlotRoles>,
  slotIndex: number,
  role: 'outline' | 'shadow' | 'base' | 'highlight',
): boolean {
  const wanted = roleSlot(roles, slotIndex, role);
  return wanted !== undefined && compiled.flattened.includes(wanted);
}

function isEdgeTreatment(value: string): value is EdgeTreatment {
  return EDGE_TREATMENTS.some((entry) => entry === value);
}

function noTarget(criterion: Criterion): Observation {
  return {
    criterion,
    intended: 'n/a (no design block)',
    observed: 'n/a (no design block)',
    gap: 0,
    fix: undefined,
  };
}

function silhouette(
  compiled: CompiledRecipe,
  painted: number,
  bounds: TrimBox | null,
  design: Design | undefined,
  ctx: FixContext,
): Observation {
  const target = silhouetteTarget(design);
  const share = painted / (compiled.width * compiled.height);
  const fill =
    bounds === null || bounds.w === 0 || bounds.h === 0 ? 0 : painted / (bounds.w * bounds.h);
  const observed = `${painted} painted px, bbox fill ${fill.toFixed(2)}, canvas share ${share.toFixed(2)}`;
  if (target === undefined) {
    return {
      criterion: 'silhouette',
      intended: 'n/a (no design block)',
      observed,
      gap: 0,
      fix: undefined,
    };
  }
  const gap = Math.max(0, target.min - share);
  if (gap === 0) {
    return {
      criterion: 'silhouette',
      intended: `coverage >= ${target.min.toFixed(2)} (${target.hero})`,
      observed,
      gap: 0,
      fix: undefined,
    };
  }
  const op: CritiqueFixOp = {
    op: 'auto_outline',
    mode: '4-way',
    where: 'inner',
    color: ctx.color,
    selective: false,
    width: 1,
    target_layer: ctx.layerId,
  };
  return {
    criterion: 'silhouette',
    intended: `coverage >= ${target.min.toFixed(2)} (${target.hero} blockout)`,
    observed,
    gap,
    fix: {
      op,
      why: 'The painted share is below the blockout minimum; an outline grows the silhouette without inventing new shapes.',
      expected_delta: 'silhouette: +1 outline pass',
    },
  };
}

function valueSeparation(compiled: CompiledRecipe, design: Design | undefined): Observation {
  if (design === undefined) {
    return noTarget('value_separation');
  }
  const present = paintedSlots(compiled).length;
  const declared = Object.keys(design.values).length + 1;
  const gap = Math.max(0, declared - present);
  const observed = `${present} painted tones vs ${declared} intended (values + background)`;
  if (gap === 0) {
    return {
      criterion: 'value_separation',
      intended: `${declared} tones`,
      observed,
      gap: 0,
      fix: undefined,
    };
  }
  const op: CritiqueFixOp = {
    op: 'light',
    angle: design.light,
    form: 'round',
    ao: true,
    cast: null,
    cast_offset: 1,
    rim: 'edge',
    bands: Math.min(4, Math.max(2, declared)),
    band_scale: 'thickness',
  };
  return {
    criterion: 'value_separation',
    intended: `${declared} distinct tones`,
    observed,
    gap,
    fix: {
      op,
      why: 'Fewer tones are painted than the design declares; a banded light pass lays the missing steps into existing parts.',
      expected_delta: `value_separation: +${gap} tone${gap === 1 ? '' : 's'}`,
    },
  };
}

function lighting(
  compiled: CompiledRecipe,
  recipeOps: readonly RawOp[],
  design: Design | undefined,
): Observation {
  if (design === undefined) {
    return noTarget('lighting');
  }
  const roles = buildSlotRoles(compiled.slots);
  const faced = compiled.parts.filter((part) => part.facing !== undefined);
  let observed: string;
  let gap: number;
  let intended: string;
  if (faced.length > 0) {
    let agreeing = 0;
    let considered = 0;
    compiled.flattened.forEach((slot, index) => {
      const owner = compiled.owners[index] ?? -1;
      const part = compiled.parts[owner];
      if (slot === TRANSPARENT_SLOT || part === undefined || part.facing === undefined) {
        return;
      }
      considered += 1;
      const role = planeRole(planeDot(part.facing, design.light));
      if (roleIsPainted(compiled, roles, slot, role)) {
        agreeing += 1;
      }
    });
    const share = considered === 0 ? 0 : agreeing / considered;
    intended = 'faced pixels carry the role their plane takes under design.light';
    observed = `${agreeing}/${considered} faced pixels agree with ${design.light}`;
    gap = Number((1 - share).toFixed(4));
  } else {
    const agrees = recipeOps.some((op) => op.op === 'light' && op.angle === design.light);
    intended = `a light op at ${design.light}`;
    observed = agrees
      ? `light op agrees with ${design.light}`
      : `no light op agrees with ${design.light}`;
    gap = agrees ? 0 : 1;
  }
  if (gap === 0) {
    return { criterion: 'lighting', intended, observed, gap: 0, fix: undefined };
  }
  const op: CritiqueFixOp = {
    op: 'light',
    angle: design.light,
    form: 'round',
    ao: true,
    cast: null,
    cast_offset: 1,
    rim: 'edge',
    bands: 3,
    band_scale: 'thickness',
  };
  return {
    criterion: 'lighting',
    intended,
    observed,
    gap,
    fix: {
      op,
      why: 'Lighting does not follow the declared direction; a design-aligned light pass re-shades the existing parts.',
      expected_delta: 'lighting: +1 agreeing light',
    },
  };
}

function edgeLanguage(
  compiled: CompiledRecipe,
  recipe: Recipe,
  design: Design | undefined,
  ctx: FixContext,
): Observation {
  if (design === undefined) {
    return noTarget('edge_language');
  }
  const snapshot = edgeClassCounts({
    source: compiled.flattened,
    owners: compiled.owners,
    width: compiled.width,
    height: compiled.height,
    ownerNames: new Map<number, string>(
      compiled.parts.map((part, index): [number, string] => [index, part.name]),
    ),
    parts: recipeParts(recipe),
  });
  const roles = buildSlotRoles(compiled.slots);
  let covered = 0;
  let declared = 0;
  let declaredTreatment: EdgeTreatment = 'outline';
  for (const edgeClass of ['silhouette', 'material', 'detail'] as const) {
    const treatment = design.edges[edgeClass];
    if (!isEdgeTreatment(treatment) || treatment === 'none') {
      continue;
    }
    if (declared === 0) {
      declaredTreatment = treatment;
    }
    declared += 1;
    const painted = paintedSlots(compiled);
    const carries = painted.some((name) => {
      const slotIndex = compiled.slots.resolve(name);
      return slotIndex !== undefined && roleIsPainted(compiled, roles, slotIndex, treatment);
    });
    if (snapshot[edgeClass] > 0 && carries) {
      covered += 1;
    }
  }
  const observed =
    `${covered}/${declared} edge classes treated; ` +
    `${snapshot.silhouette}/${snapshot.material}/${snapshot.detail} silhouette/material/detail edge px`;
  const gap = declared - covered;
  if (gap === 0) {
    return {
      criterion: 'edge_language',
      intended: 'declared edge treatments applied',
      observed,
      gap: 0,
      fix: undefined,
    };
  }
  // Draw the declared treatment into the edge pixels: unlike `harmonize`, this
  // writes new pixels, so the fix has an observable effect on the render (AC-9).
  const family = paintedSlots(compiled)[0]?.split('.')[0] ?? '';
  const treatmentSlot = `${family}.${declaredTreatment}`;
  const color =
    family !== '' && compiled.slots.resolve(treatmentSlot) !== undefined
      ? treatmentSlot
      : ctx.color;
  const op: CritiqueFixOp = {
    op: 'auto_outline',
    mode: '4-way',
    where: 'inner',
    color,
    selective: false,
    width: 1,
    target_layer: ctx.layerId,
  };
  return {
    criterion: 'edge_language',
    intended: `edge treatments ${JSON.stringify(design.edges)} applied`,
    observed,
    gap,
    fix: {
      op,
      why: 'Edge-pixel classes do not carry their declared treatments; the emitted auto_outline pass redraws those edges on the target layer.',
      expected_delta: 'edge_language: +1 treated edge',
    },
  };
}

function clusterDiscipline(lint: readonly LintFinding[]): Observation {
  const cluster = lint
    .filter((finding) => finding.code === 'CLUSTER_THIN')
    .reduce((sum, finding) => sum + (finding.count ?? 1), 0);
  const secondary = lint.some(
    (finding) => finding.code === 'BANDING' || finding.code === 'DITHER_NOISE',
  );
  const observed = `${cluster} CLUSTER_THIN findings${secondary ? ' with banding/noise evidence' : ''}`;
  if (cluster === 0) {
    return {
      criterion: 'cluster_discipline',
      intended: '0 CLUSTER_THIN findings',
      observed,
      gap: 0,
      fix: undefined,
    };
  }
  const op: CritiqueFixOp = { op: 'deband' };
  return {
    criterion: 'cluster_discipline',
    intended: '0 CLUSTER_THIN findings',
    observed,
    gap: cluster,
    fix: {
      op,
      why: 'Thin clusters break discipline; a deband cleanup regularises equal-width runs.',
      expected_delta: 'cluster_discipline: -1 CLUSTER_THIN',
    },
  };
}

function paletteCraft(compiled: CompiledRecipe, design: Design | undefined): Observation {
  if (design === undefined) {
    return noTarget('palette_craft');
  }
  const painted = new Set(paintedSlots(compiled));
  const covered = design.materials.filter((material) =>
    [...painted].some((name) => name.startsWith(`${material}.`)),
  ).length;
  const gap = design.materials.length - covered;
  const observed = `${covered}/${design.materials.length} declared material families painted`;
  if (gap === 0) {
    return {
      criterion: 'palette_craft',
      intended: `${design.materials.length} painted families`,
      observed,
      gap: 0,
      fix: undefined,
    };
  }
  const missing = design.materials.find(
    (material) => ![...painted].some((name) => name.startsWith(`${material}.`)),
  );
  const to =
    compiled.slots.names.find((name) => name.startsWith(`${missing}.`)) ??
    compiled.slots.names[0] ??
    '';
  const from = [...painted].find((name) => name !== to) ?? '';
  const op: CritiqueFixOp = { op: 'replace_slot', from, to };
  return {
    criterion: 'palette_craft',
    intended: `${design.materials.length} painted families`,
    observed,
    gap,
    fix: {
      op,
      why: 'A declared material family is never painted; swapping one slot brings it into the image.',
      expected_delta: 'palette_craft: +1 painted family',
    },
  };
}

function rank(a: CritiqueFinding, b: CritiqueFinding): number {
  if (a.gap !== b.gap) {
    return b.gap - a.gap;
  }
  if (a.criterion !== b.criterion) {
    return a.criterion < b.criterion ? -1 : 1;
  }
  const left = JSON.stringify(a.fix.op);
  const right = JSON.stringify(b.fix.op);
  return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * SHA-256 of the canonical fingerprint string: painted count, trim bounds and
 * the sorted set of painted slot names. No state is kept between calls.
 */
export function critiqueFingerprint(compiled: CompiledRecipe): string {
  const bounds = trimBounds(compiled.flattened, compiled.width, compiled.height) ?? EMPTY_TRIM;
  const canonical =
    `px-critique-v1|painted=${countPainted(compiled.flattened)}` +
    `|bounds=${bounds.x},${bounds.y},${bounds.w},${bounds.h}` +
    `|slots=${paintedSlots(compiled).join(',')}`;
  return sha256Hex(new TextEncoder().encode(canonical));
}

/**
 * The fingerprint of any canvas with no painted pixels, for the empty-canvas
 * path where the compiler refuses to build parts that own nothing.
 */
export function emptyCritiqueFingerprint(): string {
  return sha256Hex(new TextEncoder().encode('px-critique-v1|painted=0|bounds=0,0,0,0|slots='));
}

/** Validate a caller-supplied `--previous` fingerprint. */
export function isFingerprint(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}

export interface BuildCritiqueInput {
  recipe: Recipe;
  compiled: CompiledRecipe;
  png: Uint8Array;
  lint: readonly LintFinding[];
  streak?: number;
  previous?: string;
}

/** Build the full, deterministic gap report. */
export function buildCritique(input: BuildCritiqueInput): CritiqueReport {
  const { recipe, compiled, png, lint } = input;
  const painted = countPainted(compiled.flattened);
  const bounds = trimBounds(compiled.flattened, compiled.width, compiled.height);
  const fingerprint = critiqueFingerprint(compiled);
  const design = recipe.design;
  const ctx: FixContext = {
    compiled,
    design,
    layerId: compiled.layers[0]?.id ?? '',
    color: safeColor(compiled, design),
    from: paintedSlots(compiled)[0] ?? '',
  };
  const recipeOps = recipe.layers.flatMap((layer) => [...layer.ops]);

  const observations: Observation[] = [
    silhouette(compiled, painted, bounds, design, ctx),
    valueSeparation(compiled, design),
    lighting(compiled, recipeOps, design),
    edgeLanguage(compiled, recipe, design, ctx),
    clusterDiscipline(lint),
    paletteCraft(compiled, design),
  ];
  const criteria: CriterionObservation[] = observations.map((observation) => ({
    criterion: observation.criterion,
    intended: observation.intended,
    observed: observation.observed,
    gap: observation.gap,
    met: observation.fix === undefined,
  }));

  const warnings: PxWarning[] = [];
  if (painted === 0) {
    warnings.push({
      code: 'W_CRITIQUE_EMPTY',
      message: 'The canvas is empty; there is nothing to critique.',
      hint: 'Draw something before running px critique.',
    });
    return {
      canvas: { width: compiled.width, height: compiled.height },
      fingerprint,
      render_sha256: sha256Hex(png),
      criteria,
      findings: [],
      fixes_total: 0,
      truncated: false,
      warnings,
    };
  }

  const allFindings: CritiqueFinding[] = [];
  for (const observation of observations) {
    if (observation.fix === undefined || observation.gap <= 0) {
      continue;
    }
    allFindings.push({
      index: 0,
      criterion: observation.criterion,
      intended: observation.intended,
      observed: observation.observed,
      gap: observation.gap,
      fix: observation.fix,
    });
  }
  const bounded = boundFindings(allFindings);

  const report: CritiqueReport = {
    canvas: { width: compiled.width, height: compiled.height },
    fingerprint,
    render_sha256: sha256Hex(png),
    criteria,
    findings: bounded.findings,
    fixes_total: bounded.fixes_total,
    truncated: bounded.truncated,
    warnings,
  };
  const stagnation = stagnationFor(fingerprint, input.streak, input.previous);
  if (stagnation !== undefined) {
    report.stagnation = stagnation;
  }
  return report;
}

/**
 * NFR-4: cap the emitted fixes while still reporting the true total and
 * whether anything was left out. Ranking (including the tie-break) happens
 * before the cut, so the emitted set is a stable prefix of the full order.
 */
export function boundFindings(allFindings: CritiqueFinding[]): {
  findings: CritiqueFinding[];
  fixes_total: number;
  truncated: boolean;
} {
  allFindings.sort(rank);
  const findings = allFindings.slice(0, CRITIQUE_MAX_FIXES);
  findings.forEach((finding, index) => {
    finding.index = index;
  });
  return {
    findings,
    fixes_total: allFindings.length,
    truncated: allFindings.length > findings.length,
  };
}

/** FR-13: caller-supplied streak and previous fingerprint, nothing retained. */
export function stagnationFor(
  fingerprint: string,
  streak: number | undefined,
  previous: string | undefined,
): StagnationSignal | undefined {
  if (streak === undefined || previous === undefined || !isFingerprint(previous)) {
    return undefined;
  }
  if (streak < CRITIQUE_STAGNATION_CALLS || previous !== fingerprint) {
    return undefined;
  }
  return {
    streak,
    calls: CRITIQUE_STAGNATION_CALLS,
    fingerprint,
    message: `No silhouette or value change across ${String(streak)} calls; try a different approach.`,
  };
}

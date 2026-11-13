/**
 * `light`: plane shading, form, ambient occlusion, cast and rim.
 *
 * Stage order is fixed: **plane -> form -> gloss -> AO -> cast -> rim**. Plane
 * shading runs first and is the only stage that reads `parts.<name>.facing`: it
 * paints each declared plane with the ramp role `dot(facing, towardLight)`
 * earns (the frame and the three-band arithmetic are pinned in
 * `src/core/facing.ts`). A part with no `facing` is skipped entirely, so an
 * older recipe renders exactly the bytes it rendered before the field existed.
 * Because plane shading is not part of `form`, `form: "flat"` still plane-shades
 * a part that declares a facing — a flat plane still faces somewhere — while
 * `form: "flat"` on a part with no facing still shades nothing.
 *
 * Every later stage refines within each part and resolves the pixel's ramp role,
 * which is why the plane stage writes a role rather than an arbitrary tone: an
 * AO step, a cloth dither cell or a `deband` run can only continue a ramp it can
 * name.
 *
 * The pass reads ownership and transparency from the snapshot taken at op
 * entry and writes only colours into the containing layer, so it never consumes
 * its own output and never writes an owner. `bevel` paints a one-pixel band on
 * each part's own silhouette; `round` bevels and then bands the part along the
 * light axis with the same occupied-rank arithmetic `ramp_fill` uses, restricted
 * to that part's pixels.
 *
 * AO follows form inside the same op: an opaque pixel whose 4-neighbour belongs
 * to another part with a greater `z` steps one role darker in its own family,
 * `highlight -> base -> shadow -> shadow`. Equal `z` never occludes, a
 * transparent gap never occludes, and the canvas edge is not a neighbour. AO
 * reads the pixel's current slot, so it deepens the form it just shaded.
 *
 * Cast comes next: every pixel of the `cast` part throws its own pixel of that
 * family's `shadow` role `cast_offset` steps along the light vector. A shadow
 * may land on a shorter or equal part, and it shades that surface without
 * taking the pixel from the part that owns it — the pass never changes
 * ownership of an owned pixel, so a cast is not a part overwrite. Space that
 * was transparent joins the caster's own mask, a strictly taller owner is
 * skipped, and so is the space outside the canvas. Both masks come from the
 * entry snapshot, so shadows never cast shadows.
 *
 * Rim closes the pass over the pixels that touch transparency, never the
 * interior. `edge` lights the normals that face the light and shadows the ones
 * that turn away; `selective` first borrows the `outline` of a neighbouring
 * family, then the part's own `outline`, then falls back to `edge`. Rim reads
 * the colour cast just wrote, so a shadow on a silhouette is recoloured.
 *
 * Gloss reshapes form per part, inside the form stage and before AO. `matte`
 * writes nothing beyond form; `metal` drops the shadow-side bevel and every
 * round band, keeping one hard diagonal band of `highlight` on the second
 * closest light-axis rank instead of any diffuse falloff; `gem` lights its
 * whole silhouette plus the middle third of ranks; `cloth` dithers the shadow
 * band between `shadow` and `base` on `(x + y) % 2`, so the darkness frays
 * instead of stopping dead.
 *
 * Light travels *from* the named corner, so a `top-left` light throws a shadow
 * toward the bottom-right: the shadow step is `(+1, +1)` and the vector toward
 * the source is `(-1, -1)`. An outward normal — the direction of a transparent
 * or foreign neighbour — is lit when its dot product against the vector toward
 * the light is positive and dark when it is negative; `0` keeps the role the
 * pixel already has. The steps are exact unit diagonals, so a 4-neighbour
 * normal reaches `+1` or `-1` and never `0`.
 *
 * Roles resolve from the part's material family, never from the pixel's slot,
 * and a family that lacks the role a stage wants leaves the pixel alone instead
 * of failing: shading degrades, only the cast stage genuinely needs a role.
 * With no parts declared the whole layer is one implicit part with `matte`
 * gloss, `z = 0` and the palette's first family.
 */

import { type SlotCanvas, UNOWNED } from '../canvas.js';
import { planeDot, planeRole, SHADOW_STEP, towardLight } from '../facing.js';
import { type SlotRoles, type SlotTable, TRANSPARENT_SLOT } from '../palette.js';
import { partNames } from '../parts.js';
import type {
  GlossProfile,
  LightDir,
  LightForm,
  LightRim,
  Parts,
  RampRole,
} from '../recipe/types.js';
import { RAMP_ROLES } from '../recipe/types.js';
import { noRampError, type PassSite } from './pass.js';
import { bandRole, type RankedProjections, rankProjections } from './ramp.js';

/** `towardLight` lives with the frame that defines its sign; re-exported here. */
export { towardLight };

type Step = readonly [number, number];

/** Neighbour scan order is fixed so every rule resolves ties identically. */
const NEIGHBOURS_4: readonly Step[] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

/**
 * The role an outward normal takes from `dot(normal, towardLight(angle))`.
 *
 * `0` is perpendicular to the light: neither lit nor dark, so the pixel keeps
 * the role it already has. A 4-neighbour normal never reaches it, but the
 * convention is total rather than assuming its inputs.
 */
export function facingRole(dot: number): RampRole | undefined {
  if (dot > 0) {
    return 'highlight';
  }
  if (dot < 0) {
    return 'shadow';
  }
  return undefined;
}

/** The next role down the ramp; `outline` has no darker neighbour. */
function darkerRole(role: RampRole): RampRole | undefined {
  if (role === 'highlight') {
    return 'base';
  }
  if (role === 'base' || role === 'shadow') {
    return 'shadow';
  }
  return undefined;
}

export interface LightOptions {
  angle: LightDir;
  form: LightForm;
  ao: boolean;
  /** Caster part index, or null for no cast shadow. */
  cast: number | null;
  castOffset: number;
  rim: LightRim;
}

export interface LightResult {
  /** Colours written into the containing layer. */
  painted: number;
  /**
   * Cast destinations that left the canvas, with their count and the first one
   * in scan order; null when nothing was dropped. Landing on a higher-z part is
   * a deliberate skip, not a drop.
   */
  clipped: { count: number; first: [number, number] } | null;
}

/** What the pass needs to know about one part, resolved once per op. */
interface PartSurface {
  /** Palette family index of the part's material; undefined when it has none. */
  family: number | undefined;
  z: number;
  gloss: GlossProfile;
  /** Plane role the part's `facing` earns, or undefined when it declares none. */
  plane: RampRole | undefined;
}

export function applyLight(
  canvas: SlotCanvas,
  source: Int16Array,
  owners: Int16Array,
  roles: SlotRoles,
  slots: SlotTable,
  parts: Parts,
  options: LightOptions,
  site: PassSite,
): LightResult {
  const { width, height } = canvas;
  const names = partNames(parts);
  const declared = names.length > 0;
  const surfaces: PartSurface[] = declared
    ? names.map((name) => {
        const part = parts[name];
        const family = slots.families.findIndex((entry) => entry.name === part.material);
        return {
          family: family === -1 ? undefined : family,
          z: part.z,
          gloss: part.gloss,
          // The plane is a function of the declared facing and the light angle
          // only, so it resolves once per op rather than once per pixel.
          plane:
            part.facing === undefined ? undefined : planeRole(planeDot(part.facing, options.angle)),
        };
      })
    : [
        {
          family: slots.families.length === 0 ? undefined : 0,
          z: 0,
          gloss: 'matte',
          // An implicit part has no declaration, so it declares no facing and
          // keeps the tone it was painted with.
          plane: undefined,
        },
      ];

  const inside = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < width && y < height;
  const opaque = (x: number, y: number): boolean =>
    inside(x, y) && source[y * width + x] !== TRANSPARENT_SLOT;
  const ownerAt = (x: number, y: number): number => {
    if (!opaque(x, y)) {
      return UNOWNED;
    }
    return declared ? (owners[y * width + x] ?? UNOWNED) : 0;
  };
  const roleSlotFor = (owner: number, role: RampRole): number | undefined => {
    const family = surfaces[owner]?.family;
    if (family === undefined) {
      return undefined;
    }
    return roles.roleSlots[family]?.[role];
  };
  const roleOfSlot = (owner: number, slot: number): RampRole | undefined => {
    const family = surfaces[owner]?.family;
    if (family === undefined) {
      return undefined;
    }
    const table = roles.roleSlots[family];
    if (table === undefined) {
      return undefined;
    }
    for (const role of RAMP_ROLES) {
      if (table[role] === slot) {
        return role;
      }
    }
    return undefined;
  };
  const familyName = (owner: number): string => {
    const family = surfaces[owner]?.family;
    if (family === undefined) {
      return '';
    }
    return slots.families[family]?.name ?? '';
  };
  const toward = towardLight(options.angle);
  let painted = 0;

  /**
   * The role a pixel's silhouette earns, or undefined when nothing around it
   * faces the light either way.
   *
   * `silhouette` is what `bevel` tests: a foreign part is a boundary. Without
   * it only transparency counts, which is what `edge` means. The lit normal wins
   * at a corner because it is recorded first, the same precedence `auto_shade`
   * uses.
   */
  const outlineRole = (
    owner: number,
    x: number,
    y: number,
    silhouette: boolean,
  ): RampRole | undefined => {
    let lit = false;
    let dark = false;
    for (const [dx, dy] of NEIGHBOURS_4) {
      if (opaque(x + dx, y + dy) && (!silhouette || ownerAt(x + dx, y + dy) === owner)) {
        continue;
      }
      const role = facingRole(dx * toward[0] + dy * toward[1]);
      if (role === 'highlight') {
        lit = true;
      } else if (role === 'shadow') {
        dark = true;
      }
    }
    if (lit) {
      return 'highlight';
    }
    return dark ? 'shadow' : undefined;
  };

  /**
   * Plane shading: every pixel of a part that declared a facing takes the ramp
   * role its plane earns. Colour only — no owner argument reaches `set` — so a
   * colour pass cannot displace a part (the previous track's High was exactly a
   * pass writing owners it did not own).
   *
   * A part that declares no facing is skipped, which is what keeps older
   * recipes byte-identical: the stage does not "default to front" and recolour
   * anything, it does not run for that part at all.
   */
  const planeShade = (): void => {
    const targets = surfaces.map((surface, owner) =>
      surface.plane === undefined ? undefined : roleSlotFor(owner, surface.plane),
    );
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const owner = ownerAt(x, y);
        const target = targets[owner];
        if (owner === UNOWNED || target === undefined) {
          continue;
        }
        canvas.set(x, y, target);
        painted += 1;
      }
    }
  };

  const bevel = (): void => {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const owner = ownerAt(x, y);
        const surface = surfaces[owner];
        if (owner === UNOWNED || surface === undefined) {
          continue;
        }
        const role = outlineRole(owner, x, y, true);
        if (role === undefined) {
          continue;
        }
        // `metal` keeps its lit band and no diffuse shadow-side bevel.
        if (surface.gloss === 'metal' && role === 'shadow') {
          continue;
        }
        const target = roleSlotFor(owner, role);
        if (target === undefined) {
          continue;
        }
        canvas.set(x, y, target);
        painted += 1;
      }
    }
  };

  const roundBands = (): void => {
    for (let owner = 0; owner < surfaces.length; owner += 1) {
      const surface = surfaces[owner];
      if (surface === undefined || surface.gloss === 'metal') {
        continue;
      }
      const ranked = rankProjections(
        source,
        width,
        height,
        options.angle,
        declared ? owners : undefined,
        owner,
      );
      if (ranked === undefined) {
        continue;
      }
      for (const cell of ranked.cells) {
        const role = bandRole(Math.floor((cell.rank * 3) / ranked.occupiedCount), 3);
        const target = roleSlotFor(owner, role);
        if (target === undefined) {
          continue;
        }
        canvas.set(cell.x, cell.y, target);
        painted += 1;
      }
    }
  };

  const ambientOcclusion = (): void => {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const owner = ownerAt(x, y);
        const surface = surfaces[owner];
        if (owner === UNOWNED || surface === undefined) {
          continue;
        }
        const occluded = NEIGHBOURS_4.some(([dx, dy]) => {
          const neighbour = ownerAt(x + dx, y + dy);
          const other = surfaces[neighbour];
          return neighbour !== owner && other !== undefined && other.z > surface.z;
        });
        if (!occluded) {
          continue;
        }
        const role = roleOfSlot(owner, canvas.slots[y * width + x]);
        if (role === undefined) {
          continue;
        }
        const next = darkerRole(role);
        if (next === undefined) {
          continue;
        }
        const target = roleSlotFor(owner, next);
        if (target === undefined) {
          continue;
        }
        canvas.set(x, y, target);
        painted += 1;
      }
    }
  };

  let dropped = 0;
  let firstDropped: [number, number] | null = null;

  const castShadow = (): void => {
    if (options.cast === null) {
      return;
    }
    const caster = surfaces[options.cast];
    if (caster === undefined) {
      return;
    }
    const shadow = roleSlotFor(options.cast, 'shadow');
    if (shadow === undefined) {
      throw noRampError('light', familyName(options.cast), 'shadow', site);
    }
    const [stepX, stepY] = SHADOW_STEP[options.angle];
    const dx = stepX * options.castOffset;
    const dy = stepY * options.castOffset;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        // Caster membership comes from the snapshot, so a shadow never casts.
        if (ownerAt(x, y) !== options.cast) {
          continue;
        }
        const targetX = x + dx;
        const targetY = y + dy;
        if (!inside(targetX, targetY)) {
          // The offset pushed this destination off the canvas; count it so the
          // op can report one warning instead of silently dropping the shadow.
          dropped += 1;
          firstDropped ??= [targetX, targetY];
          continue;
        }
        const occupant = ownerAt(targetX, targetY);
        const other = surfaces[occupant];
        if (occupant !== UNOWNED && other !== undefined && other.z > caster.z) {
          continue;
        }
        // A shadow shades the surface it lands on; it does not take the pixel
        // from the part that owns it. Only empty space joins the caster's mask,
        // so W_PART_OVERWRITE stays for a genuine part-over-part repaint.
        canvas.set(targetX, targetY, shadow, occupant === UNOWNED ? options.cast : undefined);
        painted += 1;
      }
    }
  };

  const edgeTarget = (owner: number, x: number, y: number): number | undefined => {
    const role = outlineRole(owner, x, y, false);
    return role === undefined ? undefined : roleSlotFor(owner, role);
  };

  const selectiveTarget = (owner: number, x: number, y: number): number | undefined => {
    // A neighbour in another family lends its `outline`, so the pixel reads as a
    // rim against that family; scan order breaks ties and a family without an
    // outline falls back to the edge rule for that normal.
    for (const [dx, dy] of NEIGHBOURS_4) {
      const neighbour = ownerAt(x + dx, y + dy);
      const other = surfaces[neighbour];
      if (neighbour === UNOWNED || neighbour === owner || other === undefined) {
        continue;
      }
      const family = other.family;
      if (family === undefined || family === surfaces[owner]?.family) {
        continue;
      }
      const borrowed = roles.roleSlots[family]?.outline;
      if (borrowed !== undefined) {
        return borrowed;
      }
      const role = facingRole(dx * toward[0] + dy * toward[1]);
      const fallback = role === undefined ? undefined : roleSlotFor(owner, role);
      if (fallback !== undefined) {
        return fallback;
      }
    }
    const own = roleSlotFor(owner, 'outline');
    return own ?? edgeTarget(owner, x, y);
  };

  const rim = (): void => {
    if (options.rim === 'none') {
      return;
    }
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const owner = ownerAt(x, y);
        if (owner === UNOWNED || surfaces[owner] === undefined) {
          continue;
        }
        let boundary = false;
        for (const [dx, dy] of NEIGHBOURS_4) {
          if (!opaque(x + dx, y + dy)) {
            boundary = true;
            break;
          }
        }
        if (!boundary) {
          continue;
        }
        const target =
          options.rim === 'edge' ? edgeTarget(owner, x, y) : selectiveTarget(owner, x, y);
        if (target === undefined) {
          continue;
        }
        canvas.set(x, y, target);
        painted += 1;
      }
    }
  };

  /**
   * The part's pixels ranked by their projection on the light axis, or undefined
   * when the part owns none of them.
   */
  const partRanking = (owner: number): RankedProjections | undefined =>
    rankProjections(source, width, height, options.angle, declared ? owners : undefined, owner);

  const metalStreak = (owner: number): void => {
    const target = roleSlotFor(owner, 'highlight');
    const ranked = partRanking(owner);
    if (target === undefined || ranked === undefined) {
      return;
    }
    // One hard band, not a gradient: the second closest rank, or the only rank.
    const streak = ranked.occupiedCount > 1 ? 1 : 0;
    for (const cell of ranked.cells) {
      if (cell.rank !== streak) {
        continue;
      }
      canvas.set(cell.x, cell.y, target);
      painted += 1;
    }
  };

  const gemCore = (owner: number): void => {
    const target = roleSlotFor(owner, 'highlight');
    const ranked = partRanking(owner);
    if (target === undefined || ranked === undefined) {
      return;
    }
    for (const cell of ranked.cells) {
      const boundary = NEIGHBOURS_4.some(([dx, dy]) => !opaque(cell.x + dx, cell.y + dy));
      const middle = Math.floor((cell.rank * 3) / ranked.occupiedCount) === 1;
      if (!boundary && !middle) {
        continue;
      }
      canvas.set(cell.x, cell.y, target);
      painted += 1;
    }
  };

  const clothDither = (owner: number): void => {
    const shadow = roleSlotFor(owner, 'shadow');
    const base = roleSlotFor(owner, 'base');
    if (shadow === undefined || base === undefined) {
      return;
    }
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        // Only the band form already darkened; even cells keep the darkness.
        if (ownerAt(x, y) !== owner || canvas.slots[y * width + x] !== shadow) {
          continue;
        }
        if ((x + y) % 2 === 0) {
          continue;
        }
        canvas.set(x, y, base);
        painted += 1;
      }
    }
  };

  const gloss = (): void => {
    for (let owner = 0; owner < surfaces.length; owner += 1) {
      const surface = surfaces[owner];
      if (surface === undefined || surface.gloss === 'matte') {
        continue;
      }
      if (surface.gloss === 'metal') {
        metalStreak(owner);
      } else if (surface.gloss === 'gem') {
        gemCore(owner);
      } else {
        clothDither(owner);
      }
    }
  };

  // Stage order: plane -> form -> gloss -> AO -> cast -> rim. Plane shading is
  // independent of `form`, so `flat` keeps it and only skips the form stages.
  planeShade();
  if (options.form === 'bevel') {
    bevel();
  } else if (options.form === 'round') {
    bevel();
    roundBands();
  }
  gloss();
  if (options.ao) {
    ambientOcclusion();
  }
  castShadow();
  rim();

  return {
    painted,
    clipped: firstDropped === null ? null : { count: dropped, first: firstDropped },
  };
}

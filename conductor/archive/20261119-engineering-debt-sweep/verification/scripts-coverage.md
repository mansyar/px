# Script Coverage Baseline and Findings

- Track: 20261119-engineering-debt-sweep — Engineering Debt Sweep
- Phase: 1 — Bring `scripts/` under Biome
- Date: 2026-11-19
- Branch: `chore/20261119-engineering-debt-sweep`
- Base commit: `cbe85078ac2bb32ac03732a55fad044abd92b506`

## Result

**verified** — all seven `scripts/**/*.mjs` files are now covered by Biome with zero
findings; the primary's scoped lint, coverage and smoke checks all passed and are recorded
in §5.

## 1. Tooling baseline (P1.T1)

### 1.1 Script inventory

The brief's baseline states `scripts/` contains "exactly four helpers": `calibrate.mjs`,
`rubric.mjs`, `rubric-report.mjs`, `upscale.mjs`. A `glob scripts/**/*` inventory found
**seven** `.mjs` files by including the nested `scripts/calibrate/` directory:

| # | File | Baseline state |
|---|------|----------------|
| 1 | `scripts/calibrate.mjs` | unformatted (wrap/split sites) |
| 2 | `scripts/rubric.mjs` | unformatted (5 sites) |
| 3 | `scripts/rubric-report.mjs` | clean — no Biome findings |
| 4 | `scripts/upscale.mjs` | 2 `lint/suspicious/noAssignInExpressions` errors |
| 5 | `scripts/calibrate/ceiling.mjs` | double quotes, unsorted imports, 1 unused variable warning |
| 6 | `scripts/calibrate/variants.mjs` | double quotes, unsorted imports |
| 7 | `scripts/calibrate/views.mjs` | double quotes, long lines |

The `scripts/**/*.mjs` include added in this phase covers all seven, so all seven must
pass. This "four helpers" vs. seven-file discrepancy is recorded here as a factual
observation; all seven files are within the assigned `scripts/**/*.mjs` Touches path.

### 1.2 Biome include list (before)

`biome.json` `files.include`:

```json
["src/**/*.ts", "test/**/*.ts", "*.json", "*.ts"]
```

`scripts/**/*.mjs` was not included. A direct `pnpm exec biome check scripts/` at baseline
processed no files and exited 1 ("No files were processed") because every script was
excluded. Only `pnpm verify` (the phase verification command) and git inspection were run
directly by this agent; the scoped `pnpm exec biome check scripts/` and `pnpm lint` were
reserved for the primary, whose real results are now recorded in §5.

### 1.3 Out-of-scope `checkJs` probe baseline

A strict typing probe
(`tsc --ignoreConfig --noEmit --allowJs --checkJs --module nodenext --moduleResolution
nodenext --target ES2024 --types node --strict scripts/*.mjs`) produced **158 type errors**
at baseline. Full `checkJs` typing is explicitly OUT OF SCOPE for this phase; this number
is recorded only as a tooling baseline and was not re-derived by denied commands.

### 1.4 Protected artifact

`test/art/scores.json` baseline SHA-256:
`E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D`.
This file was never read for editing nor modified by this phase. `pnpm rubric:calibrate`
was not run (it writes probe/view artifacts). The primary's `Get-FileHash -Algorithm SHA256
test/art/scores.json` returned the same hash, confirming it is unchanged.

## 2. Config change (P1.T2.1)

`biome.json` `files.include` after the single config edit:

```json
["src/**/*.ts", "test/**/*.ts", "*.json", "*.ts", "scripts/**/*.mjs"]
```

- Only `scripts/**/*.mjs` was added.
- No linter rules were enabled, disabled, weakened, or given exceptions.
- No dependencies were added or changed.
- No Biome suppressions (`biome-ignore`) or escaped findings were introduced.

## 3. Finding inventory and fixes (P1.T2.2)

After adding the include, `pnpm verify` reported **9 errors and 2 warnings**. All findings
in `scripts/` were corrected with source formatting/code fixes only.

| File | Findings (after include, before fixes) | Resolution |
|------|------------------------------------------|------------|
| `scripts/calibrate.mjs` | format diff — ~14 wrap/split sites (long `join(ROOT, 'conductor/tracks/...')` constants, multi-line `lines.push(...)`, wrapped `stdout.write`/`stderr.write` templates, nested `views.map`/`assets.map` templates, wrapped `means`/`delta`/`meanAbs` ternaries, wrapped `selected` ternary, wrapped `throw new Error(...)`, expanded inline `entry` object) | Applied Biome formatter output (single quotes, semicolons, trailing commas, line width 100, 2-space indent) |
| `scripts/rubric.mjs` | format diff — 5 sites (wrapped `mean` expression, expanded inline `verdict` object, collapsed endpoint ternary, wrapped `process.stderr.write` on model-call failure, wrapped `problems.push(...)` on score validation) | Applied Biome formatter output |
| `scripts/rubric-report.mjs` | none | no change |
| `scripts/upscale.mjs` | 2 × `lint/suspicious/noAssignInExpressions` (CLI arg loop used `argv[(index += 1)]` twice) | Split into separate `index += 1;` statements followed by `out = argv[index];` and `factor = Number.parseInt(argv[index] ?? '', 10);` — behavior-identical |
| `scripts/calibrate/ceiling.mjs` | `assist/source/organizeImports` on `node:fs`; format diff (double→single quotes, several wraps); warning `lint/correctness/noUnusedVariables` on `materialOf` (line 43) | Sorted imports; applied Biome formatting; **removed the dead `materialOf` declaration** (a true dead-code removal, not an underscore-prefix suppression) |
| `scripts/calibrate/variants.mjs` | `assist/source/organizeImports` on `node:fs` and `node:path`; format diff (double→single quotes, several wraps) | Sorted imports; applied Biome formatting |
| `scripts/calibrate/views.mjs` | format diff (double→single quotes, wrapped `posix` arrow chain, wrapped `console.log` calls) | Applied Biome formatting |

Note: string literals containing an apostrophe (e.g. `"an outline tinted toward the
material's own hue..."` and `"each part painted from another family's ramp..."`) correctly
remain double-quoted under Biome's `quoteStyle: single` to avoid escaping.

`materialOf` was verified by `grep materialOf` to have exactly one occurrence (its own
declaration), confirming it was dead.

## 4. Before / after summary

| Metric | Before | After |
|--------|--------|-------|
| Files checked by `biome check .` | 216 | 223 (+7 scripts) |
| `pnpm exec biome check scripts/` | "No files were processed", exit 1 | exit 0 — `Checked 7 files in 23ms. No fixes applied.` (primary-run, §5) |
| Biome errors | 0 (scripts excluded) → 9 once included | 0 |
| Biome warnings | 1 (pre-existing test file) → 2 once included | 1 (pre-existing, out of scope) |
| Scripts with findings | 6 of 7 | 0 of 7 |
| `pnpm verify` exit | 0 (scripts not covered) | 0 (scripts covered) |

The single remaining warning is `test/recipe/version-1-2.test.ts:50:7
lint/style/noNonNullAssertion`, which is pre-existing and outside the assigned Touches;
it was left untouched.

## 5. PRIMARY-run checks (results recorded by this agent)

The brief reserved these commands for the primary. The primary executed them and supplied
the real results below; this agent did not run them and records them as primary results.

| Command | Exit | Result |
|---------|------|--------|
| `pnpm exec biome check scripts/` | 0 | `Checked 7 files in 23ms. No fixes applied.` — all seven `.mjs` files processed, zero errors |
| `pnpm lint` | 0 | `Checked 223 files in 166ms. No fixes applied. Found 1 warning.` — the pre-existing out-of-scope `noNonNullAssertion` at `test/recipe/version-1-2.test.ts:50` |
| `pnpm verify` | 0 | typecheck clean; 119 test files / 1028 tests passed; build clean |
| `pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens` | 0 | 116 test files / 996 tests passed; `All files 95.02% stmts / 85.72% branches / 98.33% funcs / 94.82% lines`, all above the 80% gate; benchmarks excluded |
| `node scripts/rubric.mjs --help` | 1 | usage output; identical exit to pre-change baseline (usage exits 1) |
| `node scripts/rubric-report.mjs --help` | 1 | usage output; identical exit to pre-change baseline |
| `node scripts/upscale.mjs` (no arguments) | 1 | usage output; identical exit to pre-change baseline |
| `node scripts/rubric-report.mjs` | 0 | `7 assets, 14 passes`, `mean 3.82 · pass · gemini-3.5-flash-lite`, unchanged |
| `Get-FileHash -Algorithm SHA256 test/art/scores.json` | 0 | `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D` unchanged |
| existing read-only gate report | — | covered by the primary's coverage run and `node scripts/rubric-report.mjs` result above; no separate output recorded |

The smoke checks that exit 1 are usage-only invocations whose exit code is unchanged from
the pre-change baseline; they are not regressions.

## 5a. Primary finalization observations

- The primary confirmed the tree is clean after this phase's two commits and that range
  `cbe85078..HEAD` is exactly those two commits and nine files, all within Touches.
- The primary removed a stray untracked duplicate `conductor/runs/` directory (caused by a
  path typo) outside this phase's scope; no tracked file was affected.

## 6. Commands actually run by this agent

| Command | Purpose | Exit |
|---------|---------|------|
| `pnpm verify` (baseline, unmodified repo) | capture baseline | 0 |
| `pnpm verify` (after all fixes) | phase verification | 0 |
| `git status --short --branch`, `git rev-parse HEAD`, `git log` (bounded) | git inspection | 0 |

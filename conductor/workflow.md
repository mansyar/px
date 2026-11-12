# Project Workflow

## Guiding Principles

1. **The plan is the source of truth.** Every phase, task, result, checkpoint, and evidence link lives in `plan.md`.
2. **The tech stack is deliberate.** A change to the stack is recorded in `tech-stack.md` before the implementation depends on it.
3. **Verification is agent-executed.** The phase subagent runs the configured checks and writes evidence. The user is not asked to manually verify routine work.
4. **Evidence over assertion.** A phase is complete only when the configured checks pass and the evidence file exists.
5. **No silent debt.** A finding is fixed, explicitly accepted with a reason, or tracked as an issue. It is never quietly ignored.
6. **Stay inside the phase contract.** `Touches` defines the expected blast radius. A required deviation is allowed, recorded, and reviewed.
7. **Determinism is not negotiable.** A byte-level change in rendered output is a behavior change and must be justified, versioned, and re-baselined deliberately — never absorbed silently by regenerating goldens.
8. **Non-interactive and CI-aware.** Prefer commands that terminate. Use `CI=true` for watch-mode tools where the ecosystem supports it.

## Workflow Config

```yaml
project:
  type: "node-cli-mcp-server"
  languages: ["typescript"]
commands:
  setup: "pnpm install"
  dev: "pnpm exec tsx src/cli.ts"
  test: "pnpm vitest run"
  coverage: "pnpm vitest run --coverage"
  lint: "pnpm biome check ."
  format: "pnpm biome check --write ."
  typecheck: "pnpm exec tsc --noEmit"
  build: "pnpm exec tsc -p tsconfig.build.json"
  verify_phase: "pnpm verify"
coverage:
  gate: 80
  scope: "new-code"
verification:
  layers: ["static", "unit", "integration", "smoke", "determinism"]
  retry: 2
  manual_exceptions: []
git:
  base_branch: "main"
  fetch: true
  commit_style: "conventional"
  task_commits: true
  phase_squash: true
review:
  strict: true
  issues:
    enabled: true
    auto_create: false
    min_severity: "medium"
    group_low: true
    labels: ["tech-debt", "conductor"]
pr:
  enabled: true
  tool: "gh"
  base: "main"
  media: "always"
  watch_ci: false
  watch_timeout_minutes: 15
  merge_method: "squash"
```

The coverage gate applies to `src/core/` and `src/lint/` only, enforced through the Vitest coverage `include` list rather than this file. `src/cli/` and `src/mcp/` are wiring and are exercised by the integration and smoke layers instead of by a percentage.

## Development Commands

### Setup

```bash
pnpm install
```

### Daily Development

```bash
# Run the CLI from source (no build step)
pnpm exec tsx src/cli.ts

# Run tests
pnpm vitest run

# Run coverage
pnpm vitest run --coverage

# Lint
pnpm biome check .

# Format
pnpm biome check --write .

# Typecheck
pnpm exec tsc --noEmit

# Build
pnpm exec tsc -p tsconfig.build.json
```

### Before Committing

```bash
pnpm verify
```

`pnpm verify` chains `typecheck → lint → test → build`. It is the single command a phase must pass.

## Phase & Task Workflow

Implementation is executed one phase at a time by a phase subagent. The primary agent owns `plan.md`, `metadata.json`, the registry, and review artifacts.

### Task Lifecycle

1. Read the phase contract in `plan.md`, the relevant requirements in `spec.md`, and the applicable style guides.
2. Work through the phase's tasks in order.
3. This project is **test-first**. Write the failing test before the implementation — including the golden fixture when the task changes rendered output.
4. Implement the smallest change that satisfies the task.
5. Run the targeted checks for the task.
6. Commit the task with a conventional commit message.
7. Report the task's status and commit SHA to the primary agent.

The subagent does **not** edit `plan.md`. The primary marks tasks complete after it accepts the phase.

### Deviations

- If the phase goal requires a file outside `Touches`, make the smallest necessary change and record it in the report under `deviations`.
- If the work requires a product or design decision, stop and report `blocked`.
- Do not silently expand scope, add a dependency, or migrate unrelated code.
- Adding a runtime dependency is a deviation requiring explicit approval — the single-runtime-dependency budget is a product constraint.

### Phase Completion

1. Run the phase's `Verification` command exactly as written in `plan.md`.
2. Run `verify_phase` when it is configured and different from the phase command.
3. Write the evidence file using the configured evidence path.
4. Return the structured report to the primary agent.
5. Do not merge, rebase, reset, push, open a PR, or edit Conductor state files.

## Verification Strategy

### Layers

- **Static:** typecheck, lint, build.
- **Unit:** per-op rasterizer behavior, palette resolution, validation, lint rules — pure functions over small inputs.
- **Integration:** the CLI end to end over temporary recipe directories: write a recipe, render, assert the emitted files and response envelope.
- **Smoke:** both binaries start and speak their protocol — `px --help` exits `0`, and `px-mcp` completes an MCP initialize handshake over stdio.
- **Determinism:** golden recipes re-rendered and compared by SHA-256 against committed hashes.

`e2e` arrives with the calibration phase (the four benchmark assets driven through the real agent loop). `visual` is unnecessary: byte comparison of PNG output is strictly stronger than image snapshot diffing.

### Commands

| Layer | Command | Required |
| --- | --- | --- |
| static | `pnpm typecheck && pnpm lint && pnpm build` | yes |
| unit | `pnpm vitest run --project unit` | yes |
| integration | `pnpm vitest run --project integration` | yes |
| smoke | `pnpm vitest run --project smoke` | yes |
| determinism | `pnpm vitest run --project goldens` | yes |

### Services and Fixtures

- **Services:** none.
- **Containers:** none.
- **Database:** none — the filesystem is the store.
- **Fixtures/seed data:** committed `.px.json` recipes under `test/benchmarks/`; golden hashes as text under `test/goldens/*.sha256`; temporary directories created and destroyed per integration test.
- **Environment variables:** none required. `CI=true` when running watch-capable tools.
- **Start/stop commands:** not applicable.

### Pass Criteria

- Every required command exits `0`.
- The coverage gate (80%) is met for new code in `src/core/` and `src/lint/`.
- Every acceptance criterion has a test or a documented evidence artifact.
- **Determinism:** every golden hash matches. A mismatch is a failure, not a baseline refresh. Re-baselining requires an explicit note in the plan phase explaining the byte-level cause.
- No new Critical or High review findings remain (strict mode: treat `warning` as blocking).

### Evidence

Write a report to:

```text
conductor/tracks/<track-id>/verification/phase-<n>.md
```

Include: title; track, phase, date, branch, base and head commits; result (`verified`, `failed`, `blocked`, or `partial`); a commands table (layer, command, exit, summary); an acceptance-criteria table (ID, criterion, evidence, status); golden hash results; evidence paths; deviations; and notes. Put binaries, screenshots, rendered PNGs, and large reports under `.conductor/evidence/`; that directory is gitignored. The report itself is committed with the track.

### Fallback Ladder

1. Run the full configured layer.
2. If `pnpm` is unavailable, enable it with `corepack enable pnpm` and retry.
3. If it still cannot run, run the narrowest reliable subset and mark the phase `partial` with the reason.
4. Stop and ask the user (via the question tool) only for credentials, hardware, or an external approval.

### Retry Policy

- A failed check may be fixed and re-run at most **2** times.
- If it still fails, report `failed` with the command and output.
- Never mark a phase `verified` when a required check did not run.

## Quality Gates

Before a phase is accepted:

- [ ] Required tests pass
- [ ] Coverage gate is met for the configured scope
- [ ] Lint and format checks pass
- [ ] Typecheck passes
- [ ] Build passes
- [ ] Golden hashes match, or each intentional change is documented and version-justified
- [ ] Output obeys the response envelope and terminology rules in `product-guidelines.md`
- [ ] Code follows the applicable `conductor/code_styleguides/`
- [ ] No secrets, credentials, or PII are introduced
- [ ] Public behavior is documented when it changed
- [ ] Evidence is written and linked in `plan.md`

## Commit Guidelines

### Message Format

```text
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat`: new feature
- `fix`: bug fix
- `docs`: documentation only
- `style`: formatting
- `refactor`: behavior-preserving change
- `test`: tests only
- `chore`: maintenance

### Scopes

`core`, `render`, `lint`, `cli`, `mcp`, `meta`, `test`, `docs`, `conductor`.

### Examples

```bash
git commit -m "feat(render): add bresenham line op with pixel-perfect corner removal"
git commit -m "fix(core): reject non-binary alpha at parse time"
git commit -m "test(goldens): pin sha256 fixture for the 16x16 potion"
```

Task-level commits are made by the phase subagent. The primary squashes them into one phase commit on acceptance, unless a foreign commit landed in the range. The plan update is a separate state commit.

## Definition of Done

A track is complete when:

1. Every phase is `verified` with a checkpoint and evidence.
2. The integrated verification on the track branch passes.
3. Review is `PASS`, or every finding is fixed, accepted with a reason, or tracked as an issue. Under strict mode, no `warning` or higher finding may remain unresolved without an explicit user override recorded in `review.md`.
4. Post-review documentation sync is complete.
5. The registry and `metadata.json` show the track as complete.
6. The branch is pushed, and a PR is open (or `pr_state: "unavailable"` records that PR creation could not run).

## Emergency Procedures

### Golden Hash Regression

The only true emergency in this project: a determinism break.

1. Stop. Do not regenerate goldens to make the suite green.
2. Determine whether the change is intended (an op's semantics changed) or accidental (an ordering, tie-break, or encoder drift).
3. If accidental, fix the cause and re-run the determinism layer.
4. If intended, bump the recipe format version if the on-disk meaning changed, document the byte-level cause in the phase evidence, and only then re-baseline.
5. If the drift appears only on one operating system, treat it as a zlib or integer-formatting portability bug, not a test flake.

### Single Runtime Dependency Breach

If a second runtime dependency appears in `package.json` `dependencies`, the phase is `failed` unless the addition was explicitly approved. The single-dependency budget is what keeps the CLI fast to start and trivial to vendor.

## Continuous Improvement

- Review this workflow after each track.
- Update commands and verification layers when the tooling changes.
- Record recurring review findings as process improvements.
- Keep the process as small as the project allows.

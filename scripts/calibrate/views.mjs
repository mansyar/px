#!/usr/bin/env node
/**
 * Render the three views the rubric judges, for the two assets the view
 * comparison uses, and register them by hash before any scoring call.
 *
 *   1x    — the artifact at the size the sprite is played at
 *   8x    — the plain nearest-neighbour upscale pass A currently scores
 *   debug — the debug sheet pass B currently scores
 *
 * Deterministic: no clock, no randomness, no environment reads.
 *
 *   node scripts/calibrate/views.mjs
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname ?? new URL(".", import.meta.url).pathname, "../..");
const OUT = join(ROOT, ".conductor/evidence/views");
const TRACK = join(ROOT, "conductor/tracks/20261113-rubric-view-comparison/verification/views");
const ASSETS = ["chest", "humanoid"];
const VIEWS = ["1x", "8x", "debug"];

/** The rule the harness applies, stored with the artifacts it will judge. */
const PLAN = {
  assets: ASSETS,
  views: VIEWS,
  repeats: 2,
  rule: {
    repeat_agreement: 1,
    max_criterion_delta: 1,
    max_mean_delta: 0.25,
    accept: "1x for assets at or above 32px",
    otherwise: "keep the 8x and debug artifacts",
  },
};

function run(command, args) {
  if (process.platform === "win32") {
    return spawnSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", command, ...args], {
      encoding: "utf8",
      windowsHide: true,
    });
  }
  return spawnSync(command, args, { encoding: "utf8" });
}

function hash(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

const posix = (value) => value.split(ROOT).join("").replace(/^[/\\]/, "").replaceAll("\\", "/");

mkdirSync(TRACK, { recursive: true });
const registry = [];

for (const asset of ASSETS) {
  const dir = join(OUT, asset);
  mkdirSync(dir, { recursive: true });
  const recipe = join(ROOT, `test/art/${asset}/${asset}.px.json`);
  const oneX = join(dir, "1x.png");

  const rendered = run("pnpm", [
    "exec",
    "tsx",
    "src/cli.ts",
    "render",
    "--file",
    posix(recipe),
    "--out",
    posix(oneX),
    "--debug",
  ]);
  if (rendered.status !== 0) {
    throw new Error(`render failed for ${asset}\n${rendered.stdout}\n${rendered.stderr}`);
  }
  const debugSheet = join(dir, "1x.debug.png");
  renameSync(debugSheet, join(dir, "debug.png"));

  const upscaled = run("pnpm", ["exec", "tsx", "scripts/upscale.mjs", posix(oneX)]);
  if (upscaled.status !== 0) {
    throw new Error(`upscale failed for ${asset}\n${upscaled.stdout}\n${upscaled.stderr}`);
  }
  copyFileSync(join(dir, "1x.8x.png"), join(dir, "8x.png"));

  const entries = {};
  for (const view of VIEWS) {
    const path = join(dir, `${view}.png`);
    entries[view] = { path: posix(path), sha256: hash(path) };
  }
  const { meta } = JSON.parse(readFileSync(recipe, "utf8"));
  registry.push({ asset, width: meta.width, height: meta.height, views: entries });
  console.log(`${asset} ${meta.width}x${meta.height}: ${VIEWS.map((v) => `${v} ${entries[v].sha256.slice(0, 8)}`).join(" · ")}`);
}

writeFileSync(
  join(TRACK, "artifacts.json"),
  `${JSON.stringify({ plan: PLAN, artifacts: registry }, null, 2)}\n`,
  "utf8",
);
console.log(`\nregistered ${registry.length} assets x ${VIEWS.length} views in ${posix(join(TRACK, "artifacts.json"))}`);

#!/usr/bin/env node
import { runCli } from './cli/main.js';

const exitCode = runCli(process.argv.slice(2), {
  cwd: process.cwd(),
  stdout: (text) => {
    process.stdout.write(text);
  },
  stderr: (text) => {
    process.stderr.write(text);
  },
});

process.exitCode = exitCode;

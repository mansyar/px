import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: [
            'test/unit/**/*.test.ts',
            'test/art/**/*.test.ts',
            'test/art-lint/**/*.test.ts',
            'test/ergonomics/**/*.test.ts',
            'test/facing/**/*.test.ts',
            'test/lint/**/*.test.ts',
            'test/ops/**/*.test.ts',
            'test/light/**/*.test.ts',
            'test/mcp/**/*.test.ts',
            'test/palettes/**/*.test.ts',
            'test/parts/**/*.test.ts',
            'test/stroke/**/*.test.ts',
            'test/texture/**/*.test.ts',
            'test/feedback/**/*.test.ts',
            'test/profiles/**/*.test.ts',
          ],
        },
      },
      {
        test: {
          name: 'integration',
          include: ['test/integration/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'smoke',
          include: ['test/smoke/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'goldens',
          include: ['test/goldens/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'benchmarks',
          include: ['test/benchmarks/**/*.test.ts'],
          // The performance proof is a wall-clock measurement: run the benchmark
          // files one at a time so the transcript replays cannot steal CPU from
          // the timed renders.
          fileParallelism: false,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/core/**', 'src/lint/**', 'src/meta/**', 'src/palettes/**'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});

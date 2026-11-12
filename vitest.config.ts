import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: [
            'test/unit/**/*.test.ts',
            'test/lint/**/*.test.ts',
            'test/ops/**/*.test.ts',
            'test/light/**/*.test.ts',
            'test/mcp/**/*.test.ts',
            'test/palettes/**/*.test.ts',
            'test/parts/**/*.test.ts',
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

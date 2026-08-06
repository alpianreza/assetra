const { createDefaultPreset } = require('ts-jest');

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['**/*.spec.ts'],
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: {
    ...tsJestTransformCfg,
  },
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  collectCoverageFrom: ['src/**/*.ts'],
  // Run suites serially: e2e suites share the same MySQL database, so parallel
  // workers would contend on the same rows and create cross-suite ordering/duplicate
  // state. Serial execution makes the full `pnpm test` run deterministic.
  maxWorkers: 1,
};

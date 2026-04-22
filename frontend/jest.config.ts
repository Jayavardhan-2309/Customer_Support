import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  clearMocks: true,
  collectCoverage: true,
  collectCoverageFrom: [
    "logger.ts",
    "src/lib/axios.ts",
    "app/staff/analytics/**/*.{ts,tsx}",
    "!app/staff/analytics/types.ts",
  ],
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testMatch: [
    "**/__tests__/**/*.test.ts",
    "**/__tests__/**/*.test.tsx",
  ],
};

export default config;

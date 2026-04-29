import { describe, expect, test } from "@jest/globals"

import { logger } from "../logger"

describe("logger", () => {
  test("exposes stable no-op logging methods", () => {
    expect(() => {
      logger.info("info")
      logger.warn("warn")
      logger.error("error", { status: 500 })
    }).not.toThrow()
  })
})

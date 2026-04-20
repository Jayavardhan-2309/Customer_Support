import { afterAll, afterEach, describe, expect, jest, test } from "@jest/globals"

describe("logger", () => {
  const originalEnv = process.env.NODE_ENV
  const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined)
  const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined)
  const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined)

  afterEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    ;(process.env as Record<string, string | undefined>).NODE_ENV = originalEnv
  })

  afterAll(() => {
    logSpy.mockRestore()
    warnSpy.mockRestore()
    errorSpy.mockRestore()
    ;(process.env as Record<string, string | undefined>).NODE_ENV = originalEnv
  })

  test("info logs outside production", async () => {
    ;(process.env as Record<string, string | undefined>).NODE_ENV = "test"
    const { logger } = await import("../logger")

    logger.info("hello", { ok: true })

    expect(logSpy).toHaveBeenCalledWith("[INFO] hello", { ok: true })
  })

  test("info is silent in production", async () => {
    ;(process.env as Record<string, string | undefined>).NODE_ENV = "production"
    const { logger } = await import("../logger")

    logger.info("hidden")

    expect(logSpy).not.toHaveBeenCalled()
  })

  test("warn and error always log", async () => {
    ;(process.env as Record<string, string | undefined>).NODE_ENV = "production"
    const { logger } = await import("../logger")

    logger.warn("warn message")
    logger.error("error message", { status: 500 })

    expect(warnSpy).toHaveBeenCalledWith("[WARN] warn message")
    expect(errorSpy).toHaveBeenCalledWith("[ERROR] error message", { status: 500 })
  })
})

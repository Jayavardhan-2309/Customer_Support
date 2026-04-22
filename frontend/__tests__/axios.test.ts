import { afterAll, afterEach, beforeAll, describe, expect, jest, test } from "@jest/globals"

import api, { fetchers } from "../src/lib/axios"
import { logger } from "../logger"

type AxiosHandler = {
  fulfilled?: (value: unknown) => unknown
  rejected?: (error: unknown) => Promise<unknown>
}

describe("api client", () => {
  const originalAlert = globalThis.alert
  const alertMock = jest.fn()
  const warnSpy = jest.spyOn(logger, "warn").mockImplementation(() => undefined)
  const errorSpy = jest.spyOn(logger, "error").mockImplementation(() => undefined)

  beforeAll(() => {
    Object.defineProperty(globalThis, "alert", {
      configurable: true,
      value: alertMock,
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  afterAll(() => {
    warnSpy.mockRestore()
    errorSpy.mockRestore()
    Object.defineProperty(globalThis, "alert", {
      configurable: true,
      value: originalAlert,
    })
  })

  const getRejectedHandler = () => {
    const handlers = (api.interceptors.response as unknown as { handlers: AxiosHandler[] }).handlers
    const handler = handlers[0]?.rejected
    if (!handler) {
      throw new Error("Response rejection handler not registered")
    }
    return handler
  }

  test("uses default base config", () => {
    expect(api.defaults.baseURL).toBe("/api/")
    expect(api.defaults.withCredentials).toBe(true)
    expect(api.defaults.headers["Content-Type"]).toBe("application/json")
  })

  test("fetchers unwrap response data", async () => {
    const getSpy = jest.spyOn(api, "get").mockResolvedValue({ data: { ok: true } } as never)
    const postSpy = jest.spyOn(api, "post").mockResolvedValue({ data: { created: true } } as never)
    const patchSpy = jest.spyOn(api, "patch").mockResolvedValue({ data: { updated: true } } as never)
    const deleteSpy = jest.spyOn(api, "delete").mockResolvedValue({ data: { deleted: true } } as never)

    await expect(fetchers.get("tickets")).resolves.toEqual({ ok: true })
    await expect(fetchers.post("tickets", { id: 1 })).resolves.toEqual({ created: true })
    await expect(fetchers.patch("tickets/1", { status: "done" })).resolves.toEqual({ updated: true })
    await expect(fetchers.delete("tickets/1")).resolves.toEqual({ deleted: true })

    expect(getSpy).toHaveBeenCalledWith("tickets")
    expect(postSpy).toHaveBeenCalledWith("tickets", { id: 1 })
    expect(patchSpy).toHaveBeenCalledWith("tickets/1", { status: "done" })
    expect(deleteSpy).toHaveBeenCalledWith("tickets/1")
  })

  test("alerts on network error", async () => {
    const rejected = getRejectedHandler()
    const error = { message: "offline" }

    await expect(rejected(error)).rejects.toBe(error)
    expect(alertMock).toHaveBeenCalledWith("Network error. Please check your connection.")
  })

  test("alerts on server error", async () => {
    const rejected = getRejectedHandler()
    const error = {
      message: "boom",
      response: {
        status: 500,
        data: { detail: "failed" },
      },
    }

    await expect(rejected(error)).rejects.toBe(error)
    expect(alertMock).toHaveBeenCalledWith("Server error. Please try again later.")
    expect(errorSpy).toHaveBeenCalledWith("API Error:", { detail: "failed" })
  })

  test("logs unauthorized responses before redirecting", async () => {
    const rejected = getRejectedHandler()
    const error = {
      message: "unauthorized",
      response: {
        status: 401,
        data: { detail: "expired" },
      },
    }

    await expect(rejected(error)).rejects.toBe(error)
    expect(warnSpy).toHaveBeenCalledWith("Unauthorized or session expired, redirecting to login")
    expect(errorSpy).toHaveBeenCalledWith("API Error:", { detail: "expired" })
  })
})

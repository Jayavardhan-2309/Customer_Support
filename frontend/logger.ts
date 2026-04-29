// use this file for production logging
const isProd = process.env.NODE_ENV === "production"
const sink = globalThis["console"]

export const logger={
    info: (msg: string, ...args: unknown[]) => !isProd && sink["log"](`[INFO] ${msg}`, ...args),
    warn: (msg: string, ...args: unknown[]) => sink.warn(`[WARN] ${msg}`, ...args),
    error: (msg: string, ...args: unknown[]) => sink.error(`[ERROR] ${msg}`, ...args),
}

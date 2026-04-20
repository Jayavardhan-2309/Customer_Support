// use this file for production logging
const isProd= process.env.NODE_ENV === "production"
export const logger={
    info: (msg: string, ...args: unknown[]) => !isProd && console.log(`[INFO] ${msg}`, ...args),
    warn: (msg: string, ...args: unknown[]) => console.warn(`[WARN] ${msg}`, ...args),
    error: (msg: string, ...args: unknown[]) => console.error(`[ERROR] ${msg}`, ...args),
}

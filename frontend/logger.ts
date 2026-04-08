// use this file for production logging
const isProd= true
export const logger={
    info: (msg: string, ...args: any[]) => !isProd && console.log(`[INFO] ${msg}`, ...args),
    warn: (msg: string, ...args: any[]) => console.warn(`[WARN] ${msg}`, ...args),
    error: (msg: string, ...args: any[]) => console.error(`[ERROR] ${msg}`, ...args),
}

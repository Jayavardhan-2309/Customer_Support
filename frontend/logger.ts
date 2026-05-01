type LogMethod = (message: string, ...args: unknown[]) => void;

const noop: LogMethod = () => undefined;

export const logger: Record<"info" | "warn" | "error", LogMethod> = {
  info: noop,
  warn: noop,
  error: noop,
};

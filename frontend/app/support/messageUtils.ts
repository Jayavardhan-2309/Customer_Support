import { Message } from "./types";

export const createMessage = (role: Message["role"], content: string): Message => ({
  id: `${role}-${Date.now()}-${(crypto.getRandomValues(new Uint32Array(1))[0] / 0x100000000).toString(36).slice(2)}`,
  role,
  content,
});

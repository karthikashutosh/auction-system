import { afterEach, vi } from "vitest";

process.env.REDIS_HOST = "localhost";
process.env.REDIS_PORT = "6379";

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

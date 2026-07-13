import { describe, expect, it } from "vitest";

describe("toolchain smoke test", () => {
  it("runs TypeScript tests via Vitest", () => {
    expect(1 + 1).toBe(2);
  });
});

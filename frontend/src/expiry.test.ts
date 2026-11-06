import { describe, it, expect } from "vitest";
import { formatRemaining } from "./expiry";

describe("remaining time", () => {
  const now = Date.parse("2026-11-06T00:00:00Z");
  const after = (minutes: number) => new Date(now + minutes * 60000).toISOString();
  it("formats minutes, hours and days", () => {
    expect(formatRemaining(after(13.2), now)).toBe("13min");
    expect(formatRemaining(after(95), now)).toBe("1,6h");
    expect(formatRemaining(after(24 * 60 + 11 * 60 + 55), now)).toBe("1,5d");
    expect(formatRemaining(after(0), now)).toBe("Abgelaufen");
  });
});

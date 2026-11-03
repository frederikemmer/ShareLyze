import { describe, expect, it } from "vitest";
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  hashSessionToken,
} from "../src/auth";

describe("password and session primitives", () => {
  it("uses salted hashes and verifies passwords", async () => {
    const first = await hashPassword("correct horse battery staple");
    const second = await hashPassword("correct horse battery staple");
    expect(first).not.toBe(second);
    expect(await verifyPassword("correct horse battery staple", first)).toBe(
      true,
    );
    expect(await verifyPassword("incorrect horse battery staple", first)).toBe(
      false,
    );
    expect(await verifyPassword("anything", "invalid")).toBe(false);
  });
  it("uses random tokens and stores a one-way digest", () => {
    const token = createSessionToken();
    expect(token).not.toEqual(createSessionToken());
    expect(hashSessionToken(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashSessionToken(token)).not.toContain(token);
  });
});

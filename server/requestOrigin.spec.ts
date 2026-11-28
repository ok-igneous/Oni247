import { describe, expect, it } from "vitest";
import { isSameOriginMutation } from "./requestOrigin";

describe("same-origin mutation validation", () => {
  it("accepts the public origin forwarded by the trusted Next.js proxy", () => {
    expect(isSameOriginMutation("https://shop.example.com", "http", "127.0.0.1:3001", "shop.example.com", "https")).toBe(true);
  });

  it("accepts the Render public hostname forwarded by Next.js", () => {
    expect(isSameOriginMutation("https://oni247-staging.onrender.com", "http", "127.0.0.1:3001", "oni247-staging.onrender.com", "https")).toBe(true);
  });

  it("rejects a genuinely different browser origin", () => {
    expect(isSameOriginMutation("https://attacker.example", "http", "127.0.0.1:3001", "shop.example.com", "https")).toBe(false);
  });

  it("rejects malformed or ambiguous forwarded headers", () => {
    expect(isSameOriginMutation("https://shop.example.com", "http", "127.0.0.1:3001", "shop.example.com, attacker.example", "https")).toBe(false);
    expect(isSameOriginMutation("not an origin", "http", "127.0.0.1:3001", "shop.example.com", "https")).toBe(false);
  });
});

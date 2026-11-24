import { afterEach, describe, expect, it } from "vitest";
import {
  getServerSessionOrThrow,
  NotAuthenticatedError,
} from "./getSetServerSession";

const originalJwtSecret = process.env.JWT_SECRET;

afterEach(() => {
  if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalJwtSecret;
});

describe("getServerSessionOrThrow", () => {
  it("surfaces server configuration errors instead of treating them as unauthenticated", async () => {
    delete process.env.JWT_SECRET;
    const request = new Request("https://oni247.test/_api/auth/session", {
      headers: { cookie: "oni247_session=not-a-valid-token" },
    });

    await expect(getServerSessionOrThrow(request)).rejects.toThrow(
      "JWT_SECRET must be configured with at least 32 characters.",
    );
    await expect(getServerSessionOrThrow(request)).rejects.not.toBeInstanceOf(
      NotAuthenticatedError,
    );
  });

  it("classifies an invalid signed token as unauthenticated when configuration is valid", async () => {
    process.env.JWT_SECRET = "test-secret-that-is-at-least-32-characters-long";

    const request = new Request("https://oni247.test/_api/auth/session", {
      headers: { cookie: "oni247_session=not-a-valid-token" },
    });

    await expect(getServerSessionOrThrow(request)).rejects.toBeInstanceOf(
      NotAuthenticatedError,
    );
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { proxyToApi } from "./nextApiProxy";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.unstubAllEnvs();
});

describe("Next.js private API proxy", () => {
  it("forwards cookies and rebuilds trusted host/protocol headers", async () => {
    vi.stubEnv("ONI247_API_INTERNAL_URL", "http://127.0.0.1:3001");
    const headers = new Headers();
    headers.append("set-cookie", "oni247_session=one; Path=/; HttpOnly");
    headers.append("set-cookie", "csrf=two; Path=/; SameSite=Lax");
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response("ok", { status: 200, headers }),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const request = new Request("https://shop.example.com/_api/auth/login?next=%2Fdashboard", {
      method: "POST",
      headers: {
        cookie: "oni247_session=old",
        "content-type": "application/json",
        "x-forwarded-host": "attacker.example",
        "x-forwarded-proto": "http",
      },
      body: JSON.stringify({ email: "owner@example.com" }),
    });

    const response = await proxyToApi(request, "/_api/auth/login");
    const [target, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];

    expect(String(target)).toBe("http://127.0.0.1:3001/_api/auth/login?next=%2Fdashboard");
    expect(init.headers).toBeInstanceOf(Headers);
    const forwarded = init.headers as Headers;
    expect(forwarded.get("cookie")).toBe("oni247_session=old");
    expect(forwarded.get("x-forwarded-host")).toBe("shop.example.com");
    expect(forwarded.get("x-forwarded-proto")).toBe("https");
    expect(forwarded.get("x-forwarded-host")).not.toBe("attacker.example");
    expect(response.status).toBe(200);
    const responseHeaders = response.headers as Headers & { getSetCookie?: () => string[] };
    expect(responseHeaders.getSetCookie?.()).toHaveLength(2);
  });

  it("returns a controlled 502 when the private API is unavailable", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error("connection refused");
    }) as typeof fetch;

    const response = await proxyToApi(
      new Request("https://oni247.org/_api/storefront?slug=nesmage"),
      "/_api/storefront",
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: "API service unavailable" });
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { proxyToApi } from "./nextApiProxy";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("proxyToApi", () => {
  it("forwards the original host and protocol and preserves multiple session cookies", async () => {
    const upstreamHeaders = new Headers({ "content-type": "application/json" });
    upstreamHeaders.append("set-cookie", "oni247_session=one; Path=/; HttpOnly; Secure");
    upstreamHeaders.append("set-cookie", "csrf_token=two; Path=/; SameSite=Lax");

    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      expect(String(input)).toBe("http://127.0.0.1:3001/_api/auth/session");
      const forwarded = new Headers(init?.headers);
      expect(forwarded.get("x-forwarded-host")).toBe("shop.example.com");
      expect(forwarded.get("x-forwarded-proto")).toBe("https");
      expect(forwarded.get("cookie")).toBe("existing_session=three");
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: upstreamHeaders });
    });
    vi.stubGlobal("fetch", fetchMock);

    const request = new Request("https://shop.example.com/_api/auth/session", {
      headers: { cookie: "existing_session=three" },
    });
    const response = await proxyToApi(request, "/_api/auth/session");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    const cookies = (response.headers as Headers & { getSetCookie: () => string[] }).getSetCookie();
    expect(cookies).toEqual([
      "oni247_session=one; Path=/; HttpOnly; Secure",
      "csrf_token=two; Path=/; SameSite=Lax",
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns a gateway error when the API service is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("connection refused")));
    const request = new Request("https://oni247.example/_api/landing");
    const response = await proxyToApi(request, "/_api/landing");

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "API service unavailable" });
  });
});

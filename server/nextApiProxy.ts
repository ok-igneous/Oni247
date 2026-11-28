const apiOrigin = () =>
  (process.env.ONI247_API_INTERNAL_URL || "http://127.0.0.1:3001").replace(/\/+$/, "");

const HOP_BY_HOP = new Set([
  "connection", "content-length", "expect", "host", "keep-alive",
  "proxy-authenticate", "proxy-authorization", "te", "trailer",
  "transfer-encoding", "upgrade",
]);

/** Forward same-origin API calls to the private Fastify process without losing cookies or tenant host context. */
export async function proxyToApi(request: Request, apiPath: string): Promise<Response> {
  const incoming = new URL(request.url);
  const target = new URL(apiPath + incoming.search, apiOrigin());
  const headers = new Headers();

  request.headers.forEach((value, key) => {
    const normalized = key.toLowerCase();
    if (HOP_BY_HOP.has(normalized) || normalized.startsWith("x-forwarded-")) return;
    headers.set(key, value);
  });

  // Next.js may expose an internal URL (for example http://0.0.0.0:10000)
  // behind Render even though the browser used the public Host header. Use
  // that received Host header for the public origin; never trust a client-
  // supplied X-Forwarded-Host. Render supplies X-Forwarded-Proto at the edge.
  const publicHost = request.headers.get("host")?.trim();
  const publicProto = request.headers.get("x-forwarded-proto")?.trim().toLowerCase();
  headers.set("x-forwarded-host", publicHost || incoming.host);
  headers.set(
    "x-forwarded-proto",
    publicProto === "https" || publicProto === "http"
      ? publicProto
      : incoming.protocol.slice(0, -1),
  );

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      ...(request.method === "GET" || request.method === "HEAD"
        ? {}
        : { body: await request.arrayBuffer() }),
      cache: "no-store",
      redirect: "manual",
    });

    const responseHeaders = new Headers();
    upstream.headers.forEach((value, key) => {
      if (key.toLowerCase() !== "set-cookie" && !HOP_BY_HOP.has(key.toLowerCase())) {
        responseHeaders.append(key, value);
      }
    });
    const cookieHeaders = upstream.headers as Headers & { getSetCookie?: () => string[] };
    const cookies = cookieHeaders.getSetCookie?.()
      ?? (upstream.headers.get("set-cookie") ? [upstream.headers.get("set-cookie")!] : []);
    for (const cookie of cookies) responseHeaders.append("set-cookie", cookie);

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch {
    return Response.json({ error: "API service unavailable" }, { status: 502 });
  }
}

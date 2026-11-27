const apiOrigin = (process.env.API_ORIGIN || "http://127.0.0.1:3001").replace(/\/+$/, "");
const HOP_BY_HOP = new Set([
  "connection", "content-length", "expect", "host", "keep-alive",
  "proxy-authenticate", "proxy-authorization", "te", "trailer",
  "transfer-encoding", "upgrade",
]);

/** Proxy a same-origin web request to the private Fastify API without losing host or cookie semantics. */
export async function proxyToApi(request: Request, apiPath: string): Promise<Response> {
  const incoming = new URL(request.url);
  const target = new URL(apiPath + incoming.search, apiOrigin);
  const headers = new Headers();

  request.headers.forEach((value, key) => {
    const normalized = key.toLowerCase();
    if (HOP_BY_HOP.has(normalized) || normalized.startsWith("x-forwarded-")) return;
    headers.set(key, value);
  });

  // These proxy headers are set by this server, not accepted from the client.
  // The Fastify API trusts exactly this one private Next.js proxy hop.
  headers.set("x-forwarded-host", incoming.host);
  headers.set("x-forwarded-proto", incoming.protocol.slice(0, -1));

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
    for (const cookie of upstream.headers.getSetCookie()) {
      responseHeaders.append("set-cookie", cookie);
    }

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch {
    return Response.json({ error: "API service unavailable" }, { status: 502 });
  }
}

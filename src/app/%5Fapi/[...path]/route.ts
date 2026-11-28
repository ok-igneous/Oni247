import { proxyToApi } from "../../../../server/nextApiProxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function proxyRequest(request: Request): Promise<Response> {
  const pathname = new URL(request.url).pathname;
  const suffix = pathname.slice("/_api".length) || "/";
  return proxyToApi(request, "/_api" + suffix);
}

export const GET = proxyRequest;
export const HEAD = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
export const OPTIONS = proxyRequest;

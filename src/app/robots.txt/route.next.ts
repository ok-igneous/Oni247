import { proxyToApi } from "../../../server/nextApiProxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return proxyToApi(request, "/robots.txt");
}

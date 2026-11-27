import { proxyToApi } from "../../server/nextApiProxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = (request: Request) => proxyToApi(request, "/robots.txt");
export const HEAD = GET;

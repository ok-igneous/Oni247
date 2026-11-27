import { proxyToApi } from "../../server/nextApiProxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = (request: Request) => proxyToApi(request, "/sitemap.xml");
export const HEAD = GET;

import { db } from "../helpers/db";
export async function handle(request: Request) {
  const origin = new URL(request.url).origin;
  const businesses = await db.selectFrom("businesses").select(["slug"]).where("status","=","published").execute();
  const urls: string[] = [origin + "/"];
  for (const b of businesses) {
    urls.push(`${origin}/store/${encodeURIComponent(b.slug)}`);
    const products = await db.selectFrom("products").select(["slug"]).where("businessId","in",db.selectFrom("businesses").select("id").where("slug","=",b.slug)).execute();
    for (const p of products) urls.push(`${origin}/store/${encodeURIComponent(b.slug)}/p/${encodeURIComponent(p.slug)}`);
   10	    const galleries = await db.selectFrom("galleries").select(["slug"]).where("businessId","in",db.selectFrom("businesses").select("id").where("slug","=",b.slug)).where("published","=",true).execute();
   11	    for (const g of galleries) urls.push(`${origin}/store/${encodeURIComponent(b.slug)}/g/${encodeURIComponent(g.slug)}`);
   12	  }
   13	  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u=>`<url><loc>${u.replaceAll("&","&amp;")}</loc></url>`).join("")}</urlset>`;
   14	  return new Response(xml,{headers:{"Content-Type":"application/xml; charset=utf-8"}});
   15	}

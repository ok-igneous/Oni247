import { db } from "../helpers/db";
import { subscriptionPlan } from "../helpers/subscriptionPlan";
export async function handle(request: Request) {
  const origin = new URL(request.url).origin;
  const businesses = await db.selectFrom("businesses").select(["id","slug","plan","websitePlan","trialEndsAt","planRenewsAt"]).where("status","=","published").execute();
  const urls: string[] = [origin + "/"];
  for (const b of businesses) {
    urls.push(`${origin}/${encodeURIComponent(b.slug)}`);
    const products = await db.selectFrom("products").select(["slug"]).where("businessId","=",b.id).execute();
    for (const p of products) urls.push(`${origin}/${encodeURIComponent(b.slug)}/p/${encodeURIComponent(p.slug)}`);
    const galleries = await db.selectFrom("galleries").select(["slug"]).where("businessId","=",b.id).where("published","=",true).execute();
    for (const g of galleries) urls.push(`${origin}/${encodeURIComponent(b.slug)}/g/${encodeURIComponent(g.slug)}`);
    const blogs = await db.selectFrom("blogPosts").select(["slug"]).where("businessId","=",b.id).where("published","=",true).execute();
    for (const post of blogs) urls.push(`${origin}/${encodeURIComponent(b.slug)}/b/${encodeURIComponent(post.slug)}`);
    const events = await db.selectFrom("events").select(["slug"]).where("businessId","=",b.id).where("published","=",true).execute();
    for (const event of events) urls.push(`${origin}/${encodeURIComponent(b.slug)}/e/${encodeURIComponent(event.slug)}`);
    const plan = subscriptionPlan.resolve(b);
    if (plan.canUseMultiPage) for (const page of ["products","services","about","gallery","blog","events","contact"]) urls.push(`${origin}/${encodeURIComponent(b.slug)}/${page}`);
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u=>`<url><loc>${u.replaceAll("&","&amp;")}</loc></url>`).join("")}</urlset>`;
  return new Response(xml,{headers:{"Content-Type":"application/xml; charset=utf-8","Cache-Control":"public, max-age=300, stale-while-revalidate=900"}});
}
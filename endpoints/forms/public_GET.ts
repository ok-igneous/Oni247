import superjson from "superjson";
import { db } from "../../helpers/db";
import { subscriptionPlan } from "../../helpers/subscriptionPlan";

export async function handle(request: Request) {
  try {
    const url = new URL(request.url); const slug = url.searchParams.get("slug") ?? ""; const formId = url.searchParams.get("formId") ?? "";
    const business = await db.selectFrom("businesses").select(["id","slug","name","logoUrl","appearanceSettings","status","plan","websitePlan","trialEndsAt","planRenewsAt"]).where("slug","=",slug).where("status","=","published").executeTakeFirst();
    if (!business || !subscriptionPlan.resolve(business).canUseForms) return new Response(superjson.stringify({error:"Form not found."}),{status:404});
    const form = await db.selectFrom("forms").select(["id","title","description","fields","submitLabel","successMessage","isActive"]).where("id","=",formId).where("businessId","=",business.id).where("isActive","=",true).executeTakeFirst();
    if (!form) return new Response(superjson.stringify({error:"Form not found."}),{status:404});
    return new Response(superjson.stringify({business:{slug:business.slug,name:business.name,logoUrl:business.logoUrl,appearanceSettings:business.appearanceSettings},form}),{headers:{"Content-Type":"application/json"}});
  } catch { return new Response(superjson.stringify({error:"Could not load form."}),{status:400}); }
}

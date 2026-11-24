import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { subscriptionPlan } from "../../helpers/subscriptionPlan";

export async function handle(request:Request){
 try{const {business}=await requireOwnedBusiness(request);if(!subscriptionPlan.resolve(business).canUseAdvancedMedia)return new Response(superjson.stringify({error:"The Media Library is a Premium Plus feature."}),{status:402});const assets=await db.selectFrom("mediaAssets").select(["id","kind","fileUrl","contentType","sizeBytes","createdAt"]).where("businessId","=",business.id).orderBy("createdAt","desc").limit(300).execute();return new Response(superjson.stringify({assets}),{headers:{"Content-Type":"application/json"}});}catch{return new Response(superjson.stringify({error:"Not authenticated"}),{status:401});}
}

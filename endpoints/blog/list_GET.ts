import superjson from "superjson";
import {db} from "../../helpers/db";
import {requireOwnedBusiness} from "../../helpers/requireOwnedBusiness";
import {subscriptionPlan} from "../../helpers/subscriptionPlan";
export async function handle(request:Request){try{const {business}=await requireOwnedBusiness(request);const posts=await db.selectFrom("blogPosts").select(["id","title","slug","excerpt","coverImageUrl","content","published","publishedAt"]).where("businessId","=",business.id).orderBy("createdAt","desc").execute();return new Response(superjson.stringify({posts,canEdit:subscriptionPlan.resolve(business).isPremium}),{headers:{"Content-Type":"application/json"}})}catch{return new Response(superjson.stringify({error:"Not authenticated"}),{status:401});}}

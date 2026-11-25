import superjson from "superjson";
import { z } from "zod";
import { sql } from "kysely";
import { db } from "../../helpers/db";
import { subscriptionPlan } from "../../helpers/subscriptionPlan";

const schema=z.object({slug:z.string().min(1).max(120),formId:z.string().uuid(),answers:z.record(z.unknown())});
export async function handle(request:Request){
 try{
  const input=schema.parse(superjson.parse(await request.text()));
  const business=await db.selectFrom("businesses").select(["id","status","plan","websitePlan","trialEndsAt","planRenewsAt"]).where("slug","=",input.slug).where("status","=","published").executeTakeFirst();
  if(!business||!subscriptionPlan.resolve(business).canUseForms)return new Response(superjson.stringify({error:"Form submission is unavailable."}),{status:404});
  const form=await db.selectFrom("forms").selectAll().where("id","=",input.formId).where("businessId","=",business.id).where("isActive","=",true).executeTakeFirst();
  if(!form)return new Response(superjson.stringify({error:"This form is closed."}),{status:400});
  const fields=Array.isArray(form.fields)?form.fields as Array<{id:string;label:string;type:string;required:boolean;options?:string[]}>:[];const clean:Record<string,unknown>={};
  for(const field of fields){const value=input.answers[field.id];if(field.type==="checkbox"&&value!==undefined&&typeof value!=="boolean")return new Response(superjson.stringify({error:`Choose a valid value for ${field.label}.`}),{status:400});if(field.required&&(value===undefined||value===null||String(value).trim()===""||value===false))return new Response(superjson.stringify({error:`${field.label} is required.`}),{status:400});if(value!==undefined&&value!==null){const text=String(value).trim();if(text.length>2000)return new Response(superjson.stringify({error:`${field.label} is too long.`}),{status:400});if(field.type==="select"&&field.options&&!field.options.includes(text))return new Response(superjson.stringify({error:`Choose a valid option for ${field.label}.`}),{status:400});if(field.type==="email"&&text&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text))return new Response(superjson.stringify({error:`Enter a valid email address.`}),{status:400});clean[field.id]=field.type==="checkbox"?value===true:text;}}
  await sql`INSERT INTO form_submissions (business_id, form_id, answers) VALUES (${business.id}::uuid, ${form.id}::uuid, ${clean}::jsonb)`.execute(db);
  return new Response(superjson.stringify({submitted:true,message:form.successMessage}),{headers:{"Content-Type":"application/json"}});
 }catch(error){return new Response(superjson.stringify({error:error instanceof Error?error.message:"Could not submit form."}),{status:400});}
}

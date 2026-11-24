import superjson from "superjson";
import { z } from "zod";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";

const mediaUrl=z.string().trim().max(1200).refine(value=>{if(value.startsWith("/_cdn/"))return true;try{const parsed=new URL(value);return parsed.protocol==="https:"||parsed.protocol==="http:";}catch{return false;}},"Use a valid uploaded media URL.");
const schema=z.object({kind:z.enum(["logo","product","gallery","background","video"]),fileUrl:mediaUrl,contentType:z.enum(["image/png","image/jpeg","image/webp","video/mp4","video/webm"]),sizeBytes:z.number().int().positive().max(50*1024*1024)});
export async function handle(request:Request){
 try{const {business}=await requireOwnedBusiness(request);const input=schema.parse(superjson.parse(await request.text()));if(input.kind==="video"?!input.contentType.startsWith("video/"):!input.contentType.startsWith("image/"))return new Response(superjson.stringify({error:"Media type does not match its category."}),{status:400});if(input.kind!=="video"&&input.sizeBytes>3*1024*1024)return new Response(superjson.stringify({error:"Images must be 3 MB or smaller."}),{status:400});await db.insertInto("mediaAssets").values({businessId:business.id,kind:input.kind,fileUrl:input.fileUrl,contentType:input.contentType,sizeBytes:input.sizeBytes}).execute();return new Response(superjson.stringify({saved:true}),{headers:{"Content-Type":"application/json"}});}catch(error){return new Response(superjson.stringify({error:error instanceof Error?error.message:"Could not register media."}),{status:400});}
}

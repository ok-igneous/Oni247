import superjson from "superjson";
import { nanoid } from "nanoid";
import { upload } from "@floot/storage";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { schema, type OutputType } from "./presign_POST.schema";

const EXTENSIONS: Record<string,string> = {"image/png":"png","image/jpeg":"jpg","image/webp":"webp"};

export async function handle(request: Request) {
   10	  let businessId: string;
   11	  try { businessId = (await requireOwnedBusiness(request)).business.id; }
   12	  catch { return new Response(superjson.stringify({error:"Create your business page before uploading images."}),{status:401}); }
   13	
   14	  try {
   15	    const input = schema.parse(superjson.parse(await request.text()));
   16	    const filename = `businesses/${businessId}/${input.kind}/${nanoid(16)}.${EXTENSIONS[input.contentType]}`;
   17	    const result = await upload({visibility:"public", filename, contentType:input.contentType, sizeBytes:input.sizeBytes});
   18	    if (!result.ok) return new Response(superjson.stringify({error:"Could not prepare the upload. Try a smaller image."}),{status:400});
   19	    return new Response(superjson.stringify({presignedUrl:result.presignedUrl,url:result.url} satisfies OutputType),{headers:{"Content-Type":"application/json"}});
   20	  } catch (error) {
   21	    return new Response(superjson.stringify({error:error instanceof Error ? error.message : "Could not prepare the upload."}),{status:400});
   22	  }
   23	}

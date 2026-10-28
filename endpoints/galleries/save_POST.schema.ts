import {z} from "zod"; import superjson from "superjson";
const text=(max:number)=>z.string().trim().max(max).nullish().transform(v=>v&&v.length?v:null);
const image=z.object({id:z.string().uuid().nullish(),imageUrl:z.string().url().max(1000),caption:text(300),altText:text(180),tag:text(80),sortOrder:z.number().int().min(0).max(9999)});
export const schema=z.object({id:z.string().uuid().nullish(),name:z.string().trim().min(1).max(100),description:text(500),slug:z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),coverImageUrl:z.string().url().max(1000).nullish(),published:z.boolean(),sortOrder:z.number().int().min(0).max(9999),images:z.array(image).max(200)});
export type InputType=z.infer<typeof schema>; export type OutputType={saved:true};
export const postSaveGallery=async(body:InputType,init?:RequestInit):Promise<OutputType>=>{const v=schema.parse(body);const r=await fetch("/_api/galleries/save",{method:"POST",body:superjson.stringify(v),...init,headers:{"Content-Type":"application/json",...(init?.headers??{})}});if(!r.ok){const e=superjson.parse<{error:string}>(await r.text());throw new Error(e.error)}return superjson.parse<OutputType>(await r.text());};

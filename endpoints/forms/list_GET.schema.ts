import superjson from "superjson";
import type { Field } from "./save_POST.schema";
export type FormItem={id:string;title:string;description:string|null;fields:Field[];submitLabel:string;successMessage:string;isActive:boolean};
export const getForms=async(init?:RequestInit):Promise<{forms:FormItem[]}>=>{const r=await fetch("/_api/forms/list",{method:"GET",...init,headers:{"Content-Type":"application/json",...(init?.headers??{})}});if(!r.ok){const e=superjson.parse<{error:string}>(await r.text());throw new Error(e.error)}return superjson.parse<{forms:FormItem[]}>(await r.text())};

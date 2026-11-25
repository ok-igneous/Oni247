import superjson from "superjson";
export type Field={id:string;label:string;type:"text"|"textarea"|"email"|"phone"|"number"|"date"|"select"|"checkbox";required:boolean;options?:string[]};
export type InputType={id?:string;title:string;description?:string|null;fields:Field[];submitLabel:string;successMessage:string;isActive:boolean};
export const postSaveForm=async(body:InputType,init?:RequestInit)=>{const r=await fetch("/_api/forms/save",{method:"POST",body:superjson.stringify(body),...init,headers:{"Content-Type":"application/json",...(init?.headers??{})}});if(!r.ok){const e=superjson.parse<{error:string}>(await r.text());throw new Error(e.error)}return superjson.parse<{saved:boolean}>(await r.text())};

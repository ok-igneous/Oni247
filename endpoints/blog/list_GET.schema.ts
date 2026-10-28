import superjson from "superjson";
export type BlogAdminPost={id:string;title:string;slug:string;excerpt:string|null;coverImageUrl:string|null;content:string;published:boolean;publishedAt:Date|null};
export type OutputType={posts:BlogAdminPost[];canEdit:boolean};
export const getBlogPosts=async(init?:RequestInit):Promise<OutputType>=>{const r=await fetch("/_api/blog/list",{...init,headers:{"Content-Type":"application/json",...(init?.headers??{})}});if(!r.ok)throw new Error(superjson.parse<{error:string}>(await r.text()).error);return superjson.parse<OutputType>(await r.text());};

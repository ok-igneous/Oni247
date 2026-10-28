import superjson from "superjson";
export type Gallery={id:string,name:string,description:string|null,slug:string,coverImageUrl:string|null,imageCount:number};
export type OutputType={galleries:Gallery[]};
export const getPublicGalleries=async(slug:string,init?:RequestInit):Promise<OutputType>=>{const r=await fetch("/_api/galleries/public-list?slug="+encodeURIComponent(slug),{...init,headers:{"Content-Type":"application/json",...(init?.headers??{})}});if(!r.ok){const e=superjson.parse<{error:string}>(await r.text());throw new Error(e.error)}return superjson.parse<OutputType>(await r.text());};

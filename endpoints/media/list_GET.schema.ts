import superjson from "superjson";
export type MediaAsset={id:string;kind:string;fileUrl:string;contentType:string;sizeBytes:string|number;createdAt:Date|string};
export const getMediaAssets=async(init?:RequestInit):Promise<{assets:MediaAsset[]}>=>{const r=await fetch("/_api/media/list",{method:"GET",...init,headers:{"Content-Type":"application/json",...(init?.headers??{})}});if(!r.ok){const e=superjson.parse<{error:string}>(await r.text());throw new Error(e.error)}return superjson.parse<{assets:MediaAsset[]}>(await r.text())};

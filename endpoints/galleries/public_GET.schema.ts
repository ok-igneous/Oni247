import superjson from "superjson";
export type Image={id:string,imageUrl:string,caption:string|null,altText:string|null,tag:string|null};
export type Gallery={id:string,name:string,description:string|null,slug:string,coverImageUrl:string|null,images:Image[]};
export type OutputType={business:{slug:string,name:string,description:string|null,logoUrl:string|null,themeId:string,appearanceSettings:Record<string,unknown>};gallery:Gallery};
export const getPublicGallery=async(slug:string,gallerySlug:string,init?:RequestInit):Promise<OutputType>=>{const p=new URLSearchParams({slug,gallerySlug});const r=await fetch("/_api/galleries/public?"+p.toString(),{...init,headers:{"Content-Type":"application/json",...(init?.headers??{})}});if(!r.ok){const e=superjson.parse<{error:string}>(await r.text());throw new Error(e.error)}return superjson.parse<OutputType>(await r.text());};

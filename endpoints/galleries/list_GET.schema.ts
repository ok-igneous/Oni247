import superjson from "superjson";
export type GalleryImage={id:string,imageUrl:string,caption:string|null,altText:string|null,tag:string|null,sortOrder:number};
export type Gallery={id:string,name:string,description:string|null,slug:string,coverImageUrl:string|null,published:boolean,sortOrder:number,images:GalleryImage[]};
export type OutputType={galleries:Gallery[],canEdit:boolean};
export const getGalleries=async(init?:RequestInit):Promise<OutputType>=>{const r=await fetch("/_api/galleries/list",{...init,headers:{"Content-Type":"application/json",...(init?.headers??{})}});if(!r.ok){const e=superjson.parse<{error:string}>(await r.text());throw new Error(e.error)}return superjson.parse<OutputType>(await r.text());};

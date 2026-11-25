import superjson from "superjson";
export type EventItem={id:string;title:string;slug:string;description:string;startsAt:Date|string;endsAt:Date|string|null;venue:string|null;registrationEnabled:boolean;approvalRequired?:boolean;registrationClosesAt:Date|string|null;capacity:number|null;formId:string|null;published:boolean;registrationCount:number;coverImageUrl:string|null};
export type EventFormOption={id:string;title:string;isActive:boolean;fields:Array<{id:string;label:string}>};
export type OutputType={events:EventItem[];forms:EventFormOption[]};
export const getEvents=async(init?:RequestInit):Promise<OutputType>=>{const r=await fetch("/_api/events/list",{method:"GET",...init,headers:{"Content-Type":"application/json",...(init?.headers??{})}});if(!r.ok){const e=superjson.parse<{error:string}>(await r.text());throw new Error(e.error)}return superjson.parse<OutputType>(await r.text())};

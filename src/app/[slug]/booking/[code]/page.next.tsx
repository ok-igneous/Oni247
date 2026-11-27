import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { BookingStatusNext } from "../../../_components/BookingFlow.next";
import { getStorefrontData, resolveStorefrontHost } from "../../../_lib/storefront.server";
export const dynamic = "force-dynamic";
type Props={params:Promise<{slug:string;code:string}>};
export async function generateMetadata():Promise<Metadata>{return {title:"Booking status",robots:{index:false,follow:false}};}
export default async function VanityBookingPage({params}:Props){const [{slug,code},h]=await Promise.all([params,headers()]);const host=h.get("host")??"";const resolved=await resolveStorefrontHost(host);if(!resolved.platformHost)notFound();const data=await getStorefrontData(slug);if(!data)notFound();return <BookingStatusNext data={data} code={code}/>;}

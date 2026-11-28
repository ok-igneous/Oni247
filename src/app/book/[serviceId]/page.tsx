import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { BookingRequestNext } from "../../_components/BookingFlow.next";
import { getStorefrontData, resolveStorefrontHost } from "../../_lib/storefront.server";
export const dynamic = "force-dynamic";
type Props={params:Promise<{serviceId:string}>};
export async function generateMetadata():Promise<Metadata>{return {title:"Book a service",robots:{index:false,follow:false}};}
export default async function CustomBookPage({params}:Props){const [{serviceId},h]=await Promise.all([params,headers()]);const host=h.get("host")??"";const resolved=await resolveStorefrontHost(host);if(!resolved.customDomain||!resolved.slug)notFound();const data=await getStorefrontData(resolved.slug);if(!data||!data.services.some(s=>s.id===serviceId))notFound();return <BookingRequestNext data={data} serviceId={serviceId} customDomain/>;}

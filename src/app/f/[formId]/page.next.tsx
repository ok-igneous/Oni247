import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import PublicFormNext from "../../_components/PublicForm.next";
import { resolveStorefrontHost } from "../../_lib/storefront.server";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ formId: string }> };
export async function generateMetadata(): Promise<Metadata> { return { title: "Form", robots: { index: false, follow: false } }; }
export default async function CustomDomainPublicFormPage({ params }: Props) {
 const [{ formId }, h] = await Promise.all([params, headers()]);
 const resolved = await resolveStorefrontHost(h.get("host") ?? "");
 if (!resolved.customDomain || !resolved.slug) notFound();
 return <PublicFormNext slug={resolved.slug} formId={formId} customDomain />;
}

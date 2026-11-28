import type { Metadata } from "next";
import PublicFormPage from "../../../_components/PublicFormPage.next";

type Props = { params: Promise<{ slug: string; formId: string }> };
export const metadata: Metadata = { title: "Registration form", robots: { index: false, follow: false } };
export default async function Page({ params }: Props) { const { slug, formId } = await params; return <PublicFormPage slug={slug} formId={formId} />; }

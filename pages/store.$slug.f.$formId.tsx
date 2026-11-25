import { useStorefrontRouteParams } from "../helpers/storefrontHost";
import { useStorefrontRouteParams } from "../helpers/storefrontHost";
import { useEffect,useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import superjson from "superjson";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Textarea } from "../components/Textarea";
import { getPublicForm } from "../endpoints/forms/public_GET.schema";
import { postSubmitForm } from "../endpoints/forms/submit_POST.schema";
import styles from "./store.$slug.e.$eventSlug.module.css";

type Field={id:string;label:string;type:"text"|"textarea"|"email"|"phone"|"number"|"date"|"select"|"checkbox";required:boolean;options?:string[]};
type FormData={business:{slug:string;name:string;logoUrl:string|null;appearanceSettings?:Record<string,unknown>};form:{id:string;title:string;description:string|null;fields:Field[];submitLabel:string;successMessage:string}};
export default function PublicFormPage(){const {slug="",formId=""}=useStorefrontRouteParams();const [data,setData]=useState<FormData|null>(null);const [answers,setAnswers]=useState<Record<string,unknown>>({});const [message,setMessage]=useState("");const [error,setError]=useState("");const [busy,setBusy]=useState(false);
 useEffect(()=>{let active=true;void getPublicForm(slug,formId).then(j=>{if(active)setData(j);}).catch(e=>{if(active)setError(e instanceof Error?e.message:"Form unavailable");});return()=>{active=false;};},[slug,formId]);
 const submit=async()=>{if(!data)return;setBusy(true);try{const j=await postSubmitForm({slug,formId,answers});setMessage(j.message??data.form.successMessage);}catch(e){setError(e instanceof Error?e.message:"Could not submit form");}finally{setBusy(false);}};
 if(error&&!data)return <main className={styles.page}><h1>Form unavailable</h1><p>{error}</p><Link to={`/${slug}`}>Return to business page</Link></main>;if(!data)return <main className={styles.page}>Loading form…</main>;
 const appearance=data.business.appearanceSettings??{};const footerMode=appearance.footerMode==="none"||appearance.footerMode==="selected"?appearance.footerMode:"all";const footerPages=Array.isArray(appearance.footerPages)?appearance.footerPages as string[]:[];const showFooter=footerMode==="all"||(footerMode==="selected"&&footerPages.includes("form-detail"));
 return <main className={styles.page}><Helmet><title>{data.form.title} — {data.business.name}</title></Helmet><header className={styles.header}>{data.business.logoUrl&&<img src={data.business.logoUrl} alt=""/>}<strong>{data.business.name}</strong><Link to={`/${slug}`}>Visit website</Link></header><section className={styles.content}><p className={styles.eyebrow}>FORM</p><h1>{data.form.title}</h1>{data.form.description&&<p>{data.form.description}</p>}{message?<p role="status">{message}</p>:<div className={styles.form}>{data.form.fields.map(f=><label key={f.id}>{f.label}{f.type==="textarea"?<Textarea rows={4} required={f.required} value={String(answers[f.id]??"")} onChange={e=>setAnswers(a=>({...a,[f.id]:e.target.value}))}/>:f.type==="select"?<select required={f.required} value={String(answers[f.id]??"")} onChange={e=>setAnswers(a=>({...a,[f.id]:e.target.value}))}><option value="">Choose…</option>{(f.options??[]).map(o=><option key={o}>{o}</option>)}</select>:f.type==="checkbox"?<input type="checkbox" checked={answers[f.id]===true} onChange={e=>setAnswers(a=>({...a,[f.id]:e.target.checked}))}/>:<Input type={f.type==="phone"?"tel":f.type} required={f.required} value={String(answers[f.id]??"")} onChange={e=>setAnswers(a=>({...a,[f.id]:e.target.value}))}/>}</label>)}{error&&<p role="alert">{error}</p>}<Button disabled={busy} onClick={()=>void submit()}>{busy?"Submitting…":data.form.submitLabel}</Button></div>}</section>{showFooter&&<footer className={styles.footer}>© {new Date().getFullYear()} {data.business.name}</footer>}</main>;
}

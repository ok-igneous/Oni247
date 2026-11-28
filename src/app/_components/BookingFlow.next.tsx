"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Lock, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../../components/Button";
import { Input } from "../../../components/Input";
import { Textarea } from "../../../components/Textarea";
import { formatMoney } from "../../../helpers/formatMoney";
import { postCreateBooking } from "../../../endpoints/bookings/create_POST.schema";
import { postBookingStatus, type OutputType as BookingStatus } from "../../../endpoints/bookings/status_POST.schema";
import { postBookingPay } from "../../../endpoints/bookings/pay_POST.schema";
import { StorefrontHeaderNext } from "./StorefrontHeader.next";
import { storeThemeEngine } from "../../../helpers/storeThemeEngine";
import type { OutputType as StorefrontData } from "../../../endpoints/storefront_GET.schema";
import styles from "../../../components/StoreServiceShell.module.css";

const LOCATION_LABEL = { business: "At the business", customer: "At your location", online: "Online" } as const;
type Props = { data: StorefrontData; customDomain?: boolean; serviceId?: string; code?: string };

function Shell({ data, customDomain, children }: { data: StorefrontData; customDomain: boolean; children: React.ReactNode }) {
 const b=data.business; const appearance=b.appearanceSettings??{}; const root=customDomain?"":`/${b.slug}`;
 const homePage=typeof appearance.homePage==="string"?appearance.homePage:"home";
 const home=homePage==="home"?(root||"/"):`${root}/${homePage}`;
 const theme=storeThemeEngine(b.themeId ?? "clean", appearance);
 return <div className={styles.site} style={theme.style as React.CSSProperties}>
  <StorefrontHeaderNext businessName={b.name} logoUrl={b.logoUrl} tagline={typeof appearance.headerTagline==="string"?appearance.headerTagline:""} headerBrand={typeof appearance.headerBrand==="string"?appearance.headerBrand:"logo_name"} headerAlignment={theme.headerAlignment} menuStyle={theme.menuStyle as "bar" | "minimal" | "pills"} menuPosition={theme.menuPosition as "left" | "center" | "right"} menuVisibility="always" navItems={[{label:"Home",href:home},{label:"Services",href:`${root}/services`},{label:"Contact",href:`${root}/contact`}]} showActions={false}/>
  <main className={styles.content}>{children}</main>
  {appearance.footerMode!=="none"&&<footer className={styles.footer}><Link href={home}>{b.name}</Link> · <Link href={`${root}/contact`}>Contact</Link></footer>}
 </div>;
}

export function BookingRequestNext({data,serviceId,customDomain=false}:Props) {
 const service=data.services.find(s=>s.id===serviceId); const b=data.business;
 const [name,setName]=useState(""); const [phone,setPhone]=useState(""); const [email,setEmail]=useState(""); const [date,setDate]=useState(""); const [time,setTime]=useState(""); const [location,setLocation]=useState(""); const [notes,setNotes]=useState(""); const [payNow,setPayNow]=useState(true); const [agree,setAgree]=useState(false); const [busy,setBusy]=useState(false); const [problem,setProblem]=useState("");
 const root=customDomain?"":`/${b.slug}`;
 if(!service) return <Shell data={data} customDomain={customDomain}><h1>Service not found</h1><p className={styles.muted}>This service may have been removed or is no longer taking bookings.</p><Link href={`${root}/services`}>Back to services</Link></Shell>;
 const online=service.payOnline===true&&service.amountDue!==undefined; const due=service.amountDue??0; const total=service.amountTotal??0; const paying=online&&payNow; const needsAgree=Boolean(service.terms);
 const fixedPrice=service.priceType==="contact"?"Contact for price":service.priceType==="fixed"?service.price:`From ${service.price}`;
 const includes = service.includes ?? [];
 async function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();setProblem("");if(!phone.trim()&&!email.trim())return setProblem("Add a phone number or an email so the business can reach you.");if(paying&&!email.trim())return setProblem("Enter your email address. Your payment receipt is sent there.");if(needsAgree&&!agree)return setProblem("Please agree to the booking terms to continue.");setBusy(true);try{const result=await postCreateBooking({slug:b.slug,serviceId:serviceId ?? "",name,phone:phone||undefined,email:email||"",date:date||undefined,time:time||undefined,location:location||undefined,notes:notes||undefined,payOnline:paying});if(result.paymentUrl){window.location.assign(result.paymentUrl);return;}window.location.assign(`${root}/booking/${encodeURIComponent(result.code)}`);}catch(e){setProblem(e instanceof Error?e.message:"Could not make the booking. Please try again.");}finally{setBusy(false);}}
 return <Shell data={data} customDomain={customDomain}>
  <Link className={styles.back} href={`${root}/s/${service.id}`}><ArrowLeft size={16}/> {service.name}</Link><p className={styles.eyebrow}>Book a service</p><h1>{service.name}</h1>
  <div className={styles.layout}>
   <form className={`${styles.card} ${styles.form}`} onSubmit={submit}><h2>Your details</h2>
    <div className={styles.field}><label htmlFor="booking-name">Full name</label><Input id="booking-name" value={name} onChange={e=>setName(e.target.value)} required maxLength={120}/></div>
    <div className={styles.two}><div className={styles.field}><label htmlFor="booking-phone">Phone</label><Input id="booking-phone" value={phone} onChange={e=>setPhone(e.target.value)} inputMode="tel" maxLength={40}/></div><div className={styles.field}><label htmlFor="booking-email">Email{paying?"":" (optional)"}</label><Input id="booking-email" type="email" value={email} onChange={e=>setEmail(e.target.value)} maxLength={200}/></div></div>
    {service.askSchedule!==false&&<div className={styles.two}><div className={styles.field}><label htmlFor="booking-date">Preferred date</label><Input id="booking-date" type="date" value={date} onChange={e=>setDate(e.target.value)}/></div><div className={styles.field}><label htmlFor="booking-time">Preferred time</label><Input id="booking-time" type="time" value={time} onChange={e=>setTime(e.target.value)}/></div></div>}
    {service.location==="customer"&&<div className={styles.field}><label htmlFor="booking-location">Address for the service</label><Input id="booking-location" value={location} onChange={e=>setLocation(e.target.value)} maxLength={300}/></div>}
    <div className={styles.field}><label htmlFor="booking-notes">Anything we should know? (optional)</label><Textarea id="booking-notes" rows={3} value={notes} onChange={e=>setNotes(e.target.value)} maxLength={1000}/></div>
    {online&&<div className={styles.field}><label>Payment</label><label className={`${styles.choice} ${payNow?styles.choiceOn:""}`}><input type="radio" name="booking-pay" checked={payNow} onChange={()=>setPayNow(true)}/><span><strong>{service.checkoutMode==="deposit"?`Pay a deposit of ${formatMoney(due,b.currency)} now`:`Pay ${formatMoney(due,b.currency)} now`}</strong><span className={styles.hint}>Secure online payment. Your booking is confirmed once it goes through.</span></span></label><label className={`${styles.choice} ${!payNow?styles.choiceOn:""}`}><input type="radio" name="booking-pay" checked={!payNow} onChange={()=>setPayNow(false)}/><span><strong>Send a request and pay later</strong><span className={styles.hint}>{b.name} will contact you to confirm and arrange payment.</span></span></label></div>}
    {needsAgree&&<><p className={styles.terms}>{service.terms}</p><label className={styles.agree}><input type="checkbox" checked={agree} onChange={e=>setAgree(e.target.checked)}/> I agree to these booking terms</label></>}
    {problem&&<p className={styles.error} role="alert">{problem}</p>}
    <div className={styles.actions}><Button type="submit" disabled={busy||!name.trim()}>{busy?"Please wait…":paying?<><Lock size={15}/> Continue to payment</>:"Send booking request"}</Button></div>
   </form>
   <aside className={`${styles.card} ${styles.summary}`}><h2>Summary</h2>{service.imageUrl&&<img src={service.imageUrl} alt=""/>}<strong>{service.name}</strong><div className={styles.line}><span>Price</span><span>{fixedPrice}</span></div>{service.duration&&<div className={styles.line}><span>Duration</span><span>{service.duration}</span></div>}<div className={styles.line}><span>Where</span><span>{LOCATION_LABEL[service.location??"business"]}</span></div>{includes.length>0&&<ul className={styles.includes}>{includes.map(x=><li key={x}>{x}</li>)}</ul>}{paying&&<>{service.checkoutMode==="deposit"&&<div className={styles.line}><span>Service total</span><span>{formatMoney(total,b.currency)}</span></div>}<div className={`${styles.line} ${styles.total}`}><span>{service.checkoutMode==="deposit"?"Deposit due now":"Due now"}</span><span>{formatMoney(due,b.currency)}</span></div></>}</aside>
  </div>
 </Shell>;
}

export function BookingStatusNext({data,code,customDomain=false}:Props) {
 const b=data.business; const [booking,setBooking]=useState<BookingStatus|null>(null); const [error,setError]=useState(""); const [loading,setLoading]=useState(true); const [paying,setPaying]=useState(false); const root=customDomain?"":`/${b.slug}`;
 const load=async()=>{setLoading(true);try{const result=await postBookingStatus({slug:b.slug,code:code??""});setBooking(result);setError("");}catch(e){setError(e instanceof Error?e.message:"Could not load booking.");}finally{setLoading(false);}};
 useEffect(()=>{void load();},[b.slug,code]);
 async function pay(){if(!booking)return;setPaying(true);try{const r=await postBookingPay({slug:booking.businessSlug,code:booking.code});window.location.assign(r.paymentUrl);}catch(e){toast.error(e instanceof Error?e.message:"Could not open the payment page.");setPaying(false);}}
 if(loading)return <Shell data={data} customDomain={customDomain}><p>Loading your booking…</p></Shell>;
 if(error||!booking)return <Shell data={data} customDomain={customDomain}><h1>We could not find that booking</h1><p className={styles.muted}>Check the booking code in your email or message and try again.</p><Link href={`${root}/services`}>Back to services</Link></Shell>;
 const paid=booking.paymentStatus==="paid"; const waiting=booking.canPay; const phone=b.whatsappNumber?.replace(/\D/g,"");
 return <Shell data={data} customDomain={customDomain}>
  <p className={styles.eyebrow}>Booking {booking.code}</p><h1>{booking.serviceName}</h1>
  {booking.status==="cancelled"?<div className={`${styles.banner} ${styles.bannerNeutral}`}><strong>This booking was cancelled.</strong><span className={styles.muted}>Contact {booking.businessName} if you would like to book again.</span></div>:paid?<div className={`${styles.banner} ${styles.bannerOk}`}><strong>Payment received. Your booking is confirmed.</strong><span className={styles.muted}>{booking.businessName} has been notified and will see you as arranged.</span></div>:waiting?<div className={`${styles.banner} ${styles.bannerWait}`}><strong>Waiting for your payment of {formatMoney(booking.amountDue,booking.currency)}</strong><span className={styles.muted}>If you just paid, give it a moment and check again.</span><div className={styles.actions}><Button onClick={()=>void pay()} disabled={paying}>{paying?"Opening…":"Pay now"}</Button><Button variant="outline" onClick={()=>void load()} disabled={loading}>I have paid, check again</Button></div></div>:<div className={`${styles.banner} ${styles.bannerNeutral}`}><strong>Your request has been sent.</strong><span className={styles.muted}>{booking.businessName} will contact you to confirm your booking{booking.checkoutMode==="enquiry"?" and arrange payment":""}.</span></div>}
  <div className={styles.card} style={{marginTop:18}}><h2>Details</h2><div className={styles.form}><div className={styles.line}><span>Booking code</span><strong>{booking.code}</strong></div>{(booking.preferredDate||booking.preferredTime)&&<div className={styles.line}><span>Preferred time</span><span>{[booking.preferredDate,booking.preferredTime].filter(Boolean).join(" at ")}</span></div>}{booking.amountTotal>0&&<div className={styles.line}><span>Service price</span><span>{formatMoney(booking.amountTotal,booking.currency)}</span></div>}{booking.amountDue>0&&<div className={styles.line}><span>Paid online</span><span>{paid?formatMoney(booking.amountDue,booking.currency):"Not yet"}</span></div>}<div className={styles.line}><span>Status</span><span style={{textTransform:"capitalize"}}>{booking.status}</span></div></div><p className={styles.hint}>Keep your booking code. You can open this page again from your confirmation message.</p>{phone&&<div className={styles.actions}><Button asChild variant="outline"><a href={`https://wa.me/${phone}?text=${encodeURIComponent(`Hello ${booking.businessName}, about my booking ${booking.code}.`)}`} target="_blank" rel="noreferrer"><MessageCircle size={16}/> Message on WhatsApp</a></Button></div>}</div>
 </Shell>;
}

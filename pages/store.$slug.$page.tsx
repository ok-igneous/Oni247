import { useStorefrontRouteParams } from "../helpers/storefrontHost";
import { Link, Navigate } from "react-router-dom";
import {useEffect,useState} from "react";
import {Helmet} from "react-helmet";
import {toast} from "sonner";
import {Button} from "../components/Button";
import {Input} from "../components/Input";
import {Textarea} from "../components/Textarea";
import {postStorefrontEnquiry} from "../endpoints/storefront/enquiry_POST.schema";
import {formatMoney} from "../helpers/formatMoney";
import {useStorefront} from "../helpers/useStorefront";
import {storeThemeEngine} from "../helpers/storeThemeEngine";
import {getPublicGalleries, type Gallery} from "../endpoints/galleries/publicList_GET.schema";
import {shareLink} from "../endpoints/share/page_GET.schema";
import styles from "./store.$slug.$page.module.css";
import { StorefrontHeader } from "../components/StorefrontHeader";
import { StoreServiceCard } from "../components/StoreServiceCard";
import { StoreCatalogue } from "../components/StoreCatalogue";
import { StoreCartDock } from "../components/StoreCartDock";
import { BlogList } from "../components/BlogList";
import { EventsList } from "../components/EventsList";
import { parseBlogSettings } from "../helpers/parseBlogSettings";
import { useStoreCart } from "../helpers/useStoreCart";
import { getPublicEvents, type PublicEventItem } from "../endpoints/events/publicList_GET.schema";
import { getStorefrontBaseUrl } from "../helpers/storefrontCanonical";

export default function StoreSectionPage(){
  const {slug,page}=useStorefrontRouteParams<{slug:string;page:string}>();
  const {data,isFetching,error}=useStorefront(slug);
  const [galleries,setGalleries]=useState<Gallery[]>([]);
  const [galleriesLoading,setGalleriesLoading]=useState(true);
  const [galleriesError,setGalleriesError]=useState(false);
  const [galleriesTry,setGalleriesTry]=useState(0);
  const [enquiry,setEnquiry]=useState({name:"",phone:"",email:"",message:""});
  const [sending,setSending]=useState(false);
  const [sent,setSent]=useState(false);
  const [allEvents,setAllEvents]=useState<PublicEventItem[]>([]);
  const [eventsLoading,setEventsLoading]=useState(false);
  const [shareOpen,setShareOpen]=useState(false);
  const cart=useStoreCart(slug??"unknown");
  const [cartOpen,setCartOpen]=useState(false);
  useEffect(()=>{if(page!=="gallery"||!slug)return;setGalleriesLoading(true);setGalleriesError(false);void getPublicGalleries(slug).then(r=>setGalleries(r.galleries)).catch(()=>{setGalleries([]);setGalleriesError(true);}).finally(()=>setGalleriesLoading(false));},[slug,page,galleriesTry]);
  useEffect(()=>{if(page!=="events"||!slug)return;setEventsLoading(true);void getPublicEvents(slug).then(r=>setAllEvents(r.events)).catch(()=>setAllEvents([])).finally(()=>setEventsLoading(false));},[slug,page]);
  if(isFetching)return <main className={styles.page}><p>Loading…</p></main>;
  if(error||!data)return <main className={styles.page}><h1>Page not found</h1></main>;
  const b=data.business;
  const mode=b.appearanceSettings?.siteMode==="multi_page"&&b.canUseMultiPage?"multi_page":"one_page";
  if(mode!=="multi_page")return <main className={styles.page}><h1>Premium Plus page</h1><p>This business is currently using its one-page website.</p><Link to={"/"+b.slug}>Back to website</Link></main>;
  const appearance=b.appearanceSettings??{};
  const t=storeThemeEngine(b.themeId,appearance);
  const pth=page||"about";
  const validPages=["products","services","about","gallery","blog","events","contact"];
  if(!validPages.includes(pth))return <Navigate to={"/"+b.slug} replace/>;
  const title=pth==="products"?"Products":pth==="services"?"Services":pth==="gallery"?"Gallery":pth==="blog"?"Blog":pth==="events"?"Events":pth==="contact"?"Contact":"About us";
  const share=()=>{const url=publicUrl;if(navigator.share&&/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)){void navigator.share({title:title+" — "+b.name,url}).catch(()=>{});}else setShareOpen(v=>!v);};
  const publicUrl=shareLink(b.slug,"page",pth);
  const shareText=encodeURIComponent(title+" — "+b.name+" "+publicUrl);
  const homePage=typeof appearance.homePage==="string"?appearance.homePage:"home";
  const footerMode=appearance.footerMode==="none"||appearance.footerMode==="selected"?appearance.footerMode:"all";
  const footerPages=Array.isArray(appearance.footerPages)?appearance.footerPages.filter((x):x is string=>typeof x==="string"):[];
  const showFooter=footerMode==="all"||(footerMode==="selected"&&footerPages.includes(pth==="about"?"about":pth));
  const sendEnquiry=async()=>{if(!slug||!enquiry.name.trim()||!enquiry.message.trim()){toast.error("Enter your name and message first.");return;}setSending(true);try{await postStorefrontEnquiry({slug,customerName:enquiry.name,customerPhone:enquiry.phone,customerEmail:enquiry.email,message:enquiry.message});setSent(true);setEnquiry({name:"",phone:"",email:"",message:""});}catch(e){toast.error(e instanceof Error?e.message:"Could not send your enquiry.");}finally{setSending(false);}};
  return <div className={styles.page} style={t.style as React.CSSProperties}>
    <Helmet>
      <title>{`${title} — ${b.name}`}</title>
      <meta name="description" content={b.description||title+" from "+b.name}/>
      <meta name="robots" content="index,follow,max-image-preview:large"/>
      <link rel="canonical" href={typeof window!=="undefined"?window.location.origin+window.location.pathname:"/"+b.slug+"/"+pth}/>
      <meta property="og:type" content="website"/>
      <meta property="og:title" content={title+" — "+b.name}/>
      <meta property="og:description" content={b.description||title+" from "+b.name}/>
      <meta property="og:url" content={typeof window!=="undefined"?window.location.origin+window.location.pathname:"/"+b.slug+"/"+pth}/>
      <meta name="twitter:card" content={(typeof b.appearanceSettings?.shareImageUrl==="string"&&appearance.shareImageUrl)||b.heroImageUrl||b.logoUrl?"summary_large_image":"summary"}/>
      <meta name="twitter:title" content={title+" — "+b.name}/>
      <meta name="twitter:description" content={b.description||title+" from "+b.name}/>
      {(typeof b.appearanceSettings?.shareImageUrl === "string" && appearance.shareImageUrl) || b.heroImageUrl || b.logoUrl ? <>
        <meta property="og:image" content={(typeof appearance.shareImageUrl==="string"&&appearance.shareImageUrl)||b.heroImageUrl||b.logoUrl||""}/>
        <meta name="twitter:image" content={(typeof appearance.shareImageUrl==="string"&&appearance.shareImageUrl)||b.heroImageUrl||b.logoUrl||""}/>
      </> : null}
      <script type="application/ld+json">{JSON.stringify({"@context":"https://schema.org","@type":"WebPage","name":title+" — "+b.name,"description":b.description||title+" from "+b.name,"url":typeof window!=="undefined"?window.location.origin+window.location.pathname:"/"+b.slug+"/"+pth,"isPartOf":{"@type":"WebSite","name":b.name,"url":typeof window!=="undefined"?getStorefrontBaseUrl(b.slug,window.location.origin,window.location.pathname):"/"+b.slug}}).replace(/</g,"\\u003c")}</script>
    </Helmet>
    <StorefrontHeader businessName={b.name} logoUrl={b.logoUrl} tagline={typeof appearance.headerTagline==="string"?appearance.headerTagline:""} headerBrand={typeof appearance.headerBrand==="string"?appearance.headerBrand:"logo_name"} headerAlignment={t.headerAlignment} menuStyle={t.menuStyle as "bar"|"minimal"|"pills"} menuPosition={t.menuPosition as "left"|"center"|"right"} menuVisibility={t.menuVisibility as "always"|"auto"} navItems={[{label:"Home",href:homePage==="home"?"/"+b.slug:"/"+b.slug+"/"+homePage},...["products","services","about","gallery","blog","events","contact"].filter(x=>x!==homePage&&(x!=="products"||data.products.length>0)&&(x!=="services"||data.services.length>0)&&(x!=="blog"||data.blogPosts.length>0)&&(x!=="events"||(data.events.length>0&&appearance.eventsPageInMenu===true))).map(x=>({label:x[0].toUpperCase()+x.slice(1),href:"/"+b.slug+"/"+x,active:x===pth})),{label:"Track order",href:"/"+b.slug+"/track"}]} />
    <main className={styles.main}><div className={styles.titleRow}><h1>{title}</h1></div>
    {pth==="about"&&<section><p>{b.description||"Learn more about this business."}</p>{b.address&&<p>{b.address}</p>}{b.openingHours&&<p>{b.openingHours}</p>}</section>}
    {pth==="products"&&<StoreCatalogue products={data.products} categories={data.categories} businessSlug={b.slug} linkToProducts={b.canUseProductLinks} cart={cart} onAddedToCart={()=>setCartOpen(true)}/>}
    {pth==="services"&&<div className={styles.grid}>{data.services.map(x=><StoreServiceCard key={x.id} service={x} businessSlug={b.slug} />)}</div>}
    {pth==="gallery"&&(galleriesLoading?<p>Loading galleries…</p>:galleriesError?<section><p>We could not load the galleries right now.</p><Button onClick={()=>setGalleriesTry(n=>n+1)}>Try again</Button></section>:galleries.length===0?<section><p>No public galleries have been added yet.</p></section>:<div className={styles.grid}>{galleries.map(g=><article key={g.id}>{g.coverImageUrl&&<Link to={"/"+b.slug+"/g/"+g.slug}><img src={g.coverImageUrl} alt={g.name} loading="lazy"/></Link>}<h2><Link to={"/"+b.slug+"/g/"+g.slug}>{g.name}</Link></h2>{g.description&&<p>{g.description}</p>}<p>{g.imageCount} {g.imageCount===1?"photo":"photos"}</p><Link to={"/"+b.slug+"/g/"+g.slug}>Open gallery →</Link></article>)}</div>)}
    {pth==="blog"&&<BlogList posts={data.blogPosts} settings={b.blogSettings??parseBlogSettings({})} businessSlug={b.slug}/>}
    {pth==="events"&&(eventsLoading?<p>Loading events…</p>:<EventsList events={allEvents} businessSlug={b.slug} showPast={appearance.showPastEvents===true}/>)}
    {pth==="contact"&&<section className={styles.contactSection}>{b.phone&&<p>Phone: <a href={"tel:"+b.phone}>{b.phone}</a></p>}{b.email&&<p>Email: <a href={"mailto:"+b.email}>{b.email}</a></p>}{b.whatsappNumber&&<p><a href={"https://wa.me/"+b.whatsappNumber.replace(/\D/g,"")} target="_blank" rel="noreferrer">Contact on WhatsApp</a></p>}{b.address&&<p>{b.address}</p>}<div className={styles.enquiryForm}><h2>Send an enquiry</h2>{sent?<p role="status">Thank you. Your enquiry has been sent to {b.name}.</p>:<><label>Your name<Input value={enquiry.name} onChange={e=>setEnquiry(v=>({...v,name:e.target.value}))} placeholder="Full name" required/></label><label>Phone or WhatsApp<Input value={enquiry.phone} onChange={e=>setEnquiry(v=>({...v,phone:e.target.value}))} placeholder="Phone number"/></label><label>Email (optional)<Input type="email" value={enquiry.email} onChange={e=>setEnquiry(v=>({...v,email:e.target.value}))} placeholder="you@example.com"/></label><label>How can we help?<Textarea value={enquiry.message} onChange={e=>setEnquiry(v=>({...v,message:e.target.value}))} rows={5} placeholder="Write your enquiry" required/></label><Button onClick={()=>void sendEnquiry()} disabled={sending}>{sending?"Sending…":"Send enquiry"}</Button></>}</div></section>}
    <div className={styles.shareBottom}><span>Share this page</span><div className={styles.shareWrap}><button type="button" className={styles.shareButton} onClick={share} aria-label="Share this page" aria-expanded={shareOpen}>Share</button>{shareOpen&&<div className={styles.shareMenu} aria-label="Share options"><a href={"https://wa.me/?text="+shareText} target="_blank" rel="noreferrer">WhatsApp</a><a href={"https://www.facebook.com/sharer/sharer.php?u="+encodeURIComponent(publicUrl)} target="_blank" rel="noreferrer">Facebook</a><a href={"https://www.linkedin.com/sharing/share-offsite/?url="+encodeURIComponent(publicUrl)} target="_blank" rel="noreferrer">LinkedIn</a><a href={"https://twitter.com/intent/tweet?text="+shareText} target="_blank" rel="noreferrer">X</a><button type="button" onClick={()=>{void navigator.clipboard.writeText(publicUrl).then(()=>{toast.success("Page link copied.");setShareOpen(false);},()=>toast.error("Could not copy the link."));}}>Copy link</button></div>}</div></div>
    </main>{showFooter&&<footer className={styles.footer}><Link to={homePage==="home"?"/"+b.slug:"/"+b.slug+"/"+homePage}>← Back to home</Link><span>© {new Date().getFullYear()} {b.name}</span></footer>}
    <StoreCartDock slug={b.slug} currency={b.currency} cart={cart} open={cartOpen} onOpenChange={setCartOpen}/>
  </div>;
}

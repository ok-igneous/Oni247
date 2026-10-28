import {Link,useParams} from "react-router-dom";
import {useEffect,useState} from "react";
import {Helmet} from "react-helmet";
import {toast} from "sonner";
import {Button} from "../components/Button";
import {Input} from "../components/Input";
import {Textarea} from "../components/Textarea";
import {postStorefrontEnquiry} from "../endpoints/storefront/enquiry_POST.schema";
import {formatMoney} from "../helpers/formatMoney";
   10	import {useStorefront} from "../helpers/useStorefront";
   11	import {storeThemeEngine} from "../helpers/storeThemeEngine";
   12	import {getPublicGalleries, type Gallery} from "../endpoints/galleries/publicList_GET.schema";
   13	import styles from "./store.$slug.$page.module.css";
   14	
   15	export default function StoreSectionPage(){
   16	  const {slug,page}=useParams<{slug:string;page:string}>();
   17	  const {data,isFetching,error}=useStorefront(slug);
   18	  const [galleries,setGalleries]=useState<Gallery[]>([]);
   19	  const [galleriesLoading,setGalleriesLoading]=useState(false);
   20	  const [enquiry,setEnquiry]=useState({name:"",phone:"",email:"",message:""});
   21	  const [sending,setSending]=useState(false);
   22	  const [sent,setSent]=useState(false);
   23	  useEffect(()=>{if(page!=="gallery"||!slug)return;setGalleriesLoading(true);void getPublicGalleries(slug).then(r=>setGalleries(r.galleries)).catch(()=>setGalleries([])).finally(()=>setGalleriesLoading(false));},[slug,page]);
   24	  if(isFetching)return <main className={styles.page}><p>Loading…</p></main>;
   25	  if(error||!data)return <main className={styles.page}><h1>Page not found</h1></main>;
   26	  const b=data.business;
   27	  const mode=b.appearanceSettings?.siteMode==="multi_page"&&b.canUseMultiPage?"multi_page":"one_page";
   28	  if(mode!=="multi_page")return <main className={styles.page}><h1>Premium Plus page</h1><p>This business is currently using its one-page website.</p><Link to={"/store/"+b.slug}>Back to website</Link></main>;
   29	  const appearance=b.appearanceSettings??{};
   30	  const t=storeThemeEngine(b.themeId,appearance);
   31	  const pth=page||"about";
   32	  const title=pth==="products"?"Products":pth==="services"?"Services":pth==="gallery"?"Gallery":pth==="blog"?"Blog":pth==="contact"?"Contact":"About us";
   33	  const share=()=>{const url=window.location.href;if(navigator.share){void navigator.share({title:title+" — "+b.name,url}).catch(()=>{});}else if(navigator.clipboard){void navigator.clipboard.writeText(url);}};
   34	  const publicUrl=typeof window!=="undefined"?window.location.href:"/store/"+b.slug+"/"+pth;
   35	  const shareText=encodeURIComponent(title+" — "+b.name+" "+publicUrl);
   36	  const homePage=typeof appearance.homePage==="string"?appearance.homePage:"home";
   37	  const footerMode=appearance.footerMode==="none"||appearance.footerMode==="selected"?appearance.footerMode:"all";
   38	  const footerPages=Array.isArray(appearance.footerPages)?appearance.footerPages.filter((x):x is string=>typeof x==="string"):[];
   39	  const showFooter=footerMode==="all"||(footerMode==="selected"&&footerPages.includes(pth==="about"?"about":pth));
   40	  const sendEnquiry=async()=>{if(!slug||!enquiry.name.trim()||!enquiry.message.trim()){toast.error("Enter your name and message first.");return;}setSending(true);try{await postStorefrontEnquiry({slug,customerName:enquiry.name,customerPhone:enquiry.phone,customerEmail:enquiry.email,message:enquiry.message});setSent(true);setEnquiry({name:"",phone:"",email:"",message:""});}catch(e){toast.error(e instanceof Error?e.message:"Could not send your enquiry.");}finally{setSending(false);}};
   41	  return <div className={styles.page} style={t.style as React.CSSProperties}>
   42	    <Helmet><title>{title} — {b.name}</title><meta name="description" content={b.description||title+" from "+b.name}/><meta property="og:title" content={title+" — "+b.name}/><meta property="og:description" content={b.description||title+" from "+b.name}/>{(typeof b.appearanceSettings?.shareImageUrl === "string" && b.appearanceSettings.shareImageUrl) || b.heroImageUrl || b.logoUrl ? <meta property="og:image" content={(typeof b.appearanceSettings?.shareImageUrl === "string" && b.appearanceSettings.shareImageUrl) || b.heroImageUrl || b.logoUrl || ""}/> : null}</Helmet>
   43	    <header className={styles.header}><div><strong>{b.name}</strong>{typeof appearance.headerTagline==="string"&&appearance.headerTagline&&<span>{appearance.headerTagline}</span>}</div><nav><Link to={homePage==="home"?"/store/"+b.slug:"/store/"+b.slug+"/"+homePage}>Home</Link>{["products","services","about","gallery","blog","contact"].filter(x=>x!==homePage).map(x=><Link key={x} className={x===pth?styles.active:""} to={"/store/"+b.slug+"/"+x}>{x[0].toUpperCase()+x.slice(1)}</Link>)}</nav></header>
   44	    <main className={styles.main}><div className={styles.titleRow}><h1>{title}</h1><button type="button" className={styles.shareButton} onClick={share}>Share page</button></div>
   45	    <div className={styles.shareBar} aria-label="Share this page"><a href={"https://wa.me/?text="+shareText} target="_blank" rel="noreferrer">WhatsApp</a><a href={"https://www.facebook.com/sharer/sharer.php?u="+encodeURIComponent(publicUrl)} target="_blank" rel="noreferrer">Facebook</a><a href={"https://www.linkedin.com/sharing/share-offsite/?url="+encodeURIComponent(publicUrl)} target="_blank" rel="noreferrer">LinkedIn</a><a href={"https://twitter.com/intent/tweet?text="+shareText} target="_blank" rel="noreferrer">X</a><button type="button" className={styles.shareButton} onClick={()=>{if(navigator.clipboard)void navigator.clipboard.writeText(publicUrl);}}>Copy link</button></div>
   46	    {pth==="about"&&<section><p>{b.description||"Learn more about this business."}</p>{b.address&&<p>{b.address}</p>}{b.openingHours&&<p>{b.openingHours}</p>}</section>}
   47	    {pth==="products"&&<div className={styles.grid}>{data.products.map(x=><article key={x.id}>{x.imageUrl&&<Link to={`/store/${b.slug}/p/${x.slug}`}><img src={x.imageUrl} alt={x.name} loading="lazy"/></Link>}<h2><Link to={`/store/${b.slug}/p/${x.slug}`}>{x.name}</Link></h2>{x.description&&<p>{x.description}</p>}<strong>{formatMoney(x.price,x.currency)}{x.unit?` / ${x.unit}`:""}</strong><small>{x.available?"Available":"Currently unavailable"}</small><Link className={styles.productLink} to={`/store/${b.slug}/p/${x.slug}`}>View product details →</Link></article>)}</div>}
   48	    {pth==="services"&&<div className={styles.grid}>{data.services.map(x=><article key={x.id}>{x.imageUrl&&<img src={x.imageUrl} alt={x.name} loading="lazy"/>}<h2>{x.name}</h2><p className={styles.previewText}>{x.description.length>150?x.description.slice(0,150).trim()+"…":x.description}</p><strong>{x.priceType==="contact"?"Contact for price":x.priceType==="fixed"?x.price:"From "+x.price}</strong>{x.duration&&<p>{x.duration}</p>}<Link to={`/store/${b.slug}/s/${x.id}`}>View service and enquire →</Link></article>)}</div>}
   49	    {pth==="gallery"&&(galleriesLoading?<p>Loading galleries…</p>:galleries.length===0?<section><p>No public galleries have been added yet.</p></section>:<div className={styles.grid}>{galleries.map(g=><article key={g.id}>{g.coverImageUrl&&<Link to={"/store/"+b.slug+"/g/"+g.slug}><img src={g.coverImageUrl} alt={g.name} loading="lazy"/></Link>}<h2><Link to={"/store/"+b.slug+"/g/"+g.slug}>{g.name}</Link></h2>{g.description&&<p>{g.description}</p>}<p>{g.imageCount} {g.imageCount===1?"photo":"photos"}</p><Link to={"/store/"+b.slug+"/g/"+g.slug}>Open gallery →</Link></article>)}</div>)}
   50	    {pth==="blog"&&<div className={styles.list}>{data.blogPosts.map(x=><article key={x.id}>{x.coverImageUrl&&<Link to={`/store/${b.slug}/b/${x.slug}`}><img className={styles.articleCover} src={x.coverImageUrl} alt={x.title} loading="lazy"/></Link>}<h2><Link to={`/store/${b.slug}/b/${x.slug}`}>{x.title}</Link></h2>{x.excerpt&&<p>{x.excerpt}</p>}<Link to={`/store/${b.slug}/b/${x.slug}`}>Read full article →</Link></article>)}</div>}
   51	    {pth==="contact"&&<section className={styles.contactSection}>{b.phone&&<p>Phone: <a href={"tel:"+b.phone}>{b.phone}</a></p>}{b.email&&<p>Email: <a href={"mailto:"+b.email}>{b.email}</a></p>}{b.whatsappNumber&&<p><a href={"https://wa.me/"+b.whatsappNumber.replace(/\D/g,"")} target="_blank" rel="noreferrer">Contact on WhatsApp</a></p>}{b.address&&<p>{b.address}</p>}<div className={styles.enquiryForm}><h2>Send an enquiry</h2>{sent?<p role="status">Thank you. Your enquiry has been sent to {b.name}.</p>:<><label>Your name<Input value={enquiry.name} onChange={e=>setEnquiry(v=>({...v,name:e.target.value}))} placeholder="Full name" required/></label><label>Phone or WhatsApp<Input value={enquiry.phone} onChange={e=>setEnquiry(v=>({...v,phone:e.target.value}))} placeholder="Phone number"/></label><label>Email (optional)<Input type="email" value={enquiry.email} onChange={e=>setEnquiry(v=>({...v,email:e.target.value}))} placeholder="you@example.com"/></label><label>How can we help?<Textarea value={enquiry.message} onChange={e=>setEnquiry(v=>({...v,message:e.target.value}))} rows={5} placeholder="Write your enquiry" required/></label><Button onClick={()=>void sendEnquiry()} disabled={sending}>{sending?"Sending…":"Send enquiry"}</Button></>}</div></section>}
   52	    </main>{showFooter&&<footer className={styles.footer}><Link to={homePage==="home"?"/store/"+b.slug:"/store/"+b.slug+"/"+homePage}>← Back to home</Link><span>© {new Date().getFullYear()} {b.name}</span></footer>}
   53	  </div>;
   54	}

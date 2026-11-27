import { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import { useSearchParams } from "react-router-dom";
import { ArrowDown, ArrowUp, ImagePlus, RotateCcw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/Button";
import { StorefrontHeader } from "../components/StorefrontHeader";
import { StorefrontHero } from "../components/StorefrontHero";
import { Input } from "../components/Input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/Select";
import { Skeleton } from "../components/Skeleton";
import { useMyBusiness } from "../helpers/useMyBusiness";
import { useSaveBusiness } from "../helpers/useSaveBusiness";
import { useSubscriptionStatus } from "../helpers/useSubscriptionStatus";
import { DEFAULT_STORE_THEME, storeThemeEngine } from "../helpers/storeThemeEngine";
import { uploadImage } from "../helpers/uploadImage";
import { ThemePreview } from "../components/ThemePreview";
import { readTestimonialConfig, type TestimonialConfig } from "../helpers/testimonialConfig";
import { normalizeVideoEmbedUrl } from "../helpers/normalizeVideoEmbedUrl";
import { TestimonialsSection } from "../components/TestimonialsSection";
import type { StoreTheme } from "../helpers/schema";
import styles from "./dashboard.theme.module.css";
import tabStyles from "./dashboard.theme.tabs.module.css";

type ThemeState = ThemeBase & TestimonialConfig;

type ThemeBase = {
  primaryColor:string; accentColor:string; backgroundColor:string; backgroundImageUrl:string; backgroundOverlay:number;
  textColor:string; mutedTextColor:string; cardBackground:string; buttonBackground:string; buttonTextColor:string;
  linkColor:string; borderColor:string; cardRadius:string; cardShadow:string; fontFamily:string; displayFontFamily:string;
  bodyFontSize:string; headingWeight:string; layout:"standard"|"wide"|"compact"; menuStyle:"bar"|"pills"|"minimal"; menuVisibility:"auto"|"always";
  headerLogo:boolean; headerDescription:boolean; headerActions:boolean; headerAlignment:"split"|"center"; siteMode:"one_page"|"multi_page"; headerBrand:"logo"|"name"|"logo_name"|"logo_name_tagline"|"name_tagline"; headerTagline:string; menuPosition:"left"|"center"|"right"; heroLayout:"full"|"left"|"right"|"text";
  siteType:"custom"|"online_store"|"service_business"|"portfolio"|"events_community";
  seoTitle:string; seoDescription:string; shareImageUrl:string;
  homePage:string; sectionOrder:string[]; sections:Record<string,boolean>; eventsPageInMenu:boolean; showPastEvents:boolean; footerMode:"all"|"selected"|"none"; footerPages:string[];
};
const editableSections = [["hero","Hero"],["slider","Featured slides"],["video","Homepage video"],["gallery","Gallery"],["services","Services"],["featured","Featured products"],["catalogue","Products catalogue"],["about","About"],["work","Recent work"],["testimonials","Testimonials"],["blog","Blog"],["events","Upcoming events"],["contact","Contact"]] as const;
const siteTypes: Array<[ThemeState["siteType"], string, string, StoreTheme]> = [
  ["online_store","Online store","Sell products. Search, category tiles, sale and new-arrival rows, delivery info, cart and a bottom shop menu on phones.","commerce"],
  ["service_business","Service business","Services and enquiries first, then testimonials, work and contact.","service"],
  ["portfolio","Portfolio / creative","Your work and gallery first, then about and contact.","clean"],
  ["events_community","Events & community","Upcoming events first, then about, gallery and blog.","clean"],
  ["custom","Blank","Start from a plain layout and choose your own sections and pages.","clean"],
];
const sectionOrders: Record<ThemeState["siteType"], string[]> = {
  custom: editableSections.map(([key]) => key),
  online_store: ["hero","slider","featured","catalogue","services","gallery","about","testimonials","events","blog","contact","video","work"],
  service_business: ["hero","services","testimonials","about","work","gallery","contact","featured","catalogue","events","blog","slider","video"],
  portfolio: ["hero","work","gallery","testimonials","about","contact","services","featured","catalogue","events","blog","slider","video"],
  events_community: ["hero","events","about","gallery","testimonials","blog","contact","services","featured","catalogue","work","slider","video"],
};
const tabs = [["type","Templates"],["colours","Colours"],["header","Header & menu"],["home","Home page"],["testimonials","Testimonials"],["text","Text & cards"],["seo","SEO & sharing"],["footer","Footer"]] as const;
type TabKey = typeof tabs[number][0];
const palettes = [
  {name:"Oni247",v:{primaryColor:"#0e5c3f",accentColor:"#d97706",backgroundColor:"#f7f4ec",textColor:"#17201a",mutedTextColor:"#626b64",cardBackground:"#fffdf7",buttonBackground:"#0e5c3f",buttonTextColor:"#ffffff",linkColor:"#0e5c3f",borderColor:"#d9d6cb"}},
  {name:"Midnight",v:{primaryColor:"#183153",accentColor:"#eab308",backgroundColor:"#111827",textColor:"#f8fafc",mutedTextColor:"#cbd5e1",cardBackground:"#1f2937",buttonBackground:"#2563eb",buttonTextColor:"#ffffff",linkColor:"#60a5fa",borderColor:"#374151"}},
  {name:"Terracotta",v:{primaryColor:"#9a3412",accentColor:"#ca8a04",backgroundColor:"#fff7ed",textColor:"#431407",mutedTextColor:"#7c2d12",cardBackground:"#ffffff",buttonBackground:"#9a3412",buttonTextColor:"#ffffff",linkColor:"#9a3412",borderColor:"#fed7aa"}},
  {name:"Ocean",v:{primaryColor:"#075985",accentColor:"#0f766e",backgroundColor:"#f0f9ff",textColor:"#082f49",mutedTextColor:"#475569",cardBackground:"#ffffff",buttonBackground:"#075985",buttonTextColor:"#ffffff",linkColor:"#0369a1",borderColor:"#bae6fd"}},
];
const merge=(a:Record<string,unknown>|undefined):ThemeState=>({
  ...DEFAULT_STORE_THEME, backgroundImageUrl:typeof a?.backgroundImageUrl==="string"?a.backgroundImageUrl:"", backgroundOverlay:typeof a?.backgroundOverlay==="number"?a.backgroundOverlay:0,
  primaryColor:typeof a?.primaryColor==="string"?a.primaryColor:DEFAULT_STORE_THEME.primaryColor, accentColor:typeof a?.accentColor==="string"?a.accentColor:DEFAULT_STORE_THEME.accentColor,
  backgroundColor:typeof a?.backgroundColor==="string"?a.backgroundColor:DEFAULT_STORE_THEME.backgroundColor, textColor:typeof a?.textColor==="string"?a.textColor:DEFAULT_STORE_THEME.textColor,
  mutedTextColor:typeof a?.mutedTextColor==="string"?a.mutedTextColor:DEFAULT_STORE_THEME.mutedTextColor, cardBackground:typeof a?.cardBackground==="string"?a.cardBackground:DEFAULT_STORE_THEME.cardBackground,
  buttonBackground:typeof a?.buttonBackground==="string"?a.buttonBackground:DEFAULT_STORE_THEME.buttonBackground, buttonTextColor:typeof a?.buttonTextColor==="string"?a.buttonTextColor:DEFAULT_STORE_THEME.buttonTextColor,
  linkColor:typeof a?.linkColor==="string"?a.linkColor:DEFAULT_STORE_THEME.linkColor, borderColor:typeof a?.borderColor==="string"?a.borderColor:DEFAULT_STORE_THEME.borderColor,
  cardRadius:typeof a?.cardRadius==="string"?a.cardRadius:DEFAULT_STORE_THEME.cardRadius, cardShadow:typeof a?.cardShadow==="string"?a.cardShadow:DEFAULT_STORE_THEME.cardShadow,
  fontFamily:typeof a?.fontFamily==="string"?a.fontFamily:DEFAULT_STORE_THEME.fontFamily, displayFontFamily:typeof a?.displayFontFamily==="string"?a.displayFontFamily:DEFAULT_STORE_THEME.displayFontFamily,
  bodyFontSize:typeof a?.bodyFontSize==="string"?a.bodyFontSize:DEFAULT_STORE_THEME.bodyFontSize, headingWeight:typeof a?.headingWeight==="string"?a.headingWeight:DEFAULT_STORE_THEME.headingWeight,
  layout:a?.layout==="wide"||a?.layout==="compact"?a.layout:"standard", menuStyle:a?.menuStyle==="pills"||a?.menuStyle==="minimal"?a.menuStyle:"bar", menuVisibility:a?.menuVisibility==="always"?"always":"auto",
  headerLogo:a?.headerLogo!==false, headerDescription:a?.headerDescription!==false, headerActions:a?.headerActions!==false, headerAlignment:a?.headerAlignment==="center"?"center":"split", siteMode:a?.siteMode==="multi_page"?"multi_page":"one_page",
  headerBrand:a?.headerBrand==="logo"||a?.headerBrand==="name"||a?.headerBrand==="logo_name"||a?.headerBrand==="logo_name_tagline"||a?.headerBrand==="name_tagline"?a.headerBrand:"logo_name",
  headerTagline:typeof a?.headerTagline==="string"?a.headerTagline:"",
  siteType:a?.siteType==="online_store"||a?.siteType==="service_business"||a?.siteType==="portfolio"||a?.siteType==="events_community"?a.siteType:"custom",
  seoTitle:typeof a?.seoTitle==="string"?a.seoTitle:"", seoDescription:typeof a?.seoDescription==="string"?a.seoDescription:"", shareImageUrl:typeof a?.shareImageUrl==="string"?a.shareImageUrl:"",
  menuPosition:a?.menuPosition==="left"||a?.menuPosition==="right"?a.menuPosition:"center",
  heroLayout:a?.heroLayout==="full"||a?.heroLayout==="left"||a?.heroLayout==="right"||a?.heroLayout==="text"?a.heroLayout:"right",
  homePage:typeof a?.homePage==="string"?a.homePage:"home",
  sectionOrder:Array.isArray(a?.sectionOrder)?[...(a.sectionOrder as unknown[]).filter((x):x is string=>typeof x==="string"&&editableSections.some(([key])=>key===x)),...editableSections.map(([key])=>key).filter(key=>!(a.sectionOrder as unknown[]).includes(key))]:editableSections.map(([key])=>key),
  sections: a?.sections&&typeof a.sections==="object"&&!Array.isArray(a.sections)?Object.fromEntries(editableSections.map(([key])=>[key,(a.sections as Record<string,unknown>)[key]!==false])):Object.fromEntries(editableSections.map(([key])=>[key,true])),
  eventsPageInMenu:a?.eventsPageInMenu===true,
  ...readTestimonialConfig(a),
  showPastEvents:a?.showPastEvents===true,
  footerMode:a?.footerMode==="none"||a?.footerMode==="selected"?a.footerMode:"all",
  footerPages:Array.isArray(a?.footerPages)?(a.footerPages as unknown[]).filter((x):x is string=>typeof x==="string"):[],
});
const ColorField=({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void})=><label className={styles.colorField}><span>{label}</span><input type="color" value={value} onChange={e=>onChange(e.target.value)}/><code>{value}</code></label>;
const Choice=({label,value,options,onChange,disabled=false}:{label:string;value:string;options:Array<[string,string]>;onChange:(v:string)=>void;disabled?:boolean})=><label>{label}<Select disabled={disabled} value={value} onValueChange={onChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{options.map(([v,t])=><SelectItem key={v} value={v}>{t}</SelectItem>)}</SelectContent></Select></label>;

const isSecureVideoFileUrl=(value:string)=>{try{const url=new URL(value.trim());return url.protocol==="https:"&&Boolean(url.hostname);}catch{return false;}};
const ThemePage=()=>{
  const {data,isFetching}=useMyBusiness(); const {data:subscription}=useSubscriptionStatus(); const saveBusiness=useSaveBusiness(); const business=data?.business??null;
  const [theme,setTheme]=useState<ThemeState|null>(null);
  const [contentSettings,setContentSettings]=useState<Record<string,unknown>>({});
  const [tab,setTab]=useState<TabKey>("type");\n  const [searchParams]=useSearchParams();\n  useEffect(()=>{const requested=searchParams.get("tab");if(requested&&tabs.some(([key])=>key===requested))setTab(requested as TabKey)},[searchParams]);
  const [dragKey,setDragKey]=useState<string|null>(null);
  const [moved,setMoved]=useState<string|null>(null);
  const [themeId,setThemeId]=useState<StoreTheme>("clean");
  const backgroundFileRef=useRef<HTMLInputElement>(null);
  const shareFileRef=useRef<HTMLInputElement>(null);
  const [shareUploading,setShareUploading]=useState(false);
  const [backgroundUploading,setBackgroundUploading]=useState(false);
  const [uploadingSlideIndex,setUploadingSlideIndex]=useState<number|null>(null);
  useEffect(()=>{if(business){setTheme(merge((business.appearanceSettings??{}) as Record<string,unknown>));setThemeId(business.themeId);setContentSettings((business.contentSettings??{}) as Record<string,unknown>)}},[business]);
  const preview=useMemo(()=>theme?storeThemeEngine(themeId,theme).style:{},[theme,themeId]);
  if(isFetching&&!business)return <div className={styles.page}><Skeleton className={styles.skeleton}/></div>;
  if(!business||!theme)return <div className={styles.page}><h1>Set up your business first</h1></div>;
  const update=<K extends keyof ThemeState>(k:K,v:ThemeState[K])=>setTheme(t=>t?{...t,[k]:v}:t);
  const updateContent=(key:string,value:unknown)=>setContentSettings(current=>({...current,[key]:value}));
  const slides=Array.isArray(contentSettings.homepageSlides)?contentSettings.homepageSlides.filter((item):item is Record<string,unknown>=>Boolean(item)&&typeof item==="object"&&!Array.isArray(item)):[];
  const updateSlide=(index:number,key:string,value:string)=>updateContent("homepageSlides",slides.map((slide,i)=>i===index?{...slide,[key]:value}:slide));
  const moveSlide=(index:number,direction:-1|1)=>{
    const target=index+direction;
    if(target<0||target>=slides.length)return;
    const next=[...slides];
    [next[index],next[target]]=[next[target],next[index]];
    updateContent("homepageSlides",next);
  };
  const uploadSlideImage=async(index:number,file?:File)=>{
    if(!file)return;
    setUploadingSlideIndex(index);
    try{
      const url=await uploadImage(file,"background");
      updateSlide(index,"imageUrl",url);
      toast.success("Slide image uploaded. Save theme to publish it.");
    }catch(error){
      toast.error(error instanceof Error?error.message:"Could not upload slide image.");
    }finally{
      setUploadingSlideIndex(current=>current===index?null:current);
    }
  };
  const moveSection=(key:string,direction:-1|1)=>{setTheme(t=>{if(!t)return t;const order=t.sectionOrder.length?[...t.sectionOrder]:editableSections.map(([k])=>k as string);const from=order.indexOf(key);const to=from+direction;if(from<0||to<0||to>=order.length)return t;[order[from],order[to]]=[order[to],order[from]];return {...t,sectionOrder:order};});setMoved(key);window.setTimeout(()=>setMoved(m=>m===key?null:m),1400);requestAnimationFrame(()=>document.getElementById("sec-"+key)?.scrollIntoView({block:"nearest",behavior:"smooth"}));};
  const pickSiteType=(type:ThemeState["siteType"],base:StoreTheme)=>{setThemeId(base);setTheme(t=>t?{...t,siteType:type,...(type!=="custom"?{sectionOrder:sectionOrders[type]}:{})}:t)};
  const uploadBackground=async(file?:File)=>{if(!file)return;setBackgroundUploading(true);try{const url=await uploadImage(file,"background");update("backgroundImageUrl",url);toast.success("Background image uploaded. Save theme to publish it.");}catch(e){toast.error(e instanceof Error?e.message:"Could not upload background image.");}finally{setBackgroundUploading(false);if(backgroundFileRef.current)backgroundFileRef.current.value="";}};
  const uploadShareImage=async(file?:File)=>{if(!file)return;setShareUploading(true);try{const url=await uploadImage(file,"background");update("shareImageUrl",url);toast.success("Share picture uploaded. Save theme to publish it.");}catch(e){toast.error(e instanceof Error?e.message:"Could not upload the picture.");}finally{setShareUploading(false);if(shareFileRef.current)shareFileRef.current.value="";}};
  const save=async()=>{const videoLink=typeof contentSettings.homepageVideoUrl==="string"?contentSettings.homepageVideoUrl.trim():"";const videoFile=typeof contentSettings.homepageVideoFileUrl==="string"?contentSettings.homepageVideoFileUrl.trim():"";if(videoLink&&!normalizeVideoEmbedUrl(videoLink)){toast.error("Use a supported YouTube or Facebook video link, or clear the field.");return;}if(videoFile&&!isSecureVideoFileUrl(videoFile)){toast.error("Use a valid HTTPS video file URL, or clear the field.");return;}if(videoLink&&videoFile){toast.error("Choose one video source: an embed link or a direct video file.");return;}try{const safeTheme=theme;await saveBusiness.mutateAsync({name:business.name,slug:business.slug,description:business.description,logoUrl:business.logoUrl,heroHeadline:business.heroHeadline,heroSubtext:business.heroSubtext,heroImageUrl:business.heroImageUrl,heroCtaLabel:business.heroCtaLabel,phone:business.phone,whatsappNumber:business.whatsappNumber,email:business.email,address:business.address,openingHours:business.openingHours,themeId:themeId,currency:business.currency,status:business.status,appearanceSettings:{...((business.appearanceSettings??{}) as Record<string,unknown>),...safeTheme},contentSettings:contentSettings as any});toast.success("Theme and homepage media saved. Storefront updated.")}catch(e){toast.error(e instanceof Error?e.message:"Could not save theme.")}};
  const premiumPlus=Boolean(subscription?.isPremiumPlus);
  const showPreview=tab==="colours"||tab==="header"||tab==="text"||tab==="home";
  return <div className={styles.page}><Helmet><title>Theme — Oni247</title></Helmet>
    <div className={styles.head}><div><h1 className={styles.title}>Theme</h1><p className={styles.subtitle}>Choose your site type first, then adjust colours, header, home page and text. Nothing goes live until you tap Save theme.</p></div></div>
    <div className={tabStyles.tabs} role="tablist" aria-label="Theme settings">{tabs.map(([key,label])=><button key={key} type="button" role="tab" aria-selected={tab===key} className={`${tabStyles.tab} ${tab===key?tabStyles.tabActive:""}`} onClick={()=>setTab(key)}>{label}</button>)}</div>
    <div className={styles.grid}>
      {tab==="type"&&<section className={styles.panel}><h2>Choose a template</h2><p className={styles.hint}>A template sets the look and the home page layout. Switching template never changes your products, pages, content, one-page or multi-page setting, menus or colours.</p><div className={tabStyles.typeGrid}>{siteTypes.map(([key,title,text,base])=><button key={key} type="button" aria-pressed={theme.siteType===key} className={`${tabStyles.typeCard} ${theme.siteType===key?tabStyles.typeActive:""}`} onClick={()=>pickSiteType(key,base)}><ThemePreview theme={base}/><strong>{title}{theme.siteType===key?" · Active":""}</strong><span>{text}</span></button>)}</div></section>}
      {tab==="colours"&&<><section className={styles.panel}><h2>Colours</h2><p className={styles.hint}>Start with a palette. Fine-tune single colours below if you need to.</p><div className={styles.palettes}>{palettes.map(p=><button key={p.name} className={styles.palette} type="button" onClick={()=>setTheme(t=>t?{...t,...p.v}:t)}><span className={styles.swatches}>{[p.v.backgroundColor,p.v.primaryColor,p.v.accentColor].map(c=><i key={c} style={{background:c}}/>)}</span><strong>{p.name}</strong></button>)}</div><details className={tabStyles.more}><summary>Customise each colour</summary><div className={styles.fields}>{[["Background","backgroundColor"],["Primary","primaryColor"],["Accent","accentColor"],["Main text","textColor"],["Muted text","mutedTextColor"],["Card background","cardBackground"],["Button background","buttonBackground"],["Button text","buttonTextColor"],["Links","linkColor"],["Borders","borderColor"]].map(([label,key])=><ColorField key={key} label={label} value={theme[key as keyof ThemeState] as string} onChange={v=>update(key as keyof ThemeState,v as never)}/>)}</div></details></section>
        <section className={styles.panel}><h2>Background image</h2><input ref={backgroundFileRef} type="file" accept="image/png,image/jpeg,image/webp" style={{display:"none"}} onChange={e=>void uploadBackground(e.target.files?.[0])}/><div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}><Button type="button" variant="outline" disabled={backgroundUploading} onClick={()=>backgroundFileRef.current?.click()}><ImagePlus size={15}/>{backgroundUploading?"Uploading…":theme.backgroundImageUrl?"Replace image":"Upload image"}</Button>{theme.backgroundImageUrl&&<Button type="button" variant="ghost" onClick={()=>update("backgroundImageUrl","")}><Trash2 size={15}/> Remove</Button>}</div><Input value={theme.backgroundImageUrl} onChange={e=>update("backgroundImageUrl",e.target.value)} placeholder="Or paste an image URL"/><label className={styles.range}>Overlay <input type="range" min="0" max="80" value={theme.backgroundOverlay} onChange={e=>update("backgroundOverlay",Number(e.target.value))}/><span>{theme.backgroundOverlay}%</span></label><p className={styles.hint}>Use a clear image that keeps text readable. PNG, JPG and WebP up to 3 MB are supported.</p></section></>}
      {tab==="header"&&<section className={styles.panel}><h2>Header & menu</h2><div className={tabStyles.group}>
        <Choice label="Brand display" value={theme.headerBrand} onChange={v=>update("headerBrand",v as ThemeState["headerBrand"])} options={[["logo","Logo only"],["logo_name","Logo + business name"],["logo_name_tagline","Logo + name + tagline"],["name","Business name only"],["name_tagline","Business name + tagline"]]}/>
        <Input value={theme.headerTagline} onChange={e=>update("headerTagline",e.target.value)} placeholder="Short tagline (optional)"/>
        <Choice label="Header alignment" value={theme.headerAlignment} onChange={v=>update("headerAlignment",v as ThemeState["headerAlignment"])} options={[["split","Brand left / actions right"],["center","Centered brand"]]}/>
        <Choice label="WhatsApp and Call buttons" value={theme.headerActions?"show":"hide"} onChange={v=>update("headerActions",v==="show")} options={[["show","Show in header"],["hide","Hide"]]}/>
        <p className={tabStyles.groupTitle}>Menu</p>
        <Choice label="Menu style" value={theme.menuStyle} onChange={v=>update("menuStyle",v as ThemeState["menuStyle"])} options={[["bar","Bar"],["pills","Pills"],["minimal","Minimal"]]}/>
        <Choice label="Menu position" value={theme.menuPosition} onChange={v=>update("menuPosition",v as ThemeState["menuPosition"])} options={[["left","Left"],["center","Center"],["right","Right"]]}/>
        <Choice label="Menu visibility" value={theme.menuVisibility} onChange={v=>update("menuVisibility",v as ThemeState["menuVisibility"])} options={[["auto","Show when scrolling up"],["always","Always visible"]]}/>
        <p className={styles.hint}>The business description stays out of the header. Use the Hero or About section for longer text.</p>
      </div></section>}
      {tab==="home"&&<><section className={styles.panel}><h2>Home page</h2><div className={tabStyles.group}>
        <Choice label="Website structure" value={premiumPlus?theme.siteMode:"one_page"} onChange={v=>{if(v==="multi_page"&&!premiumPlus){toast.error("Multi-page websites are included in Premium Plus.");return;}update("siteMode",v as ThemeState["siteMode"]);}} options={premiumPlus?[["one_page","One-page website — ₦1,500/month"],["multi_page","Premium Plus — ₦3,000/month"]]:[["one_page","One-page website — current access"]]}/>
        <Choice label="Hero layout" value={theme.heroLayout} onChange={v=>update("heroLayout",v as ThemeState["heroLayout"])} options={[["full","Full image"],["left","Image left"],["right","Image right"],["text","Text only"]]}/>
        {premiumPlus?<><Choice label="Landing page" value={theme.homePage} onChange={v=>update("homePage",v)} options={[["home","Default home page"],["products","Products"],["services","Services"],["about","About"],["gallery","Gallery"],["blog","Blog"],["events","Events"],["contact","Contact"]]}/><Choice label="Events page in website menu" value={theme.eventsPageInMenu?"show":"hide"} onChange={v=>update("eventsPageInMenu",v==="show")} options={[["hide","Hide Events page from menu"],["show","Show Events page in menu"]]}/><Choice label="Past events on Events page" value={theme.showPastEvents?"show":"hide"} onChange={v=>update("showPastEvents",v==="show")} options={[["hide","Upcoming events only"],["show","Show past events separately"]]}/></>:<p className={styles.hint}>Multi-page navigation, a separate landing page, Gallery, Blog and Services pages need Premium Plus. Your site stays one page on the Free and One-Page plans.</p>}
      </div></section>
      <section className={styles.panel}>
        <h2>Featured slides</h2>
        <p className={styles.hint}>Add up to five homepage slides. Each slide can have an image, headline, supporting text and its own action. Slides are shown on the published homepage after saving. Premium Plus feature.</p>
        {!premiumPlus&&<p className={styles.hint}>Upgrade to Premium Plus to edit advanced homepage media. Existing saved slides remain on your site.</p>}
        <div className={tabStyles.group}>
          <Choice disabled={!premiumPlus} label="Slider placement" value={contentSettings.homepageSliderPlacement==="section"?"section":"hero"} onChange={v=>updateContent("homepageSliderPlacement",v)} options={[["hero","At the top / hero area"],["section","As its own section"]]}/>
          <Choice disabled={!premiumPlus} label="Automatic slide change" value={String(typeof contentSettings.homepageSliderInterval==="number"?contentSettings.homepageSliderInterval:5)} onChange={v=>updateContent("homepageSliderInterval",Number(v))} options={[["3","Every 3 seconds"],["5","Every 5 seconds"],["7","Every 7 seconds"],["10","Every 10 seconds"]]}/>
        </div>
        {slides.map((slide,index)=><div key={typeof slide.id==="string"?slide.id:index} style={{border:"1px solid var(--border)",borderRadius:10,padding:12,marginTop:12,display:"grid",gap:9}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,flexWrap:"wrap"}}><strong>Slide {index+1}</strong><div style={{display:"flex",gap:6}}><Button type="button" size="sm" variant="outline" disabled={!premiumPlus||index===0} onClick={()=>moveSlide(index,-1)} aria-label={`Move slide ${index+1} up`}><ArrowUp size={14}/></Button><Button type="button" size="sm" variant="outline" disabled={!premiumPlus||index===slides.length-1} onClick={()=>moveSlide(index,1)} aria-label={`Move slide ${index+1} down`}><ArrowDown size={14}/></Button><Button type="button" size="sm" variant="ghost" disabled={!premiumPlus} onClick={()=>updateContent("homepageSlides",slides.filter((_,i)=>i!==index))}><Trash2 size={14}/> Remove</Button></div></div>
          <label>Slide image<input id={`slide-image-${index}`} hidden type="file" accept="image/png,image/jpeg,image/webp" disabled={!premiumPlus||uploadingSlideIndex===index} onChange={e=>{void uploadSlideImage(index,e.target.files?.[0]);e.currentTarget.value="";}}/><div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}><Button type="button" size="sm" variant="outline" disabled={!premiumPlus||uploadingSlideIndex===index} onClick={()=>document.getElementById(`slide-image-${index}`)?.click()}><ImagePlus size={14}/>{uploadingSlideIndex===index?"Uploading…":typeof slide.imageUrl==="string"&&slide.imageUrl?"Replace image":"Upload image"}</Button>{typeof slide.imageUrl==="string"&&slide.imageUrl&&<img src={slide.imageUrl} alt="" style={{width:88,height:54,objectFit:"cover",borderRadius:6}}/>}</div><Input disabled={!premiumPlus} value={typeof slide.imageUrl==="string"?slide.imageUrl:""} onChange={e=>updateSlide(index,"imageUrl",e.target.value)} placeholder="Or paste an image URL"/></label>
          <label>Headline<Input disabled={!premiumPlus} maxLength={120} value={typeof slide.headline==="string"?slide.headline:""} onChange={e=>updateSlide(index,"headline",e.target.value)} placeholder="A clear headline"/></label>
          <label>Supporting text<Input disabled={!premiumPlus} maxLength={300} value={typeof slide.text==="string"?slide.text:""} onChange={e=>updateSlide(index,"text",e.target.value)} placeholder="Short supporting message"/></label>
          <label>Button label<Input disabled={!premiumPlus} maxLength={40} value={typeof slide.ctaLabel==="string"?slide.ctaLabel:""} onChange={e=>updateSlide(index,"ctaLabel",e.target.value)} placeholder="Shop now"/></label>
          <label>Button destination<Input disabled={!premiumPlus} value={typeof slide.ctaUrl==="string"?slide.ctaUrl:""} onChange={e=>updateSlide(index,"ctaUrl",e.target.value)} placeholder="/products or https://…"/></label>
        </div>)}
        <Button type="button" variant="outline" disabled={!premiumPlus||slides.length>=5} onClick={()=>updateContent("homepageSlides",[...slides,{id:`slide-${Date.now()}`,imageUrl:"",headline:"",text:"",ctaLabel:"",ctaUrl:""}])}>Add slide ({slides.length}/5)</Button>
      </section>
      <section className={styles.panel}>
        <h2>Homepage video</h2>
        <p className={styles.hint}>Embed a YouTube or Facebook video, or provide a direct video file URL supported by the browser. Premium Plus feature.</p>
        <div className={tabStyles.group}>
          <label>Video link (YouTube or Facebook)<Input disabled={!premiumPlus} value={typeof contentSettings.homepageVideoUrl==="string"?contentSettings.homepageVideoUrl:""} onChange={e=>{updateContent("homepageVideoUrl",e.target.value);if(e.target.value.trim())updateContent("homepageVideoFileUrl","");}} placeholder="https://youtu.be/…"/></label>
          {typeof contentSettings.homepageVideoUrl==="string"&&contentSettings.homepageVideoUrl.trim()&&!normalizeVideoEmbedUrl(contentSettings.homepageVideoUrl)&&<p role="alert" className={styles.hint}>Unsupported link. Paste a YouTube watch, Shorts, live or youtu.be link, or a Facebook video link.</p>}
          <label>Direct video file URL (optional)<Input disabled={!premiumPlus} value={typeof contentSettings.homepageVideoFileUrl==="string"?contentSettings.homepageVideoFileUrl:""} onChange={e=>{updateContent("homepageVideoFileUrl",e.target.value);if(e.target.value.trim())updateContent("homepageVideoUrl","");}} placeholder="https://…/video.mp4"/></label>
          {typeof contentSettings.homepageVideoFileUrl==="string"&&contentSettings.homepageVideoFileUrl.trim()&&!isSecureVideoFileUrl(contentSettings.homepageVideoFileUrl)&&<p role="alert" className={styles.hint}>Enter a valid HTTPS URL for a video file. The video host must allow playback from external websites.</p>}
          <label>Section title<Input disabled={!premiumPlus} maxLength={100} value={typeof contentSettings.homepageVideoTitle==="string"?contentSettings.homepageVideoTitle:""} onChange={e=>updateContent("homepageVideoTitle",e.target.value)} placeholder="Watch our video"/></label>
          <label>Description<Input disabled={!premiumPlus} maxLength={300} value={typeof contentSettings.homepageVideoDescription==="string"?contentSettings.homepageVideoDescription:""} onChange={e=>updateContent("homepageVideoDescription",e.target.value)} placeholder="What visitors will see"/></label>
          <Choice disabled={!premiumPlus} label="Video placement" value={contentSettings.homepageVideoPlacement==="hero"?"hero":"section"} onChange={v=>updateContent("homepageVideoPlacement",v)} options={[["hero","At the top / hero area"],["section","As its own section"]]}/>
        </div>
        {(()=>{const embed=typeof contentSettings.homepageVideoUrl==="string"?normalizeVideoEmbedUrl(contentSettings.homepageVideoUrl):null;const file=typeof contentSettings.homepageVideoFileUrl==="string"?contentSettings.homepageVideoFileUrl.trim():"";return embed||isSecureVideoFileUrl(file)?<div style={{marginTop:12,border:"1px solid var(--border)",borderRadius:10,overflow:"hidden"}}><strong style={{display:"block",padding:10}}>Video preview</strong><div style={{aspectRatio:"16 / 9",background:"#111"}}>{file&&isSecureVideoFileUrl(file)?<video src={file} controls playsInline preload="metadata" style={{width:"100%",height:"100%",display:"block"}}/>:<iframe src={embed??""} title="Homepage video preview" loading="lazy" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen style={{width:"100%",height:"100%",border:0}}/>}</div></div>:<p className={styles.hint}>Add a supported video link or direct HTTPS video URL to preview it here.</p>})()}
        {!premiumPlus&&<p className={styles.hint}>Upgrade to Premium Plus to change homepage video settings. Existing video settings are retained.</p>}
      </section>
      <section className={styles.panel}><h2>Sections on the home page</h2><p className={styles.hint}>The number is the section's position on your home page. Tap an arrow and the section moves in the list (it flashes so you can follow it). On a computer you can also drag a row. Hiding a section keeps its content saved.</p><div className={styles.fields}>{(theme.sectionOrder.length?theme.sectionOrder:editableSections.map(([k])=>k)).map(key=>{const label=editableSections.find(([k])=>k===key)?.[1]??key;const order=theme.sectionOrder.length?theme.sectionOrder:editableSections.map(([k])=>k);const position=order.indexOf(key);return <div key={key} id={"sec-"+key} draggable onDragStart={()=>setDragKey(key)} onDragEnd={()=>setDragKey(null)} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(dragKey&&dragKey!==key){const next=order.filter(k=>k!==dragKey);const at=next.indexOf(key)+(order.indexOf(dragKey)<order.indexOf(key)?1:0);next.splice(at,0,dragKey);update("sectionOrder",next)}setDragKey(null)}} style={{display:"grid",gridTemplateColumns:"28px minmax(0,1fr) auto auto",gap:8,alignItems:"center",padding:"8px 6px",borderBottom:"1px solid var(--border)",cursor:"grab",opacity:dragKey===key?0.45:1,borderRadius:8,background:moved===key?"color-mix(in srgb, var(--primary) 16%, transparent)":"transparent",transition:"background .4s"}}><b style={{color:"var(--muted-foreground)"}} aria-label={`Position ${position+1}`}>{position+1}</b><label style={{display:"flex",gap:8,alignItems:"center",minWidth:0}}><input type="checkbox" checked={theme.sections[key]!==false} onChange={e=>update("sections",{...theme.sections,[key]:e.target.checked})}/><span>{label}</span></label><Button type="button" size="sm" variant="outline" disabled={position<=0} onClick={()=>moveSection(key,-1)} aria-label={`Move ${label} up`}><ArrowUp size={16}/></Button><Button type="button" size="sm" variant="outline" disabled={position<0||position>=order.length-1} onClick={()=>moveSection(key,1)} aria-label={`Move ${label} down`}><ArrowDown size={16}/></Button></div>})}</div></section></>}
      {tab==="testimonials"&&<><section className={styles.panel}><h2>Testimonials</h2><p className={styles.hint}>Choose how testimonials look on your site. Nothing goes live until you tap Save theme.</p><div className={tabStyles.group}>
        <Choice label="Layout" value={theme.testimonialLayout} onChange={v=>update("testimonialLayout",v as ThemeState["testimonialLayout"])} options={[["grid","Grid"],["slider","Slider (swipe sideways)"],["gallery","Gallery (photo tiles)"]]}/>
        {theme.testimonialLayout!=="gallery"&&<Choice label="Card style" value={theme.testimonialStyle} onChange={v=>update("testimonialStyle",v as ThemeState["testimonialStyle"])} options={[["card","Card with border"],["quote","Centred quote"],["minimal","Minimal with side line"]]}/>}
        {theme.testimonialLayout!=="slider"&&<Choice label="Columns on large screens" value={theme.testimonialColumns} onChange={v=>update("testimonialColumns",v as ThemeState["testimonialColumns"])} options={[["2","2 columns"],["3","3 columns"]]}/>}
        <Choice label="How many to show" value={theme.testimonialMax} onChange={v=>update("testimonialMax",v as ThemeState["testimonialMax"])} options={[["all","All"],["3","First 3"],["6","First 6"],["9","First 9"]]}/>
        <Choice label="Star ratings" value={theme.testimonialRating?"show":"hide"} onChange={v=>update("testimonialRating",v==="show")} options={[["show","Show"],["hide","Hide"]]}/>
        <Choice label="Photos" value={theme.testimonialPhotos?"show":"hide"} onChange={v=>update("testimonialPhotos",v==="show")} options={[["show","Show photos"],["hide","Hide photos"]]}/>
      </div></section>
      <section className={styles.previewPanel} style={preview as React.CSSProperties}><h2>Preview</h2><TestimonialsSection config={theme} items={[{id:"a",authorName:"Amaka O.",authorRole:"Customer",quote:"Fast delivery and the quality is exactly as shown. I will order again.",rating:5,imageUrl:business.heroImageUrl},{id:"b",authorName:"Tunde B.",authorRole:"Regular client",quote:"Professional from start to finish. Highly recommended.",rating:4,imageUrl:null},{id:"c",authorName:"Ngozi E.",authorRole:null,quote:"Great service and very friendly.",rating:5,imageUrl:business.logoUrl}]}/></section></>}
      {tab==="text"&&<section className={styles.panel}><h2>Text & cards</h2><div className={tabStyles.group}>
        <Choice label="Body font" value={theme.fontFamily} onChange={v=>update("fontFamily",v)} options={[["Inter Tight, sans-serif","Inter Tight"],["system-ui, sans-serif","System"],["Georgia, serif","Georgia"]]}/>
        <Choice label="Display font" value={theme.displayFontFamily} onChange={v=>update("displayFontFamily",v)} options={[["Bricolage Grotesque, sans-serif","Bricolage Grotesque"],["Inter Tight, sans-serif","Inter Tight"],["Georgia, serif","Georgia"]]}/>
        <Choice label="Body size" value={theme.bodyFontSize} onChange={v=>update("bodyFontSize",v)} options={[["15px","15px"],["16px","16px"],["17px","17px"],["18px","18px"]]}/>
        <Choice label="Heading weight" value={theme.headingWeight} onChange={v=>update("headingWeight",v)} options={[["700","700"],["800","800"],["900","900"]]}/>
        <Choice label="Page width" value={theme.layout} onChange={v=>update("layout",v as ThemeState["layout"])} options={[["standard","Standard"],["wide","Wide"],["compact","Compact"]]}/>
        <Choice label="Card corners" value={theme.cardRadius} onChange={v=>update("cardRadius",v)} options={[["6px","Square (6px)"],["10px","Soft (10px)"],["14px","Round (14px)"],["20px","Very round (20px)"]]}/>
      </div></section>}
      {showPreview&&<section className={styles.previewPanel} style={preview as React.CSSProperties}>
        <StorefrontHeader businessName={business.name} logoUrl={business.logoUrl} tagline={theme.headerTagline} headerBrand={theme.headerBrand} headerAlignment={theme.headerAlignment} menuStyle={theme.menuStyle} menuPosition={theme.menuPosition} menuVisibility="always" showActions={false} navItems={[{label:"Home",href:"#preview"},{label:"Products",href:"#preview"},{label:"About",href:"#preview"},{label:"Contact",href:"#preview"}]} />
        <StorefrontHero headline={business.heroHeadline || "Storefront headline"} description={business.heroSubtext || "Readable body text follows your selected typography and colors."} imageUrl={business.heroImageUrl} layout={theme.heroLayout} actionLabel={business.heroCtaLabel || "Primary action"} />
        {tab==="home"&&slides.length>0&&<section style={{display:"grid",gap:10,margin:"12px 0"}}><strong>Featured slides preview</strong>{slides.map((slide,index)=><article key={typeof slide.id==="string"?slide.id:index} style={{border:"1px solid var(--border)",borderRadius:10,overflow:"hidden",background:"var(--card)"}}>{typeof slide.imageUrl==="string"&&slide.imageUrl&&<img src={slide.imageUrl} alt="" style={{width:"100%",maxHeight:160,objectFit:"cover"}}/>}<div style={{padding:12}}><b>{typeof slide.headline==="string"&&slide.headline||`Slide ${index+1}`}</b>{typeof slide.text==="string"&&slide.text&&<p>{slide.text}</p>}{typeof slide.ctaLabel==="string"&&slide.ctaLabel&&<span>{slide.ctaLabel}</span>}</div></article>)}</section>}
        {tab==="home"&&(typeof contentSettings.homepageVideoUrl==="string"&&contentSettings.homepageVideoUrl||typeof contentSettings.homepageVideoFileUrl==="string"&&contentSettings.homepageVideoFileUrl)&&<section style={{border:"1px solid var(--border)",borderRadius:10,padding:12,margin:"12px 0"}}><strong>{typeof contentSettings.homepageVideoTitle==="string"&&contentSettings.homepageVideoTitle||"Homepage video"}</strong><p>{typeof contentSettings.homepageVideoDescription==="string"?contentSettings.homepageVideoDescription:"Video configured for the published homepage."}</p><small>Video preview is shown on the published storefront.</small></section>}
        <div className={styles.previewCards}><div><strong>Product card</strong><p>Card text remains readable.</p></div><div><strong>Another card</strong><p>Border and surface use theme tokens.</p></div></div>
        <a href="#preview">Example link</a>
      </section>}
      {tab==="seo"&&<section className={styles.panel}><h2>SEO & sharing</h2><p className={styles.hint}>These decide how your website looks in Google and when someone shares it on WhatsApp or Facebook. Leave a box empty and Oni247 uses your business name and description.</p><div className={tabStyles.group}>
        <label>Search title<Input value={theme.seoTitle} maxLength={70} onChange={e=>update("seoTitle",e.target.value)} placeholder={business.name}/></label>
        <p className={styles.hint}>{(theme.seoTitle||business.name).length}/70 characters. About 60 shows fully in Google.</p>
        <label>Search description<Input value={theme.seoDescription} maxLength={170} onChange={e=>update("seoDescription",e.target.value)} placeholder={business.description??"Say what you sell or do, and where."}/></label>
        <p className={styles.hint}>{(theme.seoDescription||business.description||"").length}/170 characters. Aim for 120 to 160.</p>
        <input ref={shareFileRef} type="file" accept="image/png,image/jpeg,image/webp" style={{display:"none"}} onChange={e=>void uploadShareImage(e.target.files?.[0])}/>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}><Button type="button" variant="outline" disabled={shareUploading} onClick={()=>shareFileRef.current?.click()}><ImagePlus size={15}/>{shareUploading?"Uploading…":theme.shareImageUrl?"Replace share picture":"Upload share picture"}</Button>{theme.shareImageUrl&&<Button type="button" variant="ghost" onClick={()=>update("shareImageUrl","")}><Trash2 size={15}/> Remove</Button>}</div>
        <p className={styles.hint}>Best size 1200 × 630. Without one, your hero picture or logo is used.</p>
        <p className={tabStyles.groupTitle}>Preview</p>
        <div style={{border:"1px solid var(--border)",borderRadius:12,overflow:"hidden",background:"var(--card)"}}>{(theme.shareImageUrl||business.heroImageUrl||business.logoUrl)&&<img src={theme.shareImageUrl||business.heroImageUrl||business.logoUrl||""} alt="" style={{display:"block",width:"100%",aspectRatio:"1200 / 630",objectFit:"cover"}}/>}<div style={{padding:12}}><small style={{color:"var(--muted-foreground)"}}>oni247.floot.app</small><strong style={{display:"block"}}>{theme.seoTitle||business.name}</strong><span style={{color:"var(--muted-foreground)",fontSize:".9rem"}}>{theme.seoDescription||business.description||""}</span></div></div>
      </div></section>}
      {tab==="footer"&&<section className={styles.panel}><h2>Footer</h2><p className={styles.hint}>Choose whether the business footer appears across the site.</p><Choice label="Footer visibility" value={theme.footerMode} onChange={v=>update("footerMode",v as ThemeState["footerMode"])} options={[["all","Show on every page"],["selected","Only selected pages"],["none","Hide footer everywhere"]]}/>{theme.footerMode==="selected"&&<div className={styles.fields}>{[["home","Home"],["products","Products"],["services","Services"],["about","About"],["gallery","Gallery"],["blog","Blog"],["events","Events"],["contact","Contact"],["product-detail","Product details"],["service-detail","Service details"],["blog-detail","Blog articles"],["gallery-detail","Gallery pages"],["event-detail","Event details"],["form-detail","Form pages"],["tracking","Order tracking"]].map(([key,label])=><label key={key} style={{display:"flex",gap:8,alignItems:"center"}}><input type="checkbox" checked={theme.footerPages.includes(key)} onChange={e=>update("footerPages",e.target.checked?[...theme.footerPages,key]:theme.footerPages.filter(x=>x!==key))}/>{label}</label>)}</div>}</section>}
    </div>
    <div className={tabStyles.saveBar}><Button variant="outline" onClick={()=>{setTheme(t=>t?{...merge({}),siteMode:t.siteMode,homePage:t.homePage,eventsPageInMenu:t.eventsPageInMenu,showPastEvents:t.showPastEvents,footerMode:t.footerMode,footerPages:t.footerPages,siteType:t.siteType,sectionOrder:t.sectionOrder,sections:t.sections,headerTagline:t.headerTagline,headerActions:t.headerActions}:t);toast.success("Colours, fonts and styling restored. Your pages and settings were kept. Save to apply.")}}><RotateCcw size={15}/> Reset look</Button><Button onClick={()=>void save()} disabled={saveBusiness.isPending}><Save size={15}/> Save theme</Button></div>
  </div>;
};
export default ThemePage;


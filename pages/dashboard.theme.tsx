import { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import { ImagePlus, RotateCcw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/Select";
import { Skeleton } from "../components/Skeleton";
import { useMyBusiness } from "../helpers/useMyBusiness";
   10	import { useSaveBusiness } from "../helpers/useSaveBusiness";
   11	import { useSubscriptionStatus } from "../helpers/useSubscriptionStatus";
   12	import { DEFAULT_STORE_THEME, storeThemeEngine } from "../helpers/storeThemeEngine";
   13	import { uploadImage } from "../helpers/uploadImage";
   14	import styles from "./dashboard.theme.module.css";
   15	
   16	type ThemeState = {
   17	  primaryColor:string; accentColor:string; backgroundColor:string; backgroundImageUrl:string; backgroundOverlay:number;
   18	  textColor:string; mutedTextColor:string; cardBackground:string; buttonBackground:string; buttonTextColor:string;
   19	  linkColor:string; borderColor:string; cardRadius:string; cardShadow:string; fontFamily:string; displayFontFamily:string;
   20	  bodyFontSize:string; headingWeight:string; layout:"standard"|"wide"|"compact"; menuStyle:"bar"|"pills"|"minimal"; menuVisibility:"auto"|"always";
   21	  headerLogo:boolean; headerDescription:boolean; headerActions:boolean; headerAlignment:"split"|"center"; siteMode:"one_page"|"multi_page"; headerBrand:"logo"|"name"|"logo_name"|"logo_name_tagline"|"name_tagline"; headerTagline:string; menuPosition:"left"|"center"|"right"; heroLayout:"full"|"left"|"right"|"text";
   22	  homePage:string; sectionOrder:string[]; sections:Record<string,boolean>; footerMode:"all"|"selected"|"none"; footerPages:string[];
   23	};
   24	const editableSections = [["hero","Hero"],["slider","Featured slides"],["video","Homepage video"],["gallery","Gallery"],["services","Services"],["featured","Featured products"],["catalogue","Products catalogue"],["about","About"],["work","Recent work"],["testimonials","Testimonials"],["blog","Blog"],["contact","Contact"]] as const;
   25	const palettes = [
   26	  {name:"Oniduka",v:{primaryColor:"#0e5c3f",accentColor:"#d97706",backgroundColor:"#f7f4ec",textColor:"#17201a",mutedTextColor:"#626b64",cardBackground:"#fffdf7",buttonBackground:"#0e5c3f",buttonTextColor:"#ffffff",linkColor:"#0e5c3f",borderColor:"#d9d6cb"}},
   27	  {name:"Midnight",v:{primaryColor:"#183153",accentColor:"#eab308",backgroundColor:"#111827",textColor:"#f8fafc",mutedTextColor:"#cbd5e1",cardBackground:"#1f2937",buttonBackground:"#2563eb",buttonTextColor:"#ffffff",linkColor:"#60a5fa",borderColor:"#374151"}},
   28	  {name:"Terracotta",v:{primaryColor:"#9a3412",accentColor:"#ca8a04",backgroundColor:"#fff7ed",textColor:"#431407",mutedTextColor:"#7c2d12",cardBackground:"#ffffff",buttonBackground:"#9a3412",buttonTextColor:"#ffffff",linkColor:"#9a3412",borderColor:"#fed7aa"}},
   29	  {name:"Ocean",v:{primaryColor:"#075985",accentColor:"#0f766e",backgroundColor:"#f0f9ff",textColor:"#082f49",mutedTextColor:"#475569",cardBackground:"#ffffff",buttonBackground:"#075985",buttonTextColor:"#ffffff",linkColor:"#0369a1",borderColor:"#bae6fd"}},
   30	];
   31	const merge=(a:Record<string,unknown>|undefined):ThemeState=>({
   32	  ...DEFAULT_STORE_THEME, backgroundImageUrl:typeof a?.backgroundImageUrl==="string"?a.backgroundImageUrl:"", backgroundOverlay:typeof a?.backgroundOverlay==="number"?a.backgroundOverlay:0,
   33	  primaryColor:typeof a?.primaryColor==="string"?a.primaryColor:DEFAULT_STORE_THEME.primaryColor, accentColor:typeof a?.accentColor==="string"?a.accentColor:DEFAULT_STORE_THEME.accentColor,
   34	  backgroundColor:typeof a?.backgroundColor==="string"?a.backgroundColor:DEFAULT_STORE_THEME.backgroundColor, textColor:typeof a?.textColor==="string"?a.textColor:DEFAULT_STORE_THEME.textColor,
   35	  mutedTextColor:typeof a?.mutedTextColor==="string"?a.mutedTextColor:DEFAULT_STORE_THEME.mutedTextColor, cardBackground:typeof a?.cardBackground==="string"?a.cardBackground:DEFAULT_STORE_THEME.cardBackground,
   36	  buttonBackground:typeof a?.buttonBackground==="string"?a.buttonBackground:DEFAULT_STORE_THEME.buttonBackground, buttonTextColor:typeof a?.buttonTextColor==="string"?a.buttonTextColor:DEFAULT_STORE_THEME.buttonTextColor,
   37	  linkColor:typeof a?.linkColor==="string"?a.linkColor:DEFAULT_STORE_THEME.linkColor, borderColor:typeof a?.borderColor==="string"?a.borderColor:DEFAULT_STORE_THEME.borderColor,
   38	  cardRadius:typeof a?.cardRadius==="string"?a.cardRadius:DEFAULT_STORE_THEME.cardRadius, cardShadow:typeof a?.cardShadow==="string"?a.cardShadow:DEFAULT_STORE_THEME.cardShadow,
   39	  fontFamily:typeof a?.fontFamily==="string"?a.fontFamily:DEFAULT_STORE_THEME.fontFamily, displayFontFamily:typeof a?.displayFontFamily==="string"?a.displayFontFamily:DEFAULT_STORE_THEME.displayFontFamily,
   40	  bodyFontSize:typeof a?.bodyFontSize==="string"?a.bodyFontSize:DEFAULT_STORE_THEME.bodyFontSize, headingWeight:typeof a?.headingWeight==="string"?a.headingWeight:DEFAULT_STORE_THEME.headingWeight,
   41	  layout:a?.layout==="wide"||a?.layout==="compact"?a.layout:"standard", menuStyle:a?.menuStyle==="pills"||a?.menuStyle==="minimal"?a.menuStyle:"bar", menuVisibility:a?.menuVisibility==="always"?"always":"auto",
   42	  headerLogo:a?.headerLogo!==false, headerDescription:a?.headerDescription!==false, headerActions:a?.headerActions!==false, headerAlignment:a?.headerAlignment==="center"?"center":"split", siteMode:a?.siteMode==="multi_page"?"multi_page":"one_page",
   43	  headerBrand:a?.headerBrand==="logo"||a?.headerBrand==="name"||a?.headerBrand==="logo_name"||a?.headerBrand==="logo_name_tagline"||a?.headerBrand==="name_tagline"?a.headerBrand:"logo_name",
   44	  headerTagline:typeof a?.headerTagline==="string"?a.headerTagline:"",
   45	  menuPosition:a?.menuPosition==="left"||a?.menuPosition==="right"?a.menuPosition:"center",
   46	  heroLayout:a?.heroLayout==="full"||a?.heroLayout==="left"||a?.heroLayout==="right"||a?.heroLayout==="text"?a.heroLayout:"right",
   47	  homePage:typeof a?.homePage==="string"?a.homePage:"home",
   48	  sectionOrder:Array.isArray(a?.sectionOrder)?(a.sectionOrder as unknown[]).filter((x):x is string=>typeof x==="string"&&editableSections.some(([key])=>key===x)):editableSections.map(([key])=>key),
   49	  sections: a?.sections&&typeof a.sections==="object"&&!Array.isArray(a.sections)?Object.fromEntries(editableSections.map(([key])=>[key,(a.sections as Record<string,unknown>)[key]!==false])):Object.fromEntries(editableSections.map(([key])=>[key,true])),
   50	  footerMode:a?.footerMode==="none"||a?.footerMode==="selected"?a.footerMode:"all",
   51	  footerPages:Array.isArray(a?.footerPages)?(a.footerPages as unknown[]).filter((x):x is string=>typeof x==="string"):[],
   52	});
   53	const ColorField=({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void})=><label className={styles.colorField}><span>{label}</span><input type="color" value={value} onChange={e=>onChange(e.target.value)}/><code>{value}</code></label>;
   54	const Choice=({label,value,options,onChange}:{label:string;value:string;options:Array<[string,string]>;onChange:(v:string)=>void})=><label>{label}<Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{options.map(([v,t])=><SelectItem key={v} value={v}>{t}</SelectItem>)}</SelectContent></Select></label>;
   55	
   56	const ThemePage=()=>{
   57	  const {data,isFetching}=useMyBusiness(); const {data:subscription}=useSubscriptionStatus(); const saveBusiness=useSaveBusiness(); const business=data?.business??null;
   58	  const [theme,setTheme]=useState<ThemeState|null>(null);
   59	  const backgroundFileRef=useRef<HTMLInputElement>(null);
   60	  const [backgroundUploading,setBackgroundUploading]=useState(false);
   61	  useEffect(()=>{if(business)setTheme(merge((business.appearanceSettings??{}) as Record<string,unknown>))},[business]);
   62	  useEffect(()=>{if(subscription&&!subscription.isPremiumPlus)setTheme(t=>t&&t.siteMode!=="one_page"?{...t,siteMode:"one_page"}:t)},[subscription?.isPremiumPlus]);
   63	  const preview=useMemo(()=>theme?storeThemeEngine(business?.themeId??"clean",theme).style:{},[theme,business?.themeId]);
   64	  if(isFetching&&!business)return <div className={styles.page}><Skeleton className={styles.skeleton}/></div>;
   65	  if(!business||!theme)return <div className={styles.page}><h1>Set up your business first</h1></div>;
   66	  const update=<K extends keyof ThemeState>(k:K,v:ThemeState[K])=>setTheme(t=>t?{...t,[k]:v}:t);
   67	  const uploadBackground=async(file?:File)=>{if(!file)return;setBackgroundUploading(true);try{const url=await uploadImage(file,"background");update("backgroundImageUrl",url);toast.success("Background image uploaded. Save theme to publish it.");}catch(e){toast.error(e instanceof Error?e.message:"Could not upload background image.");}finally{setBackgroundUploading(false);if(backgroundFileRef.current)backgroundFileRef.current.value="";}};
   68	  const save=async()=>{try{const safeTheme=subscription?.isPremiumPlus?theme:{...theme,siteMode:"one_page" as const};await saveBusiness.mutateAsync({name:business.name,slug:business.slug,description:business.description,logoUrl:business.logoUrl,heroHeadline:business.heroHeadline,heroSubtext:business.heroSubtext,heroImageUrl:business.heroImageUrl,heroCtaLabel:business.heroCtaLabel,phone:business.phone,whatsappNumber:business.whatsappNumber,email:business.email,address:business.address,openingHours:business.openingHours,themeId:business.themeId,currency:business.currency,status:business.status,appearanceSettings:safeTheme,contentSettings:(business.contentSettings??{}) as any});toast.success("Theme saved and storefront updated.")}catch(e){toast.error(e instanceof Error?e.message:"Could not save theme.")}};
   69	  return <div className={styles.page}><Helmet><title>Theme — Oniduka</title></Helmet>
   70	    <div className={styles.head}><div><h1 className={styles.title}>Theme</h1><p className={styles.subtitle}>Edit the public storefront. The preview uses the same theme tokens as the published page.</p></div><div className={styles.actions}><Button variant="outline" onClick={()=>{setTheme(merge({}));toast.success("Defaults restored. Save to apply.")}}><RotateCcw size={15}/> Reset</Button><Button onClick={()=>void save()} disabled={saveBusiness.isPending}><Save size={15}/> Save theme</Button></div></div>
   71	    <div className={styles.grid}>
   72	      <section className={styles.panel}><h2>Color palettes</h2><div className={styles.palettes}>{palettes.map(p=><button key={p.name} className={styles.palette} type="button" onClick={()=>setTheme(t=>t?{...t,...p.v}:t)}><span className={styles.swatches}>{[p.v.backgroundColor,p.v.primaryColor,p.v.accentColor].map(c=><i key={c} style={{background:c}}/>)}</span><strong>{p.name}</strong></button>)}</div><div className={styles.fields}>{[["Background","backgroundColor"],["Primary","primaryColor"],["Accent","accentColor"],["Main text","textColor"],["Muted text","mutedTextColor"],["Card background","cardBackground"],["Button background","buttonBackground"],["Button text","buttonTextColor"],["Links","linkColor"],["Borders","borderColor"]].map(([label,key])=><ColorField key={key} label={label} value={theme[key as keyof ThemeState] as string} onChange={v=>update(key as keyof ThemeState,v as never)}/>)}</div><p className={styles.hint}>Color choices are applied to the real storefront tokens, so custom backgrounds do not leave old white text/cards behind.</p></section>
   73	      <section className={styles.panel}><h2>Typography & layout</h2><div className={styles.fields}>
   74	        <Choice label="Body font" value={theme.fontFamily} onChange={v=>update("fontFamily",v)} options={[["Inter Tight, sans-serif","Inter Tight"],["system-ui, sans-serif","System"],["Georgia, serif","Georgia"]]}/>
   75	        <Choice label="Display font" value={theme.displayFontFamily} onChange={v=>update("displayFontFamily",v)} options={[["Bricolage Grotesque, sans-serif","Bricolage Grotesque"],["Inter Tight, sans-serif","Inter Tight"],["Georgia, serif","Georgia"]]}/>
   76	        <Choice label="Body size" value={theme.bodyFontSize} onChange={v=>update("bodyFontSize",v)} options={[["15px","15px"],["16px","16px"],["17px","17px"],["18px","18px"]]}/>
   77	        <Choice label="Heading weight" value={theme.headingWeight} onChange={v=>update("headingWeight",v)} options={[["700","700"],["800","800"],["900","900"]]}/>
   78	        <Choice label="Website structure" value={subscription?.isPremiumPlus?theme.siteMode:"one_page"} onChange={v=>{if(v==="multi_page"&&!subscription?.isPremiumPlus){toast.error("Multi-page websites are included in Premium Plus.");return;}update("siteMode",v as ThemeState["siteMode"]);}} options={subscription?.isPremiumPlus?[["one_page","One-page website — ₦1,500/month"],["multi_page","Premium Plus — ₦3,000/month"]]:[["one_page","One-page website — current access"]]}/>
   79	        {subscription?.isPremiumPlus?<><Choice label="Home page" value={theme.homePage} onChange={v=>update("homePage",v)} options={[["home","Default home page"],["products","Products"],["services","Services"],["about","About"],["gallery","Gallery"],["blog","Blog"],["contact","Contact"]]}/><p className={styles.hint}>The selected page becomes the main landing page. The Home menu item on all website pages returns to it.</p></>:<p className={styles.hint}>Choosing a separate landing page is available with Premium Plus multi-page websites.</p>}
   80	        {!subscription?.isPremiumPlus&&<p className={styles.hint}>Multi-page navigation, Gallery, Blog and Services require Premium Plus. Your storefront remains one-page on the Free and One-Page plans.</p>}
   81	        <Choice label="Layout" value={theme.layout} onChange={v=>update("layout",v as ThemeState["layout"])} options={[["standard","Standard"],["wide","Wide"],["compact","Compact"]]}/>
   82	        <Choice label="Menu style" value={theme.menuStyle} onChange={v=>update("menuStyle",v as ThemeState["menuStyle"])} options={[["bar","Bar"],["pills","Pills"],["minimal","Minimal"]]}/>
   83	        <Choice label="Menu visibility" value={theme.menuVisibility} onChange={v=>update("menuVisibility",v as ThemeState["menuVisibility"])} options={[["auto","Show when scrolling up"],["always","Always visible"]]}/>
   84	        <Choice label="Brand display" value={theme.headerBrand} onChange={v=>update("headerBrand",v as ThemeState["headerBrand"])} options={[["logo","Logo only"],["logo_name","Logo + business name"],["logo_name_tagline","Logo + name + tagline"],["name","Business name only"],["name_tagline","Business name + tagline"]]}/>
   85	        <Input value={theme.headerTagline} onChange={e=>update("headerTagline",e.target.value)} placeholder="Short tagline (optional)"/>
   86	        <Choice label="Menu position" value={theme.menuPosition} onChange={v=>update("menuPosition",v as ThemeState["menuPosition"])} options={[["left","Left"],["center","Center"],["right","Right"]]}/>
   87	        <Choice label="Header alignment" value={theme.headerAlignment} onChange={v=>update("headerAlignment",v as ThemeState["headerAlignment"])} options={[["split","Brand left / actions right"],["center","Centered brand"]]}/>
   88	        <p className={styles.hint}>Business description stays out of the header. Use the Hero or About section for longer text.</p>
   89	        <Choice label="Header actions" value={theme.headerActions ? "show" : "hide"} onChange={v=>update("headerActions",v==="show")} options={[["show","Show WhatsApp / Call"],["hide","Hide actions"]]}/>
   90	        <Choice label="Hero layout" value={theme.heroLayout} onChange={v=>update("heroLayout",v as ThemeState["heroLayout"])} options={[["full","Full image"],["left","Image left"],["right","Image right"],["text","Text only"]]}/>
   91	        <Choice label="Card radius" value={theme.cardRadius} onChange={v=>update("cardRadius",v)} options={[["6px","6px"],["10px","10px"],["14px","14px"],["20px","20px"]]}/>
   92	      </div></section>
   93	      <section className={styles.panel}><h2>Background image</h2><input ref={backgroundFileRef} type="file" accept="image/png,image/jpeg,image/webp" style={{display:"none"}} onChange={e=>void uploadBackground(e.target.files?.[0])}/><div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}><Button type="button" variant="outline" disabled={backgroundUploading} onClick={()=>backgroundFileRef.current?.click()}><ImagePlus size={15}/>{backgroundUploading?"Uploading…":theme.backgroundImageUrl?"Replace image":"Upload image"}</Button>{theme.backgroundImageUrl&&<Button type="button" variant="ghost" onClick={()=>update("backgroundImageUrl","")}><Trash2 size={15}/> Remove</Button>}</div><Input value={theme.backgroundImageUrl} onChange={e=>update("backgroundImageUrl",e.target.value)} placeholder="Or paste an image URL"/><label className={styles.range}>Overlay <input type="range" min="0" max="80" value={theme.backgroundOverlay} onChange={e=>update("backgroundOverlay",Number(e.target.value))}/><span>{theme.backgroundOverlay}%</span></label><p className={styles.hint}>Use a clear image that keeps text readable. PNG, JPG and WebP up to 3 MB are supported.</p></section>
   94	      <section className={styles.previewPanel} style={preview as React.CSSProperties}>
   95	        <div className={styles.previewHeaderRow}>
   96	          <div className={styles.previewIdentity}>
   97	            {(theme.headerBrand === "logo" || theme.headerBrand === "logo_name" || theme.headerBrand === "logo_name_tagline") && <div className={styles.previewLogo}>{business.logoUrl ? <img src={business.logoUrl} alt="" /> : business.name.charAt(0)}</div>}
   98	            {theme.headerBrand !== "logo" && <div><strong className={styles.previewBusinessName}>{business.name}</strong>{(theme.headerBrand === "logo_name_tagline" || theme.headerBrand === "name_tagline") && theme.headerTagline && <p className={styles.previewTagline}>{theme.headerTagline}</p>}</div>}
   99	            {theme.headerBrand === "logo" && theme.headerTagline && <span className={styles.previewTagline}>{theme.headerTagline}</span>}
  100	          </div>
  101	          <nav className={`${styles.previewNav} ${styles[`menuPos_${theme.menuPosition}`]}`}>Home · Products · About · Contact</nav>
  102	          {theme.headerActions && <span className={styles.previewActions}>WhatsApp · Call</span>}
  103	        </div>
  104	        <div className={`${styles.previewHero} ${styles[`previewHero_${theme.heroLayout}`]}`}>
  105	          {theme.heroLayout !== "text" && <div className={styles.previewHeroImage} style={business.heroImageUrl ? {backgroundImage:`url("${business.heroImageUrl}")`} : undefined}>{!business.heroImageUrl && "Hero image"}</div>}
  106	          <div className={styles.previewHeroText}>
  107	            <h2>{business.heroHeadline || "Storefront headline"}</h2>
  108	            <p>{business.heroSubtext || "Readable body text follows your selected typography and colors."}</p>
  109	            <Button style={{background:"var(--store-button)",color:"var(--store-button-text)"}}>{business.heroCtaLabel || "Primary action"}</Button>
  110	          </div>
  111	        </div>
  112	        <div className={styles.previewCards}><div><strong>Product card</strong><p>Card text remains readable.</p></div><div><strong>Another card</strong><p>Border and surface use theme tokens.</p></div></div>
  113	        <a href="#preview">Example link</a>
  114	      </section>
  115	      <section className={styles.panel}><h2>Home page editor</h2><p className={styles.hint}>Choose what appears on the home page and arrange the sections. Use the arrows to change their order; hiding a section keeps its content saved.</p><div className={styles.fields}>{editableSections.map(([key,label],index)=>{const order=theme.sectionOrder.length?theme.sectionOrder:editableSections.map(([k])=>k);const position=order.indexOf(key);return <div key={key} style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) auto auto",gap:8,alignItems:"center",padding:"8px 0",borderBottom:"1px solid var(--border)"}}><label style={{display:"flex",gap:8,alignItems:"center",minWidth:0}}><input type="checkbox" checked={theme.sections[key]!==false} onChange={e=>update("sections",{...theme.sections,[key]:e.target.checked})}/><span>{label}</span></label><Button type="button" size="sm" variant="outline" disabled={position<=0} onClick={()=>{const next=[...order];[next[position-1],next[position]]=[next[position],next[position-1]];update("sectionOrder",next)}} aria-label={`Move ${label} up`}>↑</Button><Button type="button" size="sm" variant="outline" disabled={position<0||position>=order.length-1} onClick={()=>{const next=[...order];[next[position],next[position+1]]=[next[position+1],next[position]];update("sectionOrder",next)}} aria-label={`Move ${label} down`}>↓</Button></div>})}</div></section>
  116	      <section className={styles.panel}><h2>Footer</h2><p className={styles.hint}>Choose whether the business footer appears across the site.</p><Choice label="Footer visibility" value={theme.footerMode} onChange={v=>update("footerMode",v as ThemeState["footerMode"])} options={[["all","Show on every page"],["selected","Only selected pages"],["none","Hide footer everywhere"]]}/>{theme.footerMode==="selected"&&<div className={styles.fields}>{[["home","Home"],["products","Products"],["services","Services"],["about","About"],["gallery","Gallery"],["blog","Blog"],["contact","Contact"],["product-detail","Product details"],["service-detail","Service details"],["blog-detail","Blog articles"],["gallery-detail","Gallery pages"],["tracking","Order tracking"]].map(([key,label])=><label key={key} style={{display:"flex",gap:8,alignItems:"center"}}><input type="checkbox" checked={theme.footerPages.includes(key)} onChange={e=>update("footerPages",e.target.checked?[...theme.footerPages,key]:theme.footerPages.filter(x=>x!==key))}/>{label}</label>)}</div>}</section>
  117	    </div>
  118	  </div>;
  119	};
  120	export default ThemePage;
  121	

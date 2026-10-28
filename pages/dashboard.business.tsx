import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import { toast } from "sonner";
import { Palette, Upload, X } from "lucide-react";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Skeleton } from "../components/Skeleton";
import { Spinner } from "../components/Spinner";
import { Switch } from "../components/Switch";
   10	import { Textarea } from "../components/Textarea";
   11	import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/Tabs";
   12	import { ThemePreview } from "../components/ThemePreview";
   13	import { uploadImage } from "../helpers/uploadImage";
   14	import { useMyBusiness } from "../helpers/useMyBusiness";
   15	import { useSaveBusiness } from "../helpers/useSaveBusiness";
   16	import { toSlug } from "../helpers/toSlug";
   17	import type { StoreTheme } from "../helpers/schema";
   18	import styles from "./dashboard.business.module.css";
   19	
   20	const themes: { id: StoreTheme; name: string; blurb: string }[] = [
   21	  { id: "clean", name: "Clean", blurb: "Simple, professional layout." },
   22	  { id: "commerce", name: "Commerce", blurb: "Product-focused catalogue." },
   23	  { id: "service", name: "Service", blurb: "For repairs, salons and consultants." },
   24	];
   25	
   26	type Sections = {
   27	  hero: boolean; gallery: boolean; featured: boolean; catalogue: boolean;
   28	  about: boolean; work: boolean; testimonials: boolean; blog: boolean; contact: boolean;
   29	};
   30	type FormState = {
   31	  name: string; slug: string; logoUrl: string | null; description: string;
   32	  phone: string; whatsappNumber: string; email: string; address: string; openingHours: string;
   33	  themeId: StoreTheme; currency: string; published: boolean;
   34	  primaryColor: string; accentColor: string; backgroundColor: string;
   35	  backgroundImageUrl: string | null; backgroundOverlay: number;
   36	  layout: "standard" | "wide" | "compact"; menuStyle: "bar" | "pills" | "minimal";
   37	  menuVisibility: "auto" | "always"; testimonialsHeading: string; testimonialsIntro: string;
   38	  sections: Sections;
   39	};
   40	const defaultSections: Sections = {
   41	  hero:true,gallery:true,featured:true,catalogue:true,about:true,work:true,testimonials:true,blog:true,contact:true,
   42	};
   43	const emptyForm: FormState = {
   44	  name:"",slug:"",logoUrl:null,description:"",phone:"",whatsappNumber:"",email:"",address:"",openingHours:"",
   45	  themeId:"clean",currency:"NGN",published:false,primaryColor:"#0e5c3f",accentColor:"#d97706",
   46	  backgroundColor:"#f7f4ec",backgroundImageUrl:null,backgroundOverlay:0,layout:"standard",menuStyle:"bar",
   47	  menuVisibility:"auto",testimonialsHeading:"What our customers are saying",
   48	  testimonialsIntro:"Real feedback from people who have worked with us.",sections:defaultSections,
   49	};
   50	
   51	const BusinessSettingsPage = () => {
   52	  const { data, isFetching } = useMyBusiness();
   53	  const saveBusiness = useSaveBusiness();
   54	  const [form,setForm] = useState<FormState>(emptyForm);
   55	  const [slugTouched,setSlugTouched] = useState(false);
   56	  const [loaded,setLoaded] = useState(false);
   57	  const [uploadingLogo,setUploadingLogo] = useState(false);
   58	  const [uploadingBackground,setUploadingBackground] = useState(false);
   59	  const logoInputRef = useRef<HTMLInputElement>(null);
   60	  const backgroundInputRef = useRef<HTMLInputElement>(null);
   61	  const business = data?.business ?? null;
   62	  const isNew = !business;
   63	
   64	  useEffect(() => {
   65	    if (!data || loaded) return;
   66	    if (data.business) {
   67	      const appearance=(data.business.appearanceSettings??{}) as Record<string,unknown>;
   68	      const content=(data.business.contentSettings??{}) as Record<string,unknown>;
   69	      const sections={...defaultSections,...(typeof appearance.sections==="object"&&appearance.sections!==null?appearance.sections:{})} as Sections;
   70	      setForm({
   71	        name:data.business.name,slug:data.business.slug,logoUrl:data.business.logoUrl,
   72	        description:data.business.description??"",phone:data.business.phone??"",
   73	        whatsappNumber:data.business.whatsappNumber??"",email:data.business.email??"",
   74	        address:data.business.address??"",openingHours:data.business.openingHours??"",
   75	        themeId:data.business.themeId,currency:data.business.currency,
   76	        published:data.business.status==="published",
   77	        primaryColor:String(appearance.primaryColor??emptyForm.primaryColor),
   78	        accentColor:String(appearance.accentColor??emptyForm.accentColor),
   79	        backgroundColor:String(appearance.backgroundColor??emptyForm.backgroundColor),
   80	        backgroundImageUrl:typeof appearance.backgroundImageUrl==="string"?appearance.backgroundImageUrl:null,
   81	        backgroundOverlay:typeof appearance.backgroundOverlay==="number"?appearance.backgroundOverlay:0,
   82	        layout:appearance.layout==="wide"||appearance.layout==="compact"?appearance.layout:"standard",
   83	        menuStyle:appearance.menuStyle==="pills"||appearance.menuStyle==="minimal"?appearance.menuStyle:"bar",
   84	        menuVisibility:appearance.menuVisibility==="always"?"always":"auto",
   85	        testimonialsHeading:String(content.testimonialsHeading??emptyForm.testimonialsHeading),
   86	        testimonialsIntro:String(content.testimonialsIntro??emptyForm.testimonialsIntro),sections,
   87	      });
   88	      setSlugTouched(true);
   89	    }
   90	    setLoaded(true);
   91	  },[data,loaded]);
   92	
   93	  const update=<K extends keyof FormState>(key:K,value:FormState[K])=>setForm(current=>({...current,[key]:value}));
   94	  const handleNameChange=(value:string)=>setForm(current=>({...current,name:value,slug:slugTouched?current.slug:toSlug(value)}));
   95	
   96	  const handleLogo=async(file:File|undefined)=>{
   97	    if(!file)return; setUploadingLogo(true);
   98	    try{update("logoUrl",await uploadImage(file,"logo"))}
   99	    catch(error){toast.error(error instanceof Error?error.message:"Could not upload the logo.")}
  100	    finally{setUploadingLogo(false);if(logoInputRef.current)logoInputRef.current.value=""}
  101	  };
  102	  const handleBackground=async(file:File|undefined)=>{
  103	    if(!file)return; setUploadingBackground(true);
  104	    try{update("backgroundImageUrl",await uploadImage(file,"background"))}
  105	    catch(error){toast.error(error instanceof Error?error.message:"Could not upload the background image.")}
  106	    finally{setUploadingBackground(false);if(backgroundInputRef.current)backgroundInputRef.current.value=""}
  107	  };
  108	  const toggleSection=(key:keyof Sections,checked:boolean)=>setForm(current=>({...current,sections:{...current.sections,[key]:checked}}));
  109	
  110	  const handleSave=async()=>{
  111	    try{
  112	      await saveBusiness.mutateAsync({
  113	        name:form.name,slug:form.slug,description:form.description,logoUrl:form.logoUrl,
  114	        phone:form.phone,whatsappNumber:form.whatsappNumber,email:form.email,address:form.address,
  115	        openingHours:form.openingHours,themeId:form.themeId,currency:form.currency,
  116	        status:form.published?"published":"draft",
  117	        appearanceSettings:{
  118	          primaryColor:form.primaryColor,accentColor:form.accentColor,backgroundColor:form.backgroundColor,
  119	          backgroundImageUrl:form.backgroundImageUrl,backgroundOverlay:form.backgroundOverlay,
  120	          layout:form.layout,menuStyle:form.menuStyle,menuVisibility:form.menuVisibility,sections:form.sections,
  121	        },
  122	        contentSettings:{testimonialsHeading:form.testimonialsHeading,testimonialsIntro:form.testimonialsIntro},
  123	      });
  124	      toast.success(isNew?"Business page created.":"Changes saved.");
  125	    }catch(error){toast.error(error instanceof Error?error.message:"Could not save your changes.")}
  126	  };
  127	
  128	  if(isFetching&&!data)return <div className={styles.page}><Skeleton className={styles.skeletonTitle}/><Skeleton className={styles.skeletonBlock}/></div>;
  129	
  130	  return <div className={styles.page}>
  131	    <Helmet><title>Business — Oniduka</title></Helmet>
  132	    <div className={styles.head}>
  133	      <div><h1 className={styles.title}>{isNew?"Create your business page":"Business"}</h1><p className={styles.subtitle}>Manage your information, design and publishing settings in separate tabs.</p></div>
  134	      {business&&<span className={styles.status}>{form.published?"Published":"Draft"}</span>}
  135	    </div>
  136	
  137	    <Tabs defaultValue="profile" className={styles.tabs}>
  138	      <TabsList>
  139	        <TabsTrigger value="profile">Profile</TabsTrigger>
  140	        <TabsTrigger value="contact">Contact</TabsTrigger>
  141	        <TabsTrigger value="theme"><Palette size={14}/> Theme</TabsTrigger>
  142	        <TabsTrigger value="content">Content</TabsTrigger>
  143	        <TabsTrigger value="publishing">Publishing</TabsTrigger>
  144	      </TabsList>
  145	
  146	      <TabsContent value="profile"><section className={styles.group}>
  147	        <h2 className={styles.groupTitle}>Business basics</h2>
  148	        <label className={styles.field}><span className={styles.label}>Business name</span><Input value={form.name} onChange={e=>handleNameChange(e.target.value)} placeholder="NesMage Tech Solutions"/></label>
  149	        <div className={styles.field}><span className={styles.label}>Business logo</span><input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>void handleLogo(e.target.files?.[0])}/><div className={styles.imageRow}>{form.logoUrl&&<img src={form.logoUrl} alt="Business logo" className={styles.logoPreview}/>} {form.logoUrl&&<Button variant="ghost" size="sm" onClick={()=>update("logoUrl",null)}>Remove</Button>} {uploadingLogo&&<Spinner size="sm"/>}</div><span className={styles.hint}>PNG, JPG or WebP, up to 3 MB.</span></div>
  150	        <label className={styles.field}><span className={styles.label}>Page address</span><div className={styles.slugRow}><span className={styles.slugPrefix}>/store/</span><Input value={form.slug} onChange={e=>{setSlugTouched(true);update("slug",toSlug(e.target.value))}} placeholder="nesmage-tech"/></div><span className={styles.hint}>Changing this breaks links you have already shared.</span></label>
  151	        <label className={styles.field}><span className={styles.label}>Short description</span><Textarea value={form.description} onChange={e=>update("description",e.target.value)} placeholder="What you sell, and where customers can find you." rows={4}/></label>
  152	      </section></TabsContent>
  153	
  154	      <TabsContent value="contact"><section className={styles.group}>
  155	        <h2 className={styles.groupTitle}>Contact details</h2>
  156	        <label className={styles.field}><span className={styles.label}>WhatsApp number</span><Input value={form.whatsappNumber} onChange={e=>update("whatsappNumber",e.target.value)} placeholder="0803 123 4567" inputMode="tel"/><span className={styles.hint}>Orders and WhatsApp enquiries are sent here.</span></label>
  157	        <label className={styles.field}><span className={styles.label}>Phone number</span><Input value={form.phone} onChange={e=>update("phone",e.target.value)} placeholder="0803 123 4567" inputMode="tel"/></label>
  158	        <label className={styles.field}><span className={styles.label}>Email</span><Input value={form.email} onChange={e=>update("email",e.target.value)} placeholder="hello@yourshop.ng" type="email"/></label>
  159	        <label className={styles.field}><span className={styles.label}>Address</span><Input value={form.address} onChange={e=>update("address",e.target.value)} placeholder="12 Otigba Street, Ikeja, Lagos"/></label>
  160	        <label className={styles.field}><span className={styles.label}>Opening hours</span><Input value={form.openingHours} onChange={e=>update("openingHours",e.target.value)} placeholder="Mon - Sat, 9:00am - 7:00pm"/></label>
  161	      </section></TabsContent>
  162	
  163	      <TabsContent value="theme">
  164	        <section className={styles.group}><h2 className={styles.groupTitle}>Theme engine</h2><p className={styles.hint}>Choose the structure, then control colors, background imagery, navigation and sections without editing the page.</p>
  165	          <div className={styles.themes}>{themes.map(theme=><button key={theme.id} type="button" className={`${styles.theme} ${form.themeId===theme.id?styles.themeActive:""}`} onClick={()=>update("themeId",theme.id)} aria-pressed={form.themeId===theme.id}><ThemePreview theme={theme.id} className={styles.themeImage}/><span className={styles.themeName}>{theme.name}</span><span className={styles.themeBlurb}>{theme.blurb}</span></button>)}</div>
  166	          <div className={styles.twoUp}>
  167	            <label className={styles.field}><span className={styles.label}>Primary color</span><Input type="color" value={form.primaryColor} onChange={e=>update("primaryColor",e.target.value)}/></label>
  168	            <label className={styles.field}><span className={styles.label}>Accent color</span><Input type="color" value={form.accentColor} onChange={e=>update("accentColor",e.target.value)}/></label>
  169	          </div>
  170	          <label className={styles.field}><span className={styles.label}>Page background color</span><Input type="color" value={form.backgroundColor} onChange={e=>update("backgroundColor",e.target.value)}/></label>
  171	          <div className={styles.field}><span className={styles.label}>Background image</span><input ref={backgroundInputRef} type="file" accept="image/png,image/jpeg,image/webp" className={styles.hiddenInput} onChange={e=>void handleBackground(e.target.files?.[0])}/><div className={styles.backgroundPreview} style={form.backgroundImageUrl?{backgroundImage:`url("${form.backgroundImageUrl}")`}:{}}>{!form.backgroundImageUrl&&<span>No background image selected</span>}</div><div className={styles.imageActions}><Button variant="outline" size="sm" disabled={uploadingBackground} onClick={()=>backgroundInputRef.current?.click()}><Upload size={15}/>{uploadingBackground?"Uploading…":form.backgroundImageUrl?"Replace image":"Use image"}</Button>{form.backgroundImageUrl&&<Button variant="ghost" size="sm" onClick={()=>update("backgroundImageUrl",null)}><X size={15}/>Remove</Button>}</div><span className={styles.hint}>The image covers the page background. Use the overlay slider for readability.</span></div>
  172	          <label className={styles.field}><span className={styles.label}>Background image overlay: {form.backgroundOverlay}%</span><input type="range" min="0" max="80" step="5" value={form.backgroundOverlay} onChange={e=>update("backgroundOverlay",Number(e.target.value))}/></label>
  173	          <div className={styles.optionGrid}>
  174	            <div><span className={styles.label}>Page width</span><div className={styles.options}>{(["standard","wide","compact"] as const).map(v=><button key={v} type="button" className={form.layout===v?styles.optionActive:styles.option} onClick={()=>update("layout",v)}>{v[0].toUpperCase()+v.slice(1)}</button>)}</div></div>
  175	            <div><span className={styles.label}>Menu style</span><div className={styles.options}>{(["bar","pills","minimal"] as const).map(v=><button key={v} type="button" className={form.menuStyle===v?styles.optionActive:styles.option} onClick={()=>update("menuStyle",v)}>{v[0].toUpperCase()+v.slice(1)}</button>)}</div></div>
  176	            <div><span className={styles.label}>Menu visibility</span><div className={styles.options}><button type="button" className={form.menuVisibility==="auto"?styles.optionActive:styles.option} onClick={()=>update("menuVisibility","auto")}>Scroll-aware</button><button type="button" className={form.menuVisibility==="always"?styles.optionActive:styles.option} onClick={()=>update("menuVisibility","always")}>Always visible</button></div></div>
  177	          </div>
  178	        </section>
  179	        <section className={styles.group}><h2 className={styles.groupTitle}>Page sections</h2><p className={styles.hint}>Hide a section without deleting its content.</p><div className={styles.sectionGrid}>{(Object.keys(defaultSections) as Array<keyof Sections>).map(key=><div key={key} className={styles.switchRow}><Switch id={`section-${key}`} checked={form.sections[key]} onCheckedChange={checked=>toggleSection(key,checked)}/><label htmlFor={`section-${key}`}><span className={styles.label}>{key[0].toUpperCase()+key.slice(1)}</span></label></div>)}</div></section>
  180	      </TabsContent>
  181	
  182	      <TabsContent value="content"><section className={styles.group}><h2 className={styles.groupTitle}>Storefront wording</h2><label className={styles.field}><span className={styles.label}>Customer feedback heading</span><Input value={form.testimonialsHeading} onChange={e=>update("testimonialsHeading",e.target.value)} placeholder="What our customers are saying"/></label><label className={styles.field}><span className={styles.label}>Customer feedback intro</span><Textarea value={form.testimonialsIntro} onChange={e=>update("testimonialsIntro",e.target.value)} rows={3} placeholder="Real feedback from people who have worked with us."/></label><div className={styles.linkCards}><a href="/dashboard/presence">Hero, testimonials and portfolio <span>Manage storefront content →</span></a><a href="/dashboard/galleries">Galleries <span>Manage image galleries →</span></a><a href="/dashboard/blog">Blog <span>Publish articles and updates →</span></a></div></section></TabsContent>
  183	
  184	      <TabsContent value="publishing"><section className={styles.group}><h2 className={styles.groupTitle}>Publishing</h2><div className={styles.switchRow}><Switch id="published" checked={form.published} onCheckedChange={checked=>update("published",checked)}/><label htmlFor="published"><span className={styles.label}>Published</span><span className={styles.hint}>When enabled, customers can open your public page.</span></label></div>{business&&<div className={styles.publishCard}><span className={styles.label}>Public page</span><code>/store/{form.slug}</code><a href={`/store/${form.slug}`} target="_blank" rel="noopener noreferrer">Open public page →</a></div>}</section></TabsContent>
  185	    </Tabs>
  186	    <div className={styles.actions}><Button onClick={()=>void handleSave()} disabled={saveBusiness.isPending||uploadingLogo||uploadingBackground}>{saveBusiness.isPending?<><Spinner size="sm"/>Saving</>:isNew?"Create business page":"Save changes"}</Button></div>
  187	  </div>;
  188	};
  189	export default BusinessSettingsPage;
  190	

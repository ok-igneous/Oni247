import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Palette } from "lucide-react";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Skeleton } from "../components/Skeleton";
import { Spinner } from "../components/Spinner";
import { Switch } from "../components/Switch";
import { Textarea } from "../components/Textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/Tabs";
import { uploadImage } from "../helpers/uploadImage";
import { useMyBusiness } from "../helpers/useMyBusiness";
import { useSaveBusiness } from "../helpers/useSaveBusiness";
import { toSlug } from "../helpers/toSlug";
import styles from "./dashboard.business.module.css";

type FormState = {
  name: string; slug: string; logoUrl: string | null; description: string;
  phone: string; whatsappNumber: string; email: string; address: string; openingHours: string;
  currency: string; published: boolean; testimonialsHeading: string; testimonialsIntro: string;
};
const emptyForm: FormState = {
  name:"",slug:"",logoUrl:null,description:"",phone:"",whatsappNumber:"",email:"",address:"",openingHours:"",
  currency:"NGN",published:false,testimonialsHeading:"What our customers are saying",
  testimonialsIntro:"Real feedback from people who have worked with us.",
};

/** Business details only. Everything about look, layout, pages and sections lives in Theme. */
const BusinessSettingsPage = () => {
  const { data, isFetching } = useMyBusiness();
  const saveBusiness = useSaveBusiness();
  const [form,setForm] = useState<FormState>(emptyForm);
  const [slugTouched,setSlugTouched] = useState(false);
  const [loaded,setLoaded] = useState(false);
  const [uploadingLogo,setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const business = data?.business ?? null;
  const isNew = !business;

  useEffect(() => {
    if (!data || loaded) return;
    if (data.business) {
      const content=(data.business.contentSettings??{}) as Record<string,unknown>;
      setForm({
        name:data.business.name,slug:data.business.slug,logoUrl:data.business.logoUrl,
        description:data.business.description??"",phone:data.business.phone??"",
        whatsappNumber:data.business.whatsappNumber??"",email:data.business.email??"",
        address:data.business.address??"",openingHours:data.business.openingHours??"",
        currency:data.business.currency,published:data.business.status==="published",
        testimonialsHeading:String(content.testimonialsHeading??emptyForm.testimonialsHeading),
        testimonialsIntro:String(content.testimonialsIntro??emptyForm.testimonialsIntro),
      });
      setSlugTouched(true);
    }
    setLoaded(true);
  },[data,loaded]);

  const update=<K extends keyof FormState>(key:K,value:FormState[K])=>setForm(current=>({...current,[key]:value}));
  const handleNameChange=(value:string)=>setForm(current=>({...current,name:value,slug:slugTouched?current.slug:toSlug(value)}));

  const handleLogo=async(file:File|undefined)=>{
    if(!file)return; setUploadingLogo(true);
    try{update("logoUrl",await uploadImage(file,"logo"))}
    catch(error){toast.error(error instanceof Error?error.message:"Could not upload the logo.")}
    finally{setUploadingLogo(false);if(logoInputRef.current)logoInputRef.current.value=""}
  };

  const handleSave=async()=>{
    try{
      // Appearance settings are not sent at all, so saving business details can never reset the theme,
      // the one-page or multi-page choice, menus or sections. Content settings are merged, not replaced.
      await saveBusiness.mutateAsync({
        name:form.name,slug:form.slug,description:form.description,logoUrl:form.logoUrl,
        phone:form.phone,whatsappNumber:form.whatsappNumber,email:form.email,address:form.address,
        openingHours:form.openingHours,themeId:business?.themeId??"clean",currency:form.currency,
        status:form.published?"published":"draft",
        contentSettings:{...((business?.contentSettings??{}) as Record<string,unknown>),testimonialsHeading:form.testimonialsHeading,testimonialsIntro:form.testimonialsIntro},
      });
      toast.success(isNew?"Business page created.":"Changes saved.");
    }catch(error){toast.error(error instanceof Error?error.message:"Could not save your changes.")}
  };

  if(isFetching&&!data)return <div className={styles.page}><Skeleton className={styles.skeletonTitle}/><Skeleton className={styles.skeletonBlock}/></div>;

  return <div className={styles.page}>
    <Helmet><title>Business — Oni247</title></Helmet>
    <div className={styles.head}>
      <div><h1 className={styles.title}>{isNew?"Create your business page":"Business"}</h1><p className={styles.subtitle}>Your business details and publishing. Look, layout and pages are in <Link to="/dashboard/theme">Theme</Link>.</p></div>
      {business&&<span className={styles.status}>{form.published?"Published":"Draft"}</span>}
    </div>

    <Tabs defaultValue="profile" className={styles.tabs}>
      <TabsList>
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="contact">Contact</TabsTrigger>
        <TabsTrigger value="content">Content</TabsTrigger>
        <TabsTrigger value="publishing">Publishing</TabsTrigger>
      </TabsList>

      <TabsContent value="profile"><section className={styles.group}>
        <h2 className={styles.groupTitle}>Business basics</h2>
        <label className={styles.field}><span className={styles.label}>Business name</span><Input value={form.name} onChange={e=>handleNameChange(e.target.value)} placeholder="NesMage Tech Solutions"/></label>
        <div className={styles.field}><span className={styles.label}>Business logo</span><input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>void handleLogo(e.target.files?.[0])}/><div className={styles.imageRow}>{form.logoUrl&&<img src={form.logoUrl} alt="Business logo" className={styles.logoPreview}/>} {form.logoUrl&&<Button variant="ghost" size="sm" onClick={()=>update("logoUrl",null)}>Remove</Button>} {uploadingLogo&&<Spinner size="sm"/>}</div><span className={styles.hint}>PNG, JPG or WebP, up to 3 MB.</span></div>
        <label className={styles.field}><span className={styles.label}>Page address</span><div className={styles.slugRow}><span className={styles.slugPrefix}>/</span><Input value={form.slug} onChange={e=>{setSlugTouched(true);update("slug",toSlug(e.target.value))}} placeholder="nesmage-tech"/></div><span className={styles.hint}>Changing this breaks links you have already shared.</span></label>
        <label className={styles.field}><span className={styles.label}>Short description</span><Textarea value={form.description} onChange={e=>update("description",e.target.value)} placeholder="What you sell, and where customers can find you." rows={4}/></label>
      </section></TabsContent>

      <TabsContent value="contact"><section className={styles.group}>
        <h2 className={styles.groupTitle}>Contact details</h2>
        <label className={styles.field}><span className={styles.label}>WhatsApp number</span><Input value={form.whatsappNumber} onChange={e=>update("whatsappNumber",e.target.value)} placeholder="0803 123 4567" inputMode="tel"/><span className={styles.hint}>Orders and WhatsApp enquiries are sent here.</span></label>
        <label className={styles.field}><span className={styles.label}>Phone number</span><Input value={form.phone} onChange={e=>update("phone",e.target.value)} placeholder="0803 123 4567" inputMode="tel"/></label>
        <label className={styles.field}><span className={styles.label}>Email</span><Input value={form.email} onChange={e=>update("email",e.target.value)} placeholder="hello@yourshop.ng" type="email"/></label>
        <label className={styles.field}><span className={styles.label}>Address</span><Input value={form.address} onChange={e=>update("address",e.target.value)} placeholder="12 Otigba Street, Ikeja, Lagos"/></label>
        <label className={styles.field}><span className={styles.label}>Opening hours</span><Input value={form.openingHours} onChange={e=>update("openingHours",e.target.value)} placeholder="Mon - Sat, 9:00am - 7:00pm"/></label>
      </section></TabsContent>

      <TabsContent value="content"><section className={styles.group}><h2 className={styles.groupTitle}>Storefront wording</h2><label className={styles.field}><span className={styles.label}>Customer feedback heading</span><Input value={form.testimonialsHeading} onChange={e=>update("testimonialsHeading",e.target.value)} placeholder="What our customers are saying"/></label><label className={styles.field}><span className={styles.label}>Customer feedback intro</span><Textarea value={form.testimonialsIntro} onChange={e=>update("testimonialsIntro",e.target.value)} rows={3} placeholder="Real feedback from people who have worked with us."/></label><div className={styles.linkCards}><Link to="/dashboard/theme"><Palette size={14}/> Look, layout and sections <span>Open Theme →</span></Link><a href="/dashboard/presence">Hero, testimonials and portfolio <span>Manage storefront content →</span></a><a href="/dashboard/galleries">Galleries <span>Manage image galleries →</span></a><a href="/dashboard/blog">Blog <span>Publish articles and updates →</span></a></div></section></TabsContent>

      <TabsContent value="publishing"><section className={styles.group}><h2 className={styles.groupTitle}>Publishing</h2><div className={styles.switchRow}><Switch id="published" checked={form.published} onCheckedChange={checked=>update("published",checked)}/><label htmlFor="published"><span className={styles.label}>Published</span><span className={styles.hint}>When enabled, customers can open your public page.</span></label></div>{business&&<div className={styles.publishCard}><span className={styles.label}>Public page</span><code>/{form.slug}</code><a href={`/${form.slug}`} target="_blank" rel="noopener noreferrer">Open public page →</a></div>}</section></TabsContent>
    </Tabs>
    <div className={styles.actions}><Button onClick={()=>void handleSave()} disabled={saveBusiness.isPending||uploadingLogo}>{saveBusiness.isPending?<><Spinner size="sm"/>Saving</>:isNew?"Create business page":"Save changes"}</Button></div>
  </div>;
};
export default BusinessSettingsPage;


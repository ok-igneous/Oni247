"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, ImagePlus, Plus, Trash2 } from "lucide-react";
import { Button } from "../../../../components/Button";
import { Input } from "../../../../components/Input";
import { Textarea } from "../../../../components/Textarea";
import { Skeleton } from "../../../../components/Skeleton";
import { Field, Fields, PageHead, Panel } from "../../../../components/Panel";
import { DEFAULT_PORTFOLIO, type Portfolio, type PortfolioItem } from "../../../../helpers/portfolioConfig";
import { getPortfolio } from "../../../../endpoints/portfolio_GET.schema";
import { postAdminPortfolio } from "../../../../endpoints/admin/portfolio_POST.schema";
import { uploadPortfolioImage } from "../../../../helpers/uploadPortfolioImage";
import styles from "./admin.portfolio.module.css";

const PortfolioAdminPage = () => {
  const [value, setValue] = useState<Portfolio>(DEFAULT_PORTFOLIO);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const profileInput = useRef<HTMLInputElement>(null);
  const itemInputs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    let active = true;
    void getPortfolio().then((result) => { if (active) setValue(result.portfolio); })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Could not load portfolio."))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const change = (patch: Partial<Portfolio>) => { setValue((current) => ({ ...current, ...patch })); setDirty(true); };
  const changeItem = (group: "services" | "projects", index: number, patch: Partial<PortfolioItem>) =>
    change({ [group]: value[group].map((item, i) => i === index ? { ...item, ...patch } : item) });
  const upload = async (file: File | undefined, target: "profile" | "services" | "projects", index = -1) => {
    if (!file) return;
    const key = target === "profile" ? "profile" : `${target}-${index}`;
    setUploading(key);
    try {
      const url = await uploadPortfolioImage(file);
      if (target === "profile") change({ profileImageUrl: url });
      else changeItem(target, index, { imageUrl: url });
      toast.success("Image uploaded. Save your portfolio to publish the change.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Image upload failed."); }
    finally { setUploading(null); if (target === "profile" && profileInput.current) profileInput.current.value = ""; if (target !== "profile") { const input = itemInputs.current[key]; if (input) input.value = ""; } }
  };
  const save = async () => {
    setSaving(true);
    try { await postAdminPortfolio({ portfolio: value }); setDirty(false); toast.success("Portfolio saved. The public page now uses your latest content."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not save portfolio."); }
    finally { setSaving(false); }
  };

  if (loading) return <div className={styles.page}><Skeleton className={styles.skeleton}/><Skeleton className={styles.skeleton}/></div>;

  return <div className={styles.page}>
    
    <PageHead title="Portfolio editor" lead="Edit the public Emmanuel Ponle profile. Update text, add projects and services, and upload images without changing code." />
    <div className={styles.topActions}><a href="/emmanuel-ponle" target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/> View public portfolio</a><span>{dirty ? "Unsaved changes" : "All changes saved"}</span></div>

    <Panel title="Profile and introduction" desc="The main identity and first section visitors see.">
      <div className={styles.imageField}><div><strong>Profile photograph</strong><p>Upload a clear portrait. PNG, JPG or WebP.</p></div><input ref={profileInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e=>void upload(e.target.files?.[0],"profile")}/><Button variant="outline" onClick={()=>profileInput.current?.click()} disabled={uploading!==null}><ImagePlus size={15}/>{uploading==="profile"?"Uploading…":"Upload photo"}</Button></div>
      {value.profileImageUrl && <div className={styles.photoPreview}><img src={value.profileImageUrl} alt="Profile preview"/><Button size="sm" variant="ghost" onClick={()=>change({profileImageUrl:""})}>Remove photo</Button></div>}
      <Fields>
        <Field label="Full name"><Input value={value.name} onChange={e=>change({name:e.target.value})}/></Field>
        <Field label="Availability label"><Input value={value.availability} onChange={e=>change({availability:e.target.value})}/></Field>
        <Field label="Small heading above title"><Input value={value.eyebrow} onChange={e=>change({eyebrow:e.target.value})}/></Field>
        <Field label="Main headline" full><Textarea rows={2} value={value.headline} onChange={e=>change({headline:e.target.value})}/></Field>
        <Field label="Introduction" full><Textarea rows={4} value={value.intro} onChange={e=>change({intro:e.target.value})}/></Field>
        <Field label="Location"><Input value={value.location} onChange={e=>change({location:e.target.value})}/></Field>
        <Field label="Hero side quote" full><Textarea rows={2} value={value.approachTitle} onChange={e=>change({approachTitle:e.target.value})}/></Field>
      </Fields>
    </Panel>

    <Panel title="About section" desc="Edit the heading and paragraphs in your biography.">
      <Fields><Field label="Section heading" full><Textarea rows={2} value={value.aboutTitle} onChange={e=>change({aboutTitle:e.target.value})}/></Field><Field label="Paragraph one" full><Textarea rows={4} value={value.aboutOne} onChange={e=>change({aboutOne:e.target.value})}/></Field><Field label="Paragraph two" full><Textarea rows={4} value={value.aboutTwo} onChange={e=>change({aboutTwo:e.target.value})}/></Field></Fields>
    </Panel>

    <Panel title="Services and capabilities" desc="Add or remove services. Each item has a title and description.">
      {value.services.map((item,i)=><div className={styles.item} key={`service-${i}`}><div className={styles.itemHead}><strong>Service {i+1}</strong><Button size="icon-sm" variant="ghost" aria-label="Remove service" onClick={()=>change({services:value.services.filter((_,j)=>j!==i)})}><Trash2 size={15}/></Button></div><Fields><Field label="Service title"><Input value={item.title} onChange={e=>changeItem("services",i,{title:e.target.value})}/></Field><Field label="Category"><Input value={item.category} onChange={e=>changeItem("services",i,{category:e.target.value})}/></Field><Field label="Description" full><Textarea rows={3} value={item.text} onChange={e=>changeItem("services",i,{text:e.target.value})}/></Field></Fields></div>)}
      <Button variant="outline" onClick={()=>change({services:[...value.services,{title:"New service",text:"",category:"",imageUrl:"",linkUrl:""}]})} disabled={value.services.length>=30}><Plus size={15}/> Add service</Button>
    </Panel>

    <Panel title="Projects and work" desc="Add project details and upload a cover image for each project.">
      {value.projects.map((item,i)=>{const key=`projects-${i}`;return <div className={styles.item} key={`project-${i}`}><div className={styles.itemHead}><strong>Project {i+1}</strong><Button size="icon-sm" variant="ghost" aria-label="Remove project" onClick={()=>change({projects:value.projects.filter((_,j)=>j!==i)})}><Trash2 size={15}/></Button></div><Fields><Field label="Project name"><Input value={item.title} onChange={e=>changeItem("projects",i,{title:e.target.value})}/></Field><Field label="Project type / status"><Input value={item.category} onChange={e=>changeItem("projects",i,{category:e.target.value})}/></Field><Field label="Description" full><Textarea rows={3} value={item.text} onChange={e=>changeItem("projects",i,{text:e.target.value})}/></Field><Field label="Project or demo URL" full><Input value={item.linkUrl} onChange={e=>changeItem("projects",i,{linkUrl:e.target.value})} placeholder="https://…"/></Field></Fields><div className={styles.imageField}><div><strong>Project image</strong><p>Optional cover image for this project.</p></div><input ref={el=>{itemInputs.current[key]=el}} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e=>void upload(e.target.files?.[0],"projects",i)}/><Button size="sm" variant="outline" onClick={()=>itemInputs.current[key]?.click()} disabled={uploading!==null}><ImagePlus size={14}/>{uploading===key?"Uploading…":"Upload image"}</Button></div>{item.imageUrl&&<div className={styles.projectImage}><img src={item.imageUrl} alt={`${item.title} preview`}/><Button size="sm" variant="ghost" onClick={()=>changeItem("projects",i,{imageUrl:""})}>Remove image</Button></div>}</div>})}
      <Button variant="outline" onClick={()=>change({projects:[...value.projects,{title:"New project",text:"",category:"",imageUrl:"",linkUrl:""}]})} disabled={value.projects.length>=30}><Plus size={15}/> Add project</Button>
    </Panel>

    <Panel title="Contact details" desc="These details appear in the public contact section.">
      <Fields><Field label="Contact heading" full><Textarea rows={2} value={value.contactTitle} onChange={e=>change({contactTitle:e.target.value})}/></Field><Field label="Contact introduction" full><Textarea rows={3} value={value.contactText} onChange={e=>change({contactText:e.target.value})}/></Field><Field label="Phone / WhatsApp"><Input value={value.phone} onChange={e=>change({phone:e.target.value})}/></Field><Field label="Email"><Input value={value.email} onChange={e=>change({email:e.target.value})}/></Field></Fields>
    </Panel>

    <Panel title="Search engine and sharing details" desc="Metadata shown in search results and link previews.">
      <Fields><Field label="Page title (max 70 characters)" full><Input maxLength={70} value={value.seoTitle} onChange={e=>change({seoTitle:e.target.value})}/></Field><Field label="Meta description (max 200 characters)" full><Textarea rows={3} maxLength={200} value={value.seoDescription} onChange={e=>change({seoDescription:e.target.value})}/></Field></Fields>
    </Panel>
    <div className={styles.saveBar}><span>{dirty?"You have unsaved changes.":"Your portfolio is up to date."}</span><Button onClick={()=>void save()} disabled={!dirty||saving}>{saving?"Saving…":"Save portfolio"}</Button></div>
  </div>;
};
export default PortfolioAdminPage;

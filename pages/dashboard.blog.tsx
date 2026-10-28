import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import { Bold, Heading2, Italic, List, ListOrdered, Minus, Plus, Quote, Trash2, Underline, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Textarea } from "../components/Textarea";
import { Spinner } from "../components/Spinner";
import { useBlog } from "../helpers/useBlog";
   10	import { uploadImage } from "../helpers/uploadImage";
   11	import styles from "./dashboard.blog.module.css";
   12	
   13	type Post = { id:string|null; title:string; slug:string; excerpt:string|null; coverImageUrl:string|null; content:string; published:boolean; publishedAt:Date|null };
   14	const slugify=(s:string)=>s.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"").slice(0,150);
   15	const safeEditorHtml=(html:string)=>{
   16	  const doc=new DOMParser().parseFromString(html,"text/html");
   17	  doc.querySelectorAll("script,style,iframe,object,embed,svg,math").forEach(n=>n.remove());
   18	  const allowed=new Set(["P","BR","STRONG","B","EM","I","U","BLOCKQUOTE","UL","OL","LI","H1","H2","H3","HR","SPAN","DIV"]);
   19	  doc.body.querySelectorAll("*").forEach((node)=>{
   20	    if(!allowed.has(node.tagName)){node.replaceWith(...Array.from(node.childNodes));return;}
   21	    Array.from(node.attributes).forEach((attr)=>{
   22	      if(node.tagName==="SPAN"&&attr.name==="style"&&/^color:\s*(#[0-9a-f]{3,8}|rgb\([\d\s,%]+\)|[a-z]{3,20})\s*;?$/i.test(attr.value))return;
   23	      node.removeAttribute(attr.name);
   24	    });
   25	  });
   26	  return doc.body.innerHTML;
   27	};
   28	export default function BlogPage(){
   29	  const {list,save,remove}=useBlog();
   30	  const [draft,setDraft]=useState<Post|null>(null);
   31	  const [uploading,setUploading]=useState(false);
   32	  const fileRef=useRef<HTMLInputElement>(null);
   33	  const editorRef=useRef<HTMLDivElement>(null);
   34	  const posts=list.data?.posts??[];
   35	  const canEdit=list.data?.canEdit??false;
   36	  useEffect(()=>{if(!draft||!editorRef.current)return;const raw=draft.content||"";const initial=raw.includes("<")?raw.replace(/\n/g,"<br>"):"<p>"+raw.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\n/g,"<br>")+"</p>";editorRef.current.innerHTML=safeEditorHtml(initial);},[Boolean(draft),draft?.id]);
   37	  const create=()=>setDraft({id:null,title:"",slug:"",excerpt:null,coverImageUrl:null,content:"",published:true,publishedAt:null});
   38	  const upload=async(file:File|undefined)=>{if(!file||!draft)return;setUploading(true);try{const url=await uploadImage(file,"gallery");setDraft({...draft,coverImageUrl:url});}catch(e){toast.error(e instanceof Error?e.message:"Upload failed");}finally{setUploading(false);if(fileRef.current)fileRef.current.value="";}};
   39	  const format=(command:string,value?:string)=>{editorRef.current?.focus();document.execCommand(command,false,value);};
   40	  const saveIt=async()=>{
   41	    if(!draft)return;
   42	    const title=draft.title.trim(),slug=slugify(draft.slug||title),content=editorRef.current?.innerHTML??draft.content;
   43	    const textContent=editorRef.current?.innerText?.trim()??content.replace(/<[^>]*>/g,"").trim();
   44	    if(!title||!slug||!textContent)return toast.error("Add a title and post content.");
   45	    try{await save.mutateAsync({...draft,title,slug,content,excerpt:draft.excerpt?.trim()||null});toast.success("Blog post saved.");setDraft(null);}
   46	    catch(e){toast.error(e instanceof Error?e.message:"Could not save post.");}
   47	  };
   48	  return <div className={styles.page}>
   49	    <Helmet><title>Blog — Oniduka</title></Helmet>
   50	    <div className={styles.head}><div><h1>Blog</h1><p>Create useful posts, announcements and business updates for your customers.</p></div>{!draft&&<Button disabled={!canEdit} onClick={create}><Plus size={16}/> New post</Button>}</div>
   51	    {!canEdit&&<p className={styles.notice}>Blog management is available on Premium plans.</p>}
   52	    {draft?<section className={styles.editor}>
   53	      <Input value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value,slug:draft.id?draft.slug:slugify(e.target.value)})} placeholder="Post title"/>
   54	      <Input value={draft.slug} onChange={e=>setDraft({...draft,slug:slugify(e.target.value)})} placeholder="URL slug"/>
   55	      <Textarea value={draft.excerpt??""} onChange={e=>setDraft({...draft,excerpt:e.target.value||null})} placeholder="Short excerpt (optional)" rows={3}/>
   56	      <div className={styles.richEditor}>
   57	        <div className={styles.toolbar} role="toolbar" aria-label="Article formatting">
   58	          <button type="button" title="Bold" aria-label="Bold" onMouseDown={e=>e.preventDefault()} onClick={()=>format("bold")}><Bold size={16}/></button>
   59	          <button type="button" title="Italic" aria-label="Italic" onMouseDown={e=>e.preventDefault()} onClick={()=>format("italic")}><Italic size={16}/></button>
   60	          <button type="button" title="Underline" aria-label="Underline" onMouseDown={e=>e.preventDefault()} onClick={()=>format("underline")}><Underline size={16}/></button>
   61	          <button type="button" title="Heading" aria-label="Heading" onMouseDown={e=>e.preventDefault()} onClick={()=>format("formatBlock","h2")}><Heading2 size={16}/></button>
   62	          <button type="button" title="Quote" aria-label="Quote" onMouseDown={e=>e.preventDefault()} onClick={()=>format("formatBlock","blockquote")}><Quote size={16}/></button>
   63	          <button type="button" title="Bulleted list" aria-label="Bulleted list" onMouseDown={e=>e.preventDefault()} onClick={()=>format("insertUnorderedList")}><List size={16}/></button>
   64	          <button type="button" title="Numbered list" aria-label="Numbered list" onMouseDown={e=>e.preventDefault()} onClick={()=>format("insertOrderedList")}><ListOrdered size={16}/></button>
   65	          <button type="button" title="Horizontal divider" aria-label="Horizontal divider" onMouseDown={e=>e.preventDefault()} onClick={()=>format("insertHorizontalRule")}><Minus size={16}/></button>
   66	          <label className={styles.colorTool} title="Text colour">A <input type="color" aria-label="Text colour" defaultValue="#0e5c3f" onChange={e=>format("foreColor",e.target.value)}/></label>
   67	        </div>
   68	        <div ref={editorRef} className={styles.contentEditor} contentEditable suppressContentEditableWarning role="textbox" aria-label="Blog article body" aria-multiline="true" data-placeholder="Write your full article here. Use the toolbar to format headings, quotes, lists and text."/>
   69	      </div>
   70	      <div className={styles.cover}>{draft.coverImageUrl&&<img src={draft.coverImageUrl} alt=""/>}<input ref={fileRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>void upload(e.target.files?.[0])}/><Button variant="outline" disabled={uploading} onClick={()=>fileRef.current?.click()}><Upload size={15}/>{uploading?"Uploading...":"Cover image"}</Button></div>
   71	      <label className={styles.publish}><input type="checkbox" checked={draft.published} onChange={e=>setDraft({...draft,published:e.target.checked})}/> Publish this post</label>
   72	      <div className={styles.actions}><Button disabled={save.isPending} onClick={()=>void saveIt()}>{save.isPending?<Spinner size="sm"/>:null}Save post</Button><Button variant="ghost" onClick={()=>setDraft(null)}>Cancel</Button></div>
   73	    </section>:<div className={styles.list}>{posts.map(post=><article className={styles.post} key={post.id}><div><h2>{post.title}</h2><p>{post.published?"Published":"Draft"} · /blog/{post.slug}</p>{post.excerpt&&<span>{post.excerpt}</span>}</div><div className={styles.rowActions}><Button size="sm" variant="outline" onClick={()=>setDraft(post)}>Edit</Button><Button size="sm" variant="ghost" onClick={()=>{if(confirm("Delete this post?"))void remove.mutateAsync({id:post.id});}}><Trash2 size={15}/></Button></div></article>)}</div>}
   74	  </div>;
   75	}
   76	

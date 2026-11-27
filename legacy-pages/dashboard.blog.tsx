import { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ExternalLink, ImagePlus, MessageSquare, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { ListToolbar } from "../components/ListToolbar";
import { RichTextEditor, type RichTextEditorHandle } from "../components/RichTextEditor";
import { Skeleton } from "../components/Skeleton";
import { Spinner } from "../components/Spinner";
import { Switch } from "../components/Switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/Tabs";
import { Textarea } from "../components/Textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/Dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/Select";
import { useBlog } from "../helpers/useBlog";
import { useBlogSettings } from "../helpers/useBlogSettings";
import { useMyBusiness } from "../helpers/useMyBusiness";
import { uploadImage } from "../helpers/uploadImage";
import { friendlyError } from "../helpers/friendlyError";
import { summariseBlogContent } from "../helpers/summariseBlogContent";
import { parseBlogSettings, type BlogSettings } from "../helpers/parseBlogSettings";
import type { BlogAdminPost } from "../endpoints/blog/list_GET.schema";
import styles from "./dashboard.blog.module.css";

type Draft = {
  id: string | null;
  title: string;
  slug: string;
  slugTouched: boolean;
  excerpt: string;
  coverImageUrl: string;
  content: string;
  published: boolean;
  comments: "default" | "on" | "off";
  reactions: "default" | "on" | "off";
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

const toTri = (value: boolean | null | undefined): "default" | "on" | "off" =>
  value === true ? "on" : value === false ? "off" : "default";
const fromTri = (value: "default" | "on" | "off"): boolean | null =>
  value === "on" ? true : value === "off" ? false : null;

const emptyDraft: Draft = {
  id: null,
  title: "",
  slug: "",
  slugTouched: false,
  excerpt: "",
  coverImageUrl: "",
  content: "",
  published: false,
  comments: "default",
  reactions: "default",
};

const BlogPage = () => {
  const { list, save, remove } = useBlog();
  const { data: businessData } = useMyBusiness();
  const saveSettings = useBlogSettings();
  const business = businessData?.business ?? null;

  const [draft, setDraft] = useState<Draft | null>(null);
  const [editorKey, setEditorKey] = useState("new");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [coverUploading, setCoverUploading] = useState(false);
  const [deleting, setDeleting] = useState<BlogAdminPost | null>(null);
  const [settings, setSettings] = useState<BlogSettings | null>(null);
  const editorRef = useRef<RichTextEditorHandle>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (business && !settings) setSettings(parseBlogSettings(business.blogSettings));
  }, [business, settings]);

  const posts = list.data?.posts ?? [];
  const canEdit = list.data?.canEdit ?? false;

  const shown = useMemo(() => {
    const term = search.trim().toLowerCase();
    return posts.filter((post) => {
      const matchesStatus =
        status === "all" || (status === "published" ? post.published : !post.published);
      const matchesTerm =
        term === "" ||
        post.title.toLowerCase().includes(term) ||
        (post.excerpt ?? "").toLowerCase().includes(term);
      return matchesStatus && matchesTerm;
    });
  }, [posts, search, status]);

  const startNew = () => {
    setDraft({ ...emptyDraft });
    setEditorKey(`new-${Date.now()}`);
  };

  const startEdit = (post: BlogAdminPost) => {
    setDraft({
      id: post.id,
      title: post.title,
      slug: post.slug,
      slugTouched: true,
      excerpt: post.excerpt ?? "",
      coverImageUrl: post.coverImageUrl ?? "",
      content: post.content,
      published: post.published,
      comments: toTri(post.commentsEnabled),
      reactions: toTri(post.reactionsEnabled),
    });
    setEditorKey(post.id);
  };

  const handleCover = async (files: FileList | null) => {
    const file = files?.[0];
    if (coverRef.current) coverRef.current.value = "";
    if (!file || !draft) return;
    setCoverUploading(true);
    try {
      const url = await uploadImage(file, "gallery");
      setDraft((current) => (current ? { ...current, coverImageUrl: url } : current));
    } catch (error) {
      toast.error(friendlyError(error, "The cover image could not be uploaded."));
    } finally {
      setCoverUploading(false);
    }
  };

  const handleSave = async (publish: boolean | null) => {
    if (!draft) return;
    const html = editorRef.current?.getHtml() ?? "";
    const text = editorRef.current?.getText() ?? "";
    if (draft.title.trim().length < 2) {
      toast.error("Give the post a title first.");
      return;
    }
    if (text.length < 2 && !html.includes("<img") && !html.includes("<iframe")) {
      toast.error("Write something in the article first.");
      return;
    }
    const slug = draft.slug.trim() || slugify(draft.title);
    if (slug.length < 2) {
      toast.error("The page address needs at least 2 letters or numbers.");
      return;
    }
    try {
      await save.mutateAsync({
        id: draft.id,
        title: draft.title.trim(),
        slug,
        excerpt: draft.excerpt.trim() || null,
        coverImageUrl: draft.coverImageUrl || null,
        content: html,
        published: publish ?? draft.published,
        commentsEnabled: fromTri(draft.comments),
        reactionsEnabled: fromTri(draft.reactions),
      });
      toast.success(
        (publish ?? draft.published) ? "Post saved and live on your site." : "Draft saved.",
      );
      setDraft(null);
    } catch (error) {
      toast.error(friendlyError(error, "The post could not be saved."));
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await remove.mutateAsync({ id: deleting.id });
      toast.success("Post deleted.");
      setDeleting(null);
    } catch (error) {
      toast.error(friendlyError(error, "The post could not be deleted."));
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    try {
      await saveSettings.mutateAsync(settings);
      toast.success("Blog display settings saved.");
    } catch (error) {
      toast.error(friendlyError(error, "Could not save the blog settings."));
    }
  };

  if (list.isLoading) {
    return (
      <div className={styles.page}>
        <Skeleton className={styles.skeletonTitle} />
        <Skeleton className={styles.skeletonBlock} />
      </div>
    );
  }

  // ---------- Editor ----------
  if (draft) {
    return (
      <div className={styles.page}>
        <Helmet><title>{`${draft.id ? "Edit" : "New"} post — Oni247`}</title></Helmet>
        <div className={styles.head}>
          <div>
            <h1 className={styles.title}>{draft.id ? "Edit post" : "New post"}</h1>
            <p className={styles.subtitle}>
              Select words to format only those words. Click a heading or quote button again to turn
              it back into normal text.
            </p>
          </div>
          <Button variant="ghost" onClick={() => setDraft(null)}>Back to posts</Button>
        </div>

        <div className={styles.form}>
          <label className={styles.field}>
            <span className={styles.label}>Title</span>
            <Input
              value={draft.title}
              onChange={(event) => {
                const title = event.target.value;
                setDraft({ ...draft, title, slug: draft.slugTouched ? draft.slug : slugify(title) });
              }}
              placeholder="What is this post about?"
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Page address</span>
            <Input
              value={draft.slug}
              onChange={(event) => setDraft({ ...draft, slug: slugify(event.target.value), slugTouched: true })}
              placeholder="my-first-post"
            />
            <span className={styles.hint}>
              If another post already uses this address, a number is added automatically.
            </span>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Summary (optional)</span>
            <Textarea
              rows={2}
              value={draft.excerpt}
              onChange={(event) => setDraft({ ...draft, excerpt: event.target.value })}
              placeholder="One or two sentences shown on the blog list"
            />
            <span className={styles.hint}>
              Leave it empty and the first words of your article are used instead.
              {draft.excerpt.trim() === "" && (
                <> Preview: <em>{summariseBlogContent(null, editorRef.current?.getHtml() ?? draft.content, 90) || "…"}</em></>
              )}
            </span>
          </label>

          <div className={styles.field}>
            <span className={styles.label}>Cover image</span>
            <div className={styles.cover}>
              {draft.coverImageUrl && <img src={draft.coverImageUrl} alt="" />}
              <input
                ref={coverRef}
                type="file"
                hidden
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => void handleCover(event.target.files)}
              />
              <Button variant="outline" size="sm" disabled={coverUploading} onClick={() => coverRef.current?.click()}>
                {coverUploading ? <Spinner size="sm" /> : <ImagePlus size={15} />}
                {draft.coverImageUrl ? "Change cover" : "Add cover image"}
              </Button>
              {draft.coverImageUrl && (
                <Button variant="ghost" size="sm" onClick={() => setDraft({ ...draft, coverImageUrl: "" })}>
                  Remove
                </Button>
              )}
            </div>
          </div>

          <div className={styles.field}>
            <span className={styles.label}>Article</span>
            <RichTextEditor ref={editorRef} initialHtml={draft.content} resetKey={editorKey} />
          </div>

          <div className={styles.twoUp}>
            <div className={styles.field}>
              <span className={styles.label}>Comments on this post</span>
              <Select value={draft.comments} onValueChange={(value) => setDraft({ ...draft, comments: value as Draft["comments"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Follow my blog setting</SelectItem>
                  <SelectItem value="on">Allow comments</SelectItem>
                  <SelectItem value="off">Turn comments off</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className={styles.field}>
              <span className={styles.label}>Likes and reactions</span>
              <Select value={draft.reactions} onValueChange={(value) => setDraft({ ...draft, reactions: value as Draft["reactions"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Follow my blog setting</SelectItem>
                  <SelectItem value="on">Allow reactions</SelectItem>
                  <SelectItem value="off">Turn reactions off</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className={styles.actions}>
            <Button disabled={save.isPending} onClick={() => void handleSave(true)}>
              {save.isPending ? <Spinner size="sm" /> : null}
              {draft.published ? "Save and keep published" : "Publish"}
            </Button>
            <Button variant="outline" disabled={save.isPending} onClick={() => void handleSave(false)}>
              {draft.published ? "Unpublish and save as draft" : "Save draft"}
            </Button>
            <Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- List ----------
  return (
    <div className={styles.page}>
      <Helmet><title>Blog — Oni247</title></Helmet>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>Blog</h1>
          <p className={styles.subtitle}>Write articles with photos and YouTube videos, and let visitors react and comment.</p>
        </div>
        <div className={styles.headActions}>
          <Button asChild variant="outline">
            <Link to="/dashboard/comments"><MessageSquare size={15} /> Comments &amp; reactions</Link>
          </Button>
          <Button disabled={!canEdit} onClick={startNew}><Plus size={16} /> New post</Button>
        </div>
      </div>

      {!canEdit && (
        <p className={styles.notice}>
          Blog editing is a Premium feature. <Link to="/dashboard/plan">See plans</Link>
        </p>
      )}

      <Tabs defaultValue="posts">
      <TabsList>
        <TabsTrigger value="posts">Posts</TabsTrigger>
        <TabsTrigger value="display">Blog display</TabsTrigger>
        <TabsTrigger value="comments">Comments</TabsTrigger>
      </TabsList>
      <TabsContent value="posts">
      {posts.length === 0 ? (
        <div className={styles.empty}>
          <p>No posts yet. Your first article will appear here.</p>
          <Button disabled={!canEdit} onClick={startNew}><Plus size={16} /> Write your first post</Button>
        </div>
      ) : (
        <>
          <ListToolbar
            search={search}
            onSearch={setSearch}
            placeholder="Search posts"
            shown={shown.length}
            total={posts.length}
            filters={[
              {
                id: "status",
                label: "Status",
                value: status,
                onChange: setStatus,
                options: [
                  { value: "published", label: "Published", count: posts.filter((p) => p.published).length },
                  { value: "draft", label: "Drafts", count: posts.filter((p) => !p.published).length },
                ],
              },
            ]}
          />
          {shown.length === 0 ? (
            <p className={styles.subtitle}>No post matches that search.</p>
          ) : (
            <ul className={styles.list}>
              {shown.map((post) => (
                <li key={post.id} className={styles.post}>
                  {post.coverImageUrl && <img className={styles.thumb} src={post.coverImageUrl} alt="" loading="lazy" />}
                  <div className={styles.postBody}>
                    <h2 className={styles.postTitle}>
                      {post.title}{" "}
                      <Badge variant={post.published ? "success" : "secondary"}>{post.published ? "Published" : "Draft"}</Badge>
                    </h2>
                    <p className={styles.postSummary}>{summariseBlogContent(post.excerpt, post.content, 140)}</p>
                  </div>
                  <div className={styles.rowActions}>
                    {post.published && business && (
                      <Button asChild variant="ghost" size="icon-sm" aria-label="View post on your site">
                        <a href={`/${business.slug}/b/${post.slug}`} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} /></a>
                      </Button>
                    )}
                    <Button variant="outline" size="sm" disabled={!canEdit} onClick={() => startEdit(post)}>
                      <Pencil size={14} /> Edit
                    </Button>
                    <Button variant="ghost" size="icon-sm" aria-label={`Delete ${post.title}`} disabled={!canEdit} onClick={() => setDeleting(post)}>
                      <Trash2 size={15} />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      </TabsContent>

      <TabsContent value="display">
      {settings && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Blog display</h2>
          <p className={styles.subtitle}>These settings control how the blog list looks on your website.</p>
          <div className={styles.field}>
            <span className={styles.label}>Layout</span>
            <div className={styles.layoutChoices} role="radiogroup" aria-label="Blog layout">
              {([
                ["list", "List", "Photo beside the text, one article per row"],
                ["grid", "Grid", "Cards in columns"],
                ["magazine", "Magazine", "Newest article large, the rest in a grid"],
              ] as const).map(([value, label, hint]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={settings.layout === value}
                  className={`${styles.choice} ${settings.layout === value ? styles.choiceOn : ""}`}
                  onClick={() => setSettings({ ...settings, layout: value })}
                >
                  <strong>{label}</strong>
                  <small>{hint}</small>
                </button>
              ))}
            </div>
          </div>
          <div className={styles.toggles}>
            {([
              ["showCover", "Show cover images"],
              ["showExcerpt", "Show the summary"],
              ["showDate", "Show the date"],
              ["showReadTime", "Show reading time"],
              ["featureFirst", "Feature the newest article"],
            ] as const).map(([key, label]) => (
              <label key={key} className={styles.toggle}>
                <Switch checked={settings[key]} onCheckedChange={(checked) => setSettings({ ...settings, [key]: checked })} />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <label className={styles.field}>
            <span className={styles.label}>Articles shown before &quot;Show more&quot;</span>
            <Input
              className={styles.numberInput}
              inputMode="numeric"
              value={String(settings.postsPerPage)}
              onChange={(event) => {
                const value = Number.parseInt(event.target.value.replace(/\D/g, ""), 10);
                setSettings({ ...settings, postsPerPage: Number.isNaN(value) ? 3 : value });
              }}
            />
            <span className={styles.hint}>Between 3 and 30.</span>
          </label>
          <div>
            <Button disabled={saveSettings.isPending} onClick={() => void handleSaveSettings()}>
              {saveSettings.isPending ? <Spinner size="sm" /> : null}
              Save blog settings
            </Button>
          </div>
        </section>
      )}
      </TabsContent>

      <TabsContent value="comments">
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Comments and reactions</h2>
          <p className={styles.subtitle}>
            Turn comments and likes on or off for your whole blog, set whether comments need your approval first, and moderate what visitors wrote. You can still override this on each post when you edit it.
          </p>
          <div>
            <Button asChild variant="outline"><Link to="/dashboard/comments"><MessageSquare size={15} /> Open comments &amp; reactions</Link></Button>
          </div>
        </section>
      </TabsContent>
      </Tabs>

      <Dialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this post?</DialogTitle>
            <DialogDescription>
              &quot;{deleting?.title}&quot; and its comments and reactions will be removed for good.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Keep it</Button>
            <Button variant="destructive" disabled={remove.isPending} onClick={() => void handleDelete()}>
              {remove.isPending ? <Spinner size="sm" /> : null}
              Delete post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BlogPage;

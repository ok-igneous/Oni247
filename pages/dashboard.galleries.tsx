import { useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, ImagePlus, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { ListToolbar } from "../components/ListToolbar";
import { Skeleton } from "../components/Skeleton";
import { Spinner } from "../components/Spinner";
import { Switch } from "../components/Switch";
import { Textarea } from "../components/Textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/Dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/Select";
import { useGalleries } from "../helpers/useGalleries";
import { uploadImage } from "../helpers/uploadImage";
import { processImage, type CropRatio } from "../helpers/processImage";
import { friendlyError } from "../helpers/friendlyError";
import { toSlug } from "../helpers/toSlug";
import styles from "./dashboard.galleries.module.css";

type GalleryImage = {
  id: string | null;
  imageUrl: string;
  caption: string | null;
  altText: string | null;
  tag: string | null;
  sortOrder: number;
};
type Draft = {
  id: string | null;
  name: string;
  description: string | null;
  slug: string;
  coverImageUrl: string | null;
  published: boolean;
  sortOrder: number;
  images: GalleryImage[];
};

export default function GalleriesPage() {
  const { list, save, remove } = useGalleries();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [slugEdited, setSlugEdited] = useState(false);
  const [crop, setCrop] = useState<CropRatio>("original");
  const [adding, setAdding] = useState<{ done: number; total: number } | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const canEdit = list.data?.canEdit ?? false;
  const galleries = list.data?.galleries ?? [];

  const shown = useMemo(() => {
    const term = search.trim().toLowerCase();
    return galleries.filter(
      (gallery) =>
        (status === "all" || (status === "published" ? gallery.published : !gallery.published)) &&
        (term === "" ||
          gallery.name.toLowerCase().includes(term) ||
          (gallery.description ?? "").toLowerCase().includes(term)),
    );
  }, [galleries, search, status]);

  const startNew = () => {
    setSlugEdited(false);
    setDraft({
      id: null,
      name: "",
      description: null,
      slug: "",
      coverImageUrl: null,
      published: true,
      sortOrder: galleries.length,
      images: [],
    });
  };

  const addImages = async (files: FileList | null) => {
    if (fileRef.current) fileRef.current.value = "";
    if (!draft || !files || files.length === 0) return;
    const picked = Array.from(files);
    setAdding({ done: 0, total: picked.length });
    const added: GalleryImage[] = [];
    let failed = 0;
    for (const file of picked) {
      try {
        const processed = await processImage(file, crop);
        const url = await uploadImage(processed, "gallery");
        added.push({ id: null, imageUrl: url, caption: null, altText: null, tag: null, sortOrder: 0 });
      } catch {
        failed += 1; // the upload dialog already told the owner why
      }
      setAdding((current) => (current ? { ...current, done: current.done + 1 } : current));
    }
    setAdding(null);
    setDraft((current) => {
      if (!current) return current;
      const images = [...current.images, ...added];
      return { ...current, images, coverImageUrl: current.coverImageUrl ?? images[0]?.imageUrl ?? null };
    });
    if (added.length > 0) toast.success(added.length === 1 ? "Photo added." : `${added.length} photos added.`);
    if (failed > 0) toast.error(`${failed} ${failed === 1 ? "photo" : "photos"} could not be added.`);
  };

  const updateImage = (index: number, patch: Partial<GalleryImage>) => {
    if (!draft) return;
    const images = [...draft.images];
    images[index] = { ...images[index], ...patch };
    setDraft({ ...draft, images });
  };

  const move = (index: number, direction: -1 | 1) => {
    if (!draft) return;
    const target = index + direction;
    if (target < 0 || target >= draft.images.length) return;
    const images = [...draft.images];
    [images[index], images[target]] = [images[target], images[index]];
    setDraft({ ...draft, images });
  };

  const handleSave = async () => {
    if (!draft) return;
    const name = draft.name.trim();
    const slug = toSlug(draft.slug || name);
    if (!name) return void toast.error("Give the gallery a name first.");
    if (!slug) return void toast.error("The page address needs letters or numbers.");
    try {
      await save.mutateAsync({
        ...draft,
        name,
        slug,
        images: draft.images.map((image, index) => ({ ...image, sortOrder: index })),
      });
      toast.success("Gallery saved.");
      setDraft(null);
    } catch (error) {
      toast.error(friendlyError(error, "The gallery could not be saved."));
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await remove.mutateAsync({ id: deleting.id });
      toast.success("Gallery deleted.");
      setDeleting(null);
    } catch (error) {
      toast.error(friendlyError(error, "The gallery could not be deleted."));
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
        <Helmet><title>{`${draft.id ? "Edit" : "New"} gallery — Oni247`}</title></Helmet>
        <div className={styles.head}>
          <div>
            <h1 className={styles.title}>{draft.id ? "Edit gallery" : "New gallery"}</h1>
            <p className={styles.subtitle}>Add photos, put them in order and choose the cover.</p>
          </div>
          <Button variant="ghost" onClick={() => setDraft(null)}>Back to galleries</Button>
        </div>

        <section className={styles.card}>
          <div className={styles.twoUp}>
            <label className={styles.field}>
              <span className={styles.label}>Gallery name</span>
              <Input
                value={draft.name}
                onChange={(e) =>
                  setDraft({ ...draft, name: e.target.value, ...(slugEdited || draft.id ? {} : { slug: toSlug(e.target.value) }) })
                }
                placeholder="Our recent work"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Page address</span>
              <Input
                value={draft.slug}
                onChange={(e) => {
                  setSlugEdited(true);
                  setDraft({ ...draft, slug: toSlug(e.target.value) });
                }}
                placeholder="our-recent-work"
              />
            </label>
          </div>
          <label className={styles.field}>
            <span className={styles.label}>Description</span>
            <Textarea
              rows={3}
              value={draft.description ?? ""}
              onChange={(e) => setDraft({ ...draft, description: e.target.value || null })}
              placeholder="What will visitors see in this gallery?"
            />
          </label>
          <label className={styles.switchRow}>
            <Switch checked={draft.published} onCheckedChange={(checked) => setDraft({ ...draft, published: checked })} />
            <span>Show this gallery on my website</span>
          </label>
        </section>

        <section className={styles.card}>
          <div className={styles.photosHead}>
            <h2 className={styles.cardTitle}>Photos ({draft.images.length})</h2>
            <div className={styles.tools}>
              <Select value={crop} onValueChange={(value) => setCrop(value as CropRatio)}>
                <SelectTrigger className={styles.cropSelect} aria-label="How new photos are sized"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="original">Keep original shape</SelectItem>
                  <SelectItem value="1:1">Crop to square</SelectItem>
                  <SelectItem value="4:3">Crop to 4:3</SelectItem>
                  <SelectItem value="16:9">Crop to 16:9</SelectItem>
                </SelectContent>
              </Select>
              <input ref={fileRef} hidden type="file" multiple accept="image/png,image/jpeg,image/webp" onChange={(e) => void addImages(e.target.files)} />
              <Button variant="outline" disabled={adding !== null} onClick={() => fileRef.current?.click()}>
                {adding ? <Spinner size="sm" /> : <ImagePlus size={15} />}
                {adding ? `Adding ${adding.done + 1} of ${adding.total}…` : "Add photos"}
              </Button>
            </div>
          </div>
          <p className={styles.hint}>
            Photos are optimized to a maximum of 1600 pixels before upload. Cropping, if chosen, trims from the centre.
          </p>

          {draft.images.length === 0 ? (
            <p className={styles.hint}>No photos yet. Choose from your library, take a photo, or pick from your device.</p>
          ) : (
            <ul className={styles.images}>
              {draft.images.map((image, index) => (
                <li className={styles.imageCard} key={image.id ?? `${image.imageUrl}-${index}`}>
                  <img src={image.imageUrl} alt={image.altText ?? ""} loading="lazy" />
                  <div className={styles.imageActions}>
                    <Button
                      size="sm"
                      variant={draft.coverImageUrl === image.imageUrl ? "primary" : "outline"}
                      onClick={() => setDraft({ ...draft, coverImageUrl: image.imageUrl })}
                    >
                      <Star size={14} /> {draft.coverImageUrl === image.imageUrl ? "Cover" : "Make cover"}
                    </Button>
                    <div className={styles.moveGroup}>
                      <Button size="icon-sm" variant="ghost" aria-label="Move earlier" disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={14} /></Button>
                      <Button size="icon-sm" variant="ghost" aria-label="Move later" disabled={index === draft.images.length - 1} onClick={() => move(index, 1)}><ArrowDown size={14} /></Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Remove photo"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            images: draft.images.filter((_, n) => n !== index),
                            coverImageUrl: draft.coverImageUrl === image.imageUrl ? null : draft.coverImageUrl,
                          })
                        }
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                  <Input value={image.caption ?? ""} onChange={(e) => updateImage(index, { caption: e.target.value || null })} placeholder="Caption" aria-label="Caption" />
                  <Input value={image.altText ?? ""} onChange={(e) => updateImage(index, { altText: e.target.value || null })} placeholder="Describe the photo (for screen readers)" aria-label="Photo description" />
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className={styles.actions}>
          <Button disabled={save.isPending || adding !== null} onClick={() => void handleSave()}>
            {save.isPending ? <Spinner size="sm" /> : null}
            Save gallery
          </Button>
          <Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
        </div>
      </div>
    );
  }

  // ---------- List ----------
  return (
    <div className={styles.page}>
      <Helmet><title>Galleries — Oni247</title></Helmet>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>Galleries</h1>
          <p className={styles.subtitle}>Show your work, products, events or projects with photo albums.</p>
        </div>
        <Button disabled={!canEdit} onClick={startNew}><Plus size={16} /> New gallery</Button>
      </div>

      {!canEdit && <p className={styles.notice}>Galleries use the same Premium access as Presence.</p>}

      {galleries.length === 0 ? (
        <div className={styles.empty}>
          <ImagePlus size={26} />
          <p>No galleries yet. Create one to show off your best photos.</p>
        </div>
      ) : (
        <>
          <ListToolbar
            search={search}
            onSearch={setSearch}
            placeholder="Search galleries"
            shown={shown.length}
            total={galleries.length}
            filters={[
              {
                id: "status",
                label: "Status",
                value: status,
                onChange: setStatus,
                options: [
                  { value: "published", label: "Published", count: galleries.filter((g) => g.published).length },
                  { value: "hidden", label: "Hidden", count: galleries.filter((g) => !g.published).length },
                ],
              },
            ]}
          />
          {shown.length === 0 ? (
            <p className={styles.subtitle}>No gallery matches that search.</p>
          ) : (
            <ul className={styles.list}>
              {shown.map((gallery) => (
                <li className={styles.gallery} key={gallery.id}>
                  {gallery.coverImageUrl ? (
                    <img className={styles.thumb} src={gallery.coverImageUrl} alt="" loading="lazy" />
                  ) : (
                    <span className={styles.thumbEmpty}><ImagePlus size={18} /></span>
                  )}
                  <div className={styles.galleryBody}>
                    <h2 className={styles.galleryTitle}>
                      {gallery.name}{" "}
                      <Badge variant={gallery.published ? "success" : "secondary"}>{gallery.published ? "Published" : "Hidden"}</Badge>
                    </h2>
                    <p className={styles.hint}>{gallery.images.length} {gallery.images.length === 1 ? "photo" : "photos"}</p>
                  </div>
                  <div className={styles.rowActions}>
                    <Button size="sm" variant="outline" disabled={!canEdit} onClick={() => { setSlugEdited(true); setDraft(gallery); }}>
                      <Pencil size={14} /> Edit
                    </Button>
                    <Button size="icon-sm" variant="ghost" aria-label={`Delete ${gallery.name}`} disabled={!canEdit} onClick={() => setDeleting({ id: gallery.id, name: gallery.name })}>
                      <Trash2 size={15} />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <Dialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this gallery?</DialogTitle>
            <DialogDescription>&quot;{deleting?.name}&quot; and its photo list will be removed. Your uploaded images stay in your library.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Keep it</Button>
            <Button variant="destructive" disabled={remove.isPending} onClick={() => void handleDelete()}>
              {remove.isPending ? <Spinner size="sm" /> : null}
              Delete gallery
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

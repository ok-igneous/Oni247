import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import Link from "next/link";
import { toast } from "sonner";
import { Copy, ImagePlus, Maximize2, Trash2 } from "lucide-react";
import { Button } from "../components/Button";
import { Skeleton } from "../components/Skeleton";
import { ListToolbar } from "../components/ListToolbar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/Dialog";
import { useSubscriptionStatus } from "../helpers/useSubscriptionStatus";
import { uploadImage } from "../helpers/uploadImage";
import { friendlyError } from "../helpers/friendlyError";
import { getMediaAssets, type MediaAsset } from "../endpoints/media/list_GET.schema";
import { postDeleteMedia } from "../endpoints/media/delete_POST.schema";
import styles from "./dashboard.media.module.css";

const KIND_LABELS: Record<string, string> = {
  product: "Products",
  gallery: "Gallery",
  logo: "Logo",
  background: "Backgrounds",
};

export default function MediaPage() {
  const { data: plan } = useSubscriptionStatus();
  const allowed = plan?.isPremiumPlus === true;
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("all");
  const [preview, setPreview] = useState<MediaAsset | null>(null);
  const imageRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const result = await getMediaAssets();
      setAssets(result.assets.filter((asset) => asset.contentType.startsWith("image/")));
    } catch (error) {
      toast.error(friendlyError(error, "Could not load your media library."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (allowed) void load();
    else setLoading(false);
  }, [allowed, load]);

  const add = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    let added = 0;
    for (const file of Array.from(files)) {
      try {
        await uploadImage(file, "gallery");
        added += 1;
      } catch {
        /* the progress dialog already explains what went wrong */
      }
    }
    if (imageRef.current) imageRef.current.value = "";
    if (added > 0) {
      toast.success(added === 1 ? "Image added to your library." : `${added} images added to your library.`);
      await load();
    }
  };

  const remove = async (asset: MediaAsset) => {
    if (!window.confirm("Delete this image from your library?")) return;
    try {
      await postDeleteMedia({ id: asset.id });
    } catch (error) {
      if (error instanceof Error && error.message === "IN_USE") {
        if (!window.confirm("This image is still used on your website. Deleting it here removes it from your library, so you can't pick it again. Delete anyway?")) return;
        try {
          await postDeleteMedia({ id: asset.id, force: true });
        } catch (forced) {
          toast.error(friendlyError(forced, "Could not delete the image."));
          return;
        }
      } else {
        toast.error(friendlyError(error, "Could not delete the image."));
        return;
      }
    }
    toast.success("Image deleted.");
    setPreview(null);
    await load();
  };

  const kinds = useMemo(
    () => Array.from(new Set(assets.map((asset) => asset.kind))).filter((item) => item !== "video"),
    [assets],
  );

  const shown = useMemo(() => {
    const term = search.trim().toLowerCase();
    return assets.filter((asset) => {
      const matchesKind = kind === "all" || asset.kind === kind;
      const label = (KIND_LABELS[asset.kind] ?? asset.kind).toLowerCase();
      const date = new Date(asset.createdAt).toLocaleDateString().toLowerCase();
      return matchesKind && (term === "" || label.includes(term) || date.includes(term));
    });
  }, [assets, kind, search]);

  if (!allowed && !loading) {
    return (
      <div className={styles.page}>
        <Helmet><title>Media Library — Oni247</title></Helmet>
        <h1 className={styles.title}>Media Library</h1>
        <p className={styles.subtitle}>
          Keep your uploaded images together and reuse them across your website. Available on Premium Plus.
        </p>
        <Button asChild>
          <Link href="/dashboard/plan">Upgrade to Premium Plus</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Helmet><title>Media Library — Oni247</title></Helmet>

      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Media Library</h1>
          <p className={styles.subtitle}>
            Images you have uploaded. Pick any of them again from the image picker, with no need to upload twice.
          </p>
        </div>
        <div className={styles.actions}>
          <input
            ref={imageRef}
            data-no-source-picker
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={(event) => void add(event.target.files)}
          />
          <Button onClick={() => imageRef.current?.click()}>
            <ImagePlus size={16} /> Add images
          </Button>
        </div>
      </header>

      {loading ? (
        <div className={styles.grid}>
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className={styles.skeletonTile} />
          ))}
        </div>
      ) : assets.length === 0 ? (
        <div className={styles.empty}>
          <ImagePlus size={28} />
          <p>
            Your library is empty. Add an image and it will be kept here so you can reuse it in products,
            galleries, events and blog posts.
          </p>
        </div>
      ) : (
        <>
          <ListToolbar
            search={search}
            onSearch={setSearch}
            placeholder="Search by type or date"
            shown={shown.length}
            total={assets.length}
            filters={
              kinds.length > 1
                ? [
                    {
                      id: "kind",
                      label: "Type",
                      value: kind,
                      onChange: setKind,
                      options: kinds.map((item) => ({
                        value: item,
                        label: KIND_LABELS[item] ?? item,
                        count: assets.filter((asset) => asset.kind === item).length,
                      })),
                    },
                  ]
                : []
            }
          />

          {shown.length === 0 ? (
            <p className={styles.subtitle}>No images match that search.</p>
          ) : (
            <ul className={styles.grid}>
              {shown.map((asset) => (
                <li key={asset.id} className={styles.card}>
                  <button
                    type="button"
                    className={styles.preview}
                    aria-label="See this image larger"
                    onClick={() => setPreview(asset)}
                  >
                    <img src={asset.fileUrl} alt="" loading="lazy" decoding="async" />
                    <span className={styles.expand} aria-hidden="true">
                      <Maximize2 size={14} />
                    </span>
                  </button>
                  <div className={styles.meta}>
                    <strong>{KIND_LABELS[asset.kind] ?? asset.kind}</strong>
                    <small>
                      {(Number(asset.sizeBytes) / 1024).toFixed(0)} KB · {new Date(asset.createdAt).toLocaleDateString()}
                    </small>
                    <Button variant="outline" size="sm" onClick={() => void remove(asset)} aria-label="Delete this image">
                      <Trash2 size={14} /> Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <Dialog open={preview !== null} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className={styles.dialog}>
          {preview && (
            <>
              <DialogHeader>
                <DialogTitle>{KIND_LABELS[preview.kind] ?? preview.kind} image</DialogTitle>
                <DialogDescription>
                  {(Number(preview.sizeBytes) / 1024).toFixed(0)} KB · added {new Date(preview.createdAt).toLocaleDateString()}
                </DialogDescription>
              </DialogHeader>
              <div className={styles.frame}>
                <img src={preview.fileUrl} alt="" className={styles.large} />
              </div>
              <div className={styles.actions}>
                <Button
                  variant="outline"
                  onClick={() => {
                    void navigator.clipboard
                      .writeText(preview.fileUrl)
                      .then(() => toast.success("Image link copied."))
                      .catch(() => toast.error("Could not copy the link."));
                  }}
                >
                  <Copy size={15} /> Copy image link
                </Button>
                <Button variant="destructive" onClick={() => void remove(preview)}>
                  <Trash2 size={15} /> Delete image
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


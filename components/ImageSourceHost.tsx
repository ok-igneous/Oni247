import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Camera, Check, Images, Maximize2, Monitor, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./Button";
import { Input } from "./Input";
import { Spinner } from "./Spinner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./Dialog";
import { getMediaLibrary, type LibraryImage } from "../endpoints/media/library_GET.schema";
import { postDeleteMedia } from "../endpoints/media/delete_POST.schema";
import { uploadStore } from "../helpers/uploadStore";
import { friendlyError } from "../helpers/friendlyError";
import styles from "./ImageSourceHost.module.css";

type Mode = "choose" | "library";

const KIND_LABELS: Record<string, string> = {
  product: "Products",
  gallery: "Gallery",
  logo: "Logo",
  background: "Backgrounds",
};

/** Hand chosen files to the page's own <input type="file"> as if the user had picked them there. */
const deliver = (input: HTMLInputElement, files: File[]) => {
  if (files.length === 0) return;
  const transfer = new DataTransfer();
  (input.multiple ? files : files.slice(0, 1)).forEach((file) => transfer.items.add(file));
  input.files = transfer.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
};

/**
 * Whenever a dashboard page opens an image file picker, ask where the image
 * should come from: the media library, the camera, or this device. It works by
 * intercepting the click on image file inputs, so every existing upload button
 * gets the choice without being rewritten. Mark an input data-no-source-picker
 * to skip it.
 */
export const ImageSourceHost = () => {
  const [input, setInput] = useState<HTMLInputElement | null>(null);
  const [mode, setMode] = useState<Mode>("choose");

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || target.type !== "file") return;
      if (target.dataset.sourceBypass === "1") {
        delete target.dataset.sourceBypass;
        return;
      }
      if (target.hasAttribute("data-no-source-picker")) return;
      if (!/image/i.test(target.accept)) return;
      // The picker only makes sense inside the owner dashboard.
      if (!window.location.pathname.startsWith("/dashboard")) return;
      event.preventDefault();
      event.stopPropagation();
      setMode("choose");
      setInput(target);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  const close = () => setInput(null);

  const fromDevice = () => {
    if (!input) return;
    const target = input;
    close();
    target.dataset.sourceBypass = "1";
    target.click();
  };

  const fromCamera = () => {
    if (!input) return;
    const target = input;
    close();
    const camera = document.createElement("input");
    camera.type = "file";
    camera.accept = "image/*";
    camera.setAttribute("capture", "environment");
    camera.dataset.sourceBypass = "1";
    camera.onchange = () => {
      const picked = Array.from(camera.files ?? []);
      deliver(target, picked);
    };
    camera.click();
  };

  return (
    <Dialog open={input !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent className={styles.content}>
        {mode === "choose" ? (
          <>
            <DialogHeader>
              <DialogTitle>Add an image</DialogTitle>
              <DialogDescription>Where is the image coming from?</DialogDescription>
            </DialogHeader>
            <div className={styles.sources}>
              <button type="button" className={styles.source} onClick={() => setMode("library")}>
                <Images size={22} />
                <span>
                  <strong>Media library</strong>
                  <small>Reuse an image you already uploaded</small>
                </span>
              </button>
              <button type="button" className={styles.source} onClick={fromCamera}>
                <Camera size={22} />
                <span>
                  <strong>Camera</strong>
                  <small>Take a new photo</small>
                </span>
              </button>
              <button type="button" className={styles.source} onClick={fromDevice}>
                <Monitor size={22} />
                <span>
                  <strong>This device</strong>
                  <small>Choose from your phone or computer. Images only.</small>
                </span>
              </button>
            </div>
          </>
        ) : (
          input && (
            <Library
              multiple={input.multiple}
              onBack={() => setMode("choose")}
              onPicked={(files) => {
                deliver(input, files);
                close();
              }}
            />
          )
        )}
      </DialogContent>
    </Dialog>
  );
};

const Library = ({
  multiple,
  onBack,
  onPicked,
}: {
  multiple: boolean;
  onBack: () => void;
  onPicked: (files: File[]) => void;
}) => {
  const { data, isFetching, error } = useQuery({
    queryKey: ["media-library"],
    queryFn: () => getMediaLibrary(),
    staleTime: 15_000,
  });
  const [selected, setSelected] = useState<string[]>([]);
  const [preview, setPreview] = useState<LibraryImage | null>(null);
  const [kind, setKind] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();
  const [pendingDelete, setPendingDelete] = useState<{ image: LibraryImage; inUse: boolean } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const askDelete = (image: LibraryImage) => setPendingDelete({ image, inUse: false });

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await postDeleteMedia({ id: pendingDelete.image.id, force: pendingDelete.inUse });
      toast.success("Removed from your library.");
      setSelected((current) => current.filter((id) => id !== pendingDelete.image.id));
      setPreview(null);
      setPendingDelete(null);
      await queryClient.invalidateQueries({ queryKey: ["media-library"] });
    } catch (err) {
      if (err instanceof Error && err.message === "IN_USE") {
        setPendingDelete({ image: pendingDelete.image, inUse: true });
      } else {
        toast.error(friendlyError(err, "Could not delete that picture."));
      }
    } finally {
      setDeleting(false);
    }
  };

  const images = data?.images ?? [];
  const kinds = useMemo(() => Array.from(new Set(images.map((image) => image.kind))), [images]);

  const shown = useMemo(() => {
    const term = search.trim().toLowerCase();
    return images.filter(
      (image) =>
        (kind === "all" || image.kind === kind) &&
        (term === "" ||
          image.kind.toLowerCase().includes(term) ||
          new Date(image.createdAt).toLocaleDateString().toLowerCase().includes(term)),
    );
  }, [images, kind, search]);

  useEffect(() => {
    if (error) toast.error(friendlyError(error, "Could not load your library."));
  }, [error]);

  const toggle = (id: string) =>
    setSelected((current) =>
      multiple
        ? current.includes(id)
          ? current.filter((item) => item !== id)
          : [...current, id]
        : current[0] === id
          ? []
          : [id],
    );

  const use = async (picks: LibraryImage[]) => {
    if (picks.length === 0) return;
    setBusy(true);
    try {
      const files: File[] = [];
      for (const image of picks) {
        const response = await fetch(image.fileUrl);
        if (!response.ok) throw new Error("Could not open one of the images.");
        const blob = await response.blob();
        const extension = (blob.type.split("/")[1] ?? "jpg").replace("jpeg", "jpg");
        const name = `__lib__${image.id}.${extension}`;
        uploadStore.registerLibraryFile(name, image.fileUrl);
        files.push(new File([blob], name, { type: blob.type || image.contentType }));
      }
      onPicked(files);
    } catch (err) {
      toast.error(friendlyError(err, "Could not add that image. Please try again."));
      setBusy(false);
    }
  };

  if (pendingDelete) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Delete this picture?</DialogTitle>
          <DialogDescription>
            {pendingDelete.inUse
              ? "This picture is still used on your website. If you delete it, it will stop showing there until you choose another."
              : "It will be removed from your library. Pictures already placed on your pages are not affected."}
          </DialogDescription>
        </DialogHeader>
        <div className={styles.previewFrame}>
          <img src={pendingDelete.image.fileUrl} alt="" className={styles.previewImage} />
        </div>
        <div className={styles.footer}>
          <Button variant="ghost" onClick={() => setPendingDelete(null)}>Keep it</Button>
          <Button variant="destructive" disabled={deleting} onClick={() => void confirmDelete()}>
            {deleting ? <Spinner size="sm" /> : <Trash2 size={16} />} {pendingDelete.inUse ? "Delete anyway" : "Delete"}
          </Button>
        </div>
      </>
    );
  }

  if (preview) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Preview</DialogTitle>
          <DialogDescription>
            {KIND_LABELS[preview.kind] ?? preview.kind} · {(preview.sizeBytes / 1024).toFixed(0)} KB ·{" "}
            {new Date(preview.createdAt).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>
        <div className={styles.previewFrame}>
          <img src={preview.fileUrl} alt="" className={styles.previewImage} />
        </div>
        <div className={styles.footer}>
          <Button variant="ghost" onClick={() => setPreview(null)}>
            <ArrowLeft size={16} /> Back to library
          </Button>
          <Button disabled={busy} onClick={() => void use([preview])}>
            {busy ? <Spinner size="sm" /> : <Check size={16} />} Use this image
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Media library</DialogTitle>
        <DialogDescription>
          {multiple ? "Tick one or more images." : "Tap an image to choose it."} Use the expand
          button to see it larger.
        </DialogDescription>
      </DialogHeader>

      <div className={styles.filters}>
        <div className={styles.searchWrap}>
          <Search size={15} className={styles.searchIcon} aria-hidden="true" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by type or date"
            aria-label="Search the library"
            className={styles.searchInput}
          />
        </div>
        {kinds.length > 1 && (
          <div className={styles.chips}>
            {["all", ...kinds].map((item) => (
              <button
                key={item}
                type="button"
                className={`${styles.chip} ${kind === item ? styles.chipOn : ""}`}
                aria-pressed={kind === item}
                onClick={() => setKind(item)}
              >
                {item === "all" ? "All" : (KIND_LABELS[item] ?? item)}
              </button>
            ))}
          </div>
        )}
      </div>

      {isFetching && !data ? (
        <p className={styles.state}><Spinner size="sm" /> Loading your images…</p>
      ) : images.length === 0 ? (
        <p className={styles.state}>
          Your library is empty. Upload an image from your device or camera first, and it will
          appear here for next time.
        </p>
      ) : shown.length === 0 ? (
        <p className={styles.state}>No images match that search.</p>
      ) : (
        <ul className={styles.grid}>
          {shown.map((image) => {
            const on = selected.includes(image.id);
            return (
              <li key={image.id} className={`${styles.tile} ${on ? styles.tileOn : ""}`}>
                <button
                  type="button"
                  className={styles.tileImage}
                  aria-pressed={on}
                  aria-label={`${on ? "Deselect" : "Select"} ${KIND_LABELS[image.kind] ?? image.kind} image from ${new Date(image.createdAt).toLocaleDateString()}`}
                  onClick={() => (multiple ? toggle(image.id) : void use([image]))}
                >
                  <img src={image.fileUrl} alt="" loading="lazy" decoding="async" />
                  {on && (
                    <span className={styles.tick}>
                      <Check size={14} />
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  className={styles.expand}
                  aria-label="See this image larger"
                  onClick={() => setPreview(image)}
                >
                  <Maximize2 size={14} />
                </button>
                <button
                  type="button"
                  className={styles.expand}
                  style={{ left: 6, right: "auto" }}
                  aria-label="Delete this image from the library"
                  onClick={() => askDelete(image)}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className={styles.footer}>
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft size={16} /> Back
        </Button>
        {multiple && (
          <Button
            disabled={selected.length === 0 || busy}
            onClick={() => void use(images.filter((image) => selected.includes(image.id)))}
          >
            {busy ? <Spinner size="sm" /> : null}
            Use {selected.length > 0 ? `${selected.length} ` : ""}selected
          </Button>
        )}
      </div>
    </>
  );
};

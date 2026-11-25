import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Bold,
  ClipboardType,
  CornerDownLeft,
  Eraser,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Underline,
  Undo2,
  Unlink,
  Youtube,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "./Button";
import { Input } from "./Input";
import { Spinner } from "./Spinner";
import { Switch } from "./Switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./Dialog";
import { uploadImage } from "../helpers/uploadImage";
import { friendlyError } from "../helpers/friendlyError";
import { normalizeVideoEmbedUrl } from "../helpers/normalizeVideoEmbedUrl";
import styles from "./RichTextEditor.module.css";

export type RichTextEditorHandle = {
  getHtml: () => string;
  getText: () => string;
};

interface Props {
  initialHtml: string;
  /** Changing this loads a different post into the editor. */
  resetKey: string;
  placeholder?: string;
}

type Align = "full" | "left" | "center" | "right";
const ALIGNS: Array<[Align, string]> = [["full", "Full width"], ["left", "Left"], ["center", "Centre"], ["right", "Right"]];
const ALIGN_CLASS = /^align-(left|right|center)$/;

const TEXT_BLOCKS = new Set(["P", "H1", "H2", "H3", "BLOCKQUOTE"]);
const EXIT_BLOCKS = new Set(["H1", "H2", "H3", "BLOCKQUOTE"]);
const YOUTUBE_EMBED =
  /^https:\/\/www\.youtube-nocookie\.com\/embed\/[A-Za-z0-9_-]{11}(\?[A-Za-z0-9=&_%.-]*)?$/;
const TEXT_ALIGN_STYLE = /^text-align:\s*(left|right|center|justify)\s*;?$/i;

const isTextBlock = (el: Element) => TEXT_BLOCKS.has(el.tagName);

const topBlock = (node: Node | null, root: HTMLElement): HTMLElement | null => {
  let current: Node | null = node;
  while (current && current.parentNode !== root) current = current.parentNode;
  return current instanceof HTMLElement ? current : null;
};

const withHttps = (value: string) => {
  const trimmed = value.trim();
  if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const alignOf = (element: Element | null): Align => {
  const match = Array.from(element?.classList ?? []).map((name) => ALIGN_CLASS.exec(name)?.[1]).find(Boolean);
  return (match as Align | undefined) ?? "full";
};

const withAlign = (base: string, align: Align) => (align === "full" ? base : `${base} align-${align}`);

const videoSrc = (url: string, options: { autoplay: boolean; loop: boolean; controls: boolean }) => {
  const base = normalizeVideoEmbedUrl(url);
  if (!base || !base.includes("youtube-nocookie.com")) return null;
  const id = base.split("/embed/")[1] ?? "";
  const params = new URLSearchParams({ rel: "0" });
  if (options.autoplay) {
    params.set("autoplay", "1");
    params.set("mute", "1"); // browsers only allow autoplay when muted
  }
  if (options.loop) {
    params.set("loop", "1");
    params.set("playlist", id);  }
  if (!options.controls) params.set("controls", "0");
  return `${base}?${params.toString()}`;
};

/** Keeps only what the blog can show; mirrors the server-side sanitizer. */
const cleanForEditor = (html: string): string => {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script,style,object,embed,svg,math,form,input,button").forEach((node) => node.remove());
  const allowed = new Set([
    "P", "BR", "STRONG", "B", "EM", "I", "U", "BLOCKQUOTE", "UL", "OL", "LI", "H1", "H2", "H3",
    "HR", "SPAN", "A", "IMG", "FIGURE", "FIGCAPTION", "DIV", "IFRAME",
  ]);
  const alignable = new Set(["P", "H1", "H2", "H3", "BLOCKQUOTE", "LI"]);
  doc.body.querySelectorAll("*").forEach((node) => {
    if (!allowed.has(node.tagName)) {
      node.replaceWith(...Array.from(node.childNodes));
      return;
    }
    if (node.tagName === "IFRAME") {
      if (!YOUTUBE_EMBED.test(node.getAttribute("src") ?? "")) {
        node.closest(".video-embed")?.remove();
        node.remove();
      }
      return;
    }
    Array.from(node.attributes).forEach((attr) => {
      const name = attr.name;
      const tag = node.tagName;
      if (name === "class" && (tag === "FIGURE" || tag === "DIV")) {
        const base = tag === "FIGURE" ? "blog-image" : "video-embed";
        const tokens = attr.value.split(/\s+/).filter(Boolean);
        if (tokens.includes(base)) {
          const align = tokens.find((token) => ALIGN_CLASS.test(token));
          node.setAttribute("class", align ? `${base} ${align}` : base);
          return;
        }
        node.removeAttribute(name);
        return;
      }
      const keep =
        (tag === "SPAN" && name === "style" && /^color:\s*(#[0-9a-f]{3,8}|rgb\([\d\s,%]+\)|[a-z]{3,20})\s*;?$/i.test(attr.value)) ||
        (alignable.has(tag) && name === "style" && TEXT_ALIGN_STYLE.test(attr.value.trim())) ||
        (tag === "OL" && name === "start" && /^\d{1,4}$/.test(attr.value)) ||
        (tag === "A" && name === "href" && /^(https?:|mailto:|tel:)/i.test(attr.value)) ||
        (tag === "IMG" && (name === "alt" || (name === "src" && /^(\/|https?:\/\/)/i.test(attr.value))));
      if (!keep) node.removeAttribute(name);
    });
  });
  return doc.body.innerHTML;
};

/** Pasted text keeps its headings, lists, links and bold, but plain wrapper divs become paragraphs. */
const cleanPasted = (html: string): string => {
  const cleaned = cleanForEditor(html);
  const doc = new DOMParser().parseFromString(cleaned, "text/html");
  doc.body.querySelectorAll("div:not(.video-embed)").forEach((node) => {
    const paragraph = doc.createElement("p");
    paragraph.innerHTML = node.innerHTML;
    node.replaceWith(paragraph);
  });
  return doc.body.innerHTML;
};

const toEditorHtml = (raw: string): string => {
  const source = raw.trim();
  if (!source) return "<p><br></p>";
  const html = source.includes("<")
    ? source
    : `<p>${source.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</p>`;
  return cleanForEditor(html) || "<p><br></p>";
};

/** Pictures and videos can be dragged, and videos must not be typed into. */
const decorate = (root: HTMLElement) => {
  root.querySelectorAll<HTMLElement>(":scope > figure.blog-image, :scope > .video-embed").forEach((element) => {
    element.setAttribute("draggable", "true");
    if (element.classList.contains("video-embed")) element.setAttribute("contenteditable", "false");
  });
};

type MediaDialog =
  | { kind: "link"; url: string }
  | { kind: "image"; element: HTMLElement; alt: string; link: string; align: Align }
  | { kind: "video"; element: HTMLElement | null; url: string; autoplay: boolean; loop: boolean; controls: boolean; align: Align }
  | null;

/**
 * Rich text editor for blog posts. Formatting applies to the selected paragraphs, every
 * format can be switched off again, and pictures and YouTube videos can be dragged, moved
 * up or down, aligned and linked.
 */
export const RichTextEditor = forwardRef<RichTextEditorHandle, Props>(
  ({ initialHtml, resetKey, placeholder }, ref) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const savedRange = useRef<Range | null>(null);
    const history = useRef<string[]>([]);
    const historyIndex = useRef(-1);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);    const dragged = useRef<HTMLElement | null>(null);
    const forcePlain = useRef(false);
    const [active, setActive] = useState<Record<string, boolean>>({});
    const [empty, setEmpty] = useState(true);
    const [dialog, setDialog] = useState<MediaDialog>(null);
    const [uploading, setUploading] = useState(false);
    const [plainPaste, setPlainPaste] = useState(false);

    const pushHistory = useCallback(() => {
      const root = rootRef.current;
      if (!root) return;
      const html = root.innerHTML;
      if (history.current[historyIndex.current] === html) return;
      history.current = history.current.slice(0, historyIndex.current + 1);
      history.current.push(html);
      if (history.current.length > 100) history.current.shift();
      historyIndex.current = history.current.length - 1;
    }, []);

    const refreshState = useCallback(() => {
      const root = rootRef.current;
      if (!root) return;
      const text = (root.textContent ?? "").replace(/\u200b/g, "").trim();
      setEmpty(text.length === 0 && !root.querySelector("img,iframe"));
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || !root.contains(selection.anchorNode)) return;
      savedRange.current = selection.getRangeAt(0).cloneRange();
      const block = topBlock(selection.anchorNode, root);
      const tag = block?.tagName ?? "";
      setActive({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        h2: tag === "H2",
        h3: tag === "H3",
        quote: tag === "BLOCKQUOTE",
        ul: document.queryCommandState("insertUnorderedList"),
        ol: document.queryCommandState("insertOrderedList"),
        link: !!(selection.anchorNode?.parentElement?.closest("a")),
      });
    }, []);

    const scheduleSnapshot = useCallback(() => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(pushHistory, 350);
    }, [pushHistory]);

    // Load a post into the editor.
    useEffect(() => {
      const root = rootRef.current;
      if (!root) return;
      root.innerHTML = toEditorHtml(initialHtml);
      decorate(root);
      history.current = [root.innerHTML];
      historyIndex.current = 0;
      try {
        document.execCommand("defaultParagraphSeparator", false, "p");
      } catch {
        /* older browsers */
      }
      refreshState();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resetKey]);

    useEffect(() => {
      document.addEventListener("selectionchange", refreshState);
      return () => document.removeEventListener("selectionchange", refreshState);
    }, [refreshState]);

    // Enter at the end of a heading or quote starts a normal paragraph (also on phone keyboards).
    useEffect(() => {
      const root = rootRef.current;
      if (!root) return;
      const onBeforeInput = (event: Event) => {
        if ((event as InputEvent).inputType !== "insertParagraph") return;
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return;
        const block = topBlock(selection.anchorNode, root);
        if (!block || !EXIT_BLOCKS.has(block.tagName)) return;
        const range = selection.getRangeAt(0);
        const tail = document.createRange();
        tail.selectNodeContents(block);
        tail.setStart(range.endContainer, range.endOffset);
        if (tail.toString().replace(/\u200b/g, "") !== "") return;
        event.preventDefault();
        const paragraph = document.createElement("p");
        paragraph.innerHTML = "<br>";
        if (block.tagName === "BLOCKQUOTE" && !block.textContent?.replace(/\u200b/g, "").trim()) block.replaceWith(paragraph);
        else block.after(paragraph);
        const next = document.createRange();
        next.setStart(paragraph, 0);
        next.collapse(true);
        selection.removeAllRanges();
        selection.addRange(next);
        refreshState();
        pushHistory();
      };
      root.addEventListener("beforeinput", onBeforeInput);
      return () => root.removeEventListener("beforeinput", onBeforeInput);
    }, [refreshState, pushHistory]);
    useImperativeHandle(ref, () => ({
      getHtml: () => {
        const root = rootRef.current;
        if (!root) return "";
        const clone = root.cloneNode(true) as HTMLElement;
        clone.querySelectorAll("figcaption").forEach((node) => {
          if (!node.textContent?.trim()) node.remove();
        });
        // Drop empty paragraphs left behind by editing.
        clone.querySelectorAll("p").forEach((node) => {
          if (!node.textContent?.trim() && !node.querySelector("img,iframe")) node.remove();
        });
        return cleanForEditor(clone.innerHTML);
      },
      getText: () => (rootRef.current?.innerText ?? "").trim(),
    }));

    const restoreSelection = () => {
      const root = rootRef.current;
      const range = savedRange.current;
      if (!root || !range) {
        root?.focus();
        return;
      }
      root.focus();
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    };

    const run = (command: string, value?: string) => {
      rootRef.current?.focus();
      document.execCommand(command, false, value);
      refreshState();
      pushHistory();
    };

    const undo = () => {
      const root = rootRef.current;
      if (!root) return;
      pushHistory();
      if (historyIndex.current <= 0) return;
      historyIndex.current -= 1;
      root.innerHTML = history.current[historyIndex.current];
      decorate(root);
      refreshState();
    };

    const redo = () => {
      const root = rootRef.current;
      if (!root || historyIndex.current >= history.current.length - 1) return;
      historyIndex.current += 1;
      root.innerHTML = history.current[historyIndex.current];
      decorate(root);
      refreshState();
    };

    /**
     * Heading / quote for the paragraphs that are selected, like a normal page editor. Doing
     * the same again turns them back into normal paragraphs.
     */
    const setBlock = (tag: "h2" | "h3" | "blockquote") => {
      const root = rootRef.current;
      const selection = window.getSelection();
      if (!root || !selection || selection.rangeCount === 0) {
        root?.focus();
        return;
      }
      const range = selection.getRangeAt(0);
      if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
        toast.info("Click inside the article first.");
        return;
      }
      const first = topBlock(range.startContainer === root ? root.childNodes[range.startOffset] : range.startContainer, root);
      const last = topBlock(
        range.endContainer === root ? root.childNodes[Math.max(0, range.endOffset - 1)] : range.endContainer,
        root,
      );
      if (!first || !last) return;
      const blocks: HTMLElement[] = [];
      let current: Element | null = first;
      while (current) {
        blocks.push(current as HTMLElement);
        if (current === last) break;
        current = current.nextElementSibling;
      }
      const textual = blocks.filter(isTextBlock);
      if (textual.length === 0) {
        toast.info("Headings and quotes work on text. Click in a paragraph first.");
        return;
      }
      pushHistory();
      const target = textual.every((block) => block.tagName.toLowerCase() === tag) ? "p" : tag;
      const created: HTMLElement[] = [];
      textual.forEach((block) => {
        const next = document.createElement(target);
        next.innerHTML = block.innerHTML || "<br>";
        if (block.style.textAlign) next.style.textAlign = block.style.textAlign;
        block.replaceWith(next);        created.push(next);
      });
      const next = document.createRange();
      next.selectNodeContents(created[0]);
      if (created.length > 1) next.setEndAfter(created[created.length - 1].lastChild ?? created[created.length - 1]);
      selection.removeAllRanges();
      selection.addRange(next);
      root.focus();
      refreshState();
      pushHistory();
    };

    /** A numbered list that comes after another one carries on counting instead of restarting at 1. */
    const toggleNumbered = () => {
      const wasOn = document.queryCommandState("insertOrderedList");
      run("insertOrderedList");
      if (wasOn) return;
      const root = rootRef.current;
      const selection = window.getSelection();
      const anchor = selection?.anchorNode;
      const list = (anchor instanceof Element ? anchor : anchor?.parentElement)?.closest("ol");
      if (!root || !list || list.parentElement !== root) return;
      let previous = list.previousElementSibling;
      let hops = 0;
      while (previous && previous.tagName !== "OL" && !/^H[1-3]$/.test(previous.tagName) && hops < 6) {
        previous = previous.previousElementSibling;
        hops += 1;
      }
      if (previous && previous.tagName === "OL") {
        const start = Number(previous.getAttribute("start") || "1") || 1;
        list.setAttribute("start", String(start + previous.querySelectorAll(":scope > li").length));
        pushHistory();
      }
    };

    const insertBlockHtml = (html: string) => {
      const root = rootRef.current;
      if (!root) return;
      pushHistory();
      const holder = document.createElement("div");
      holder.innerHTML = html;
      const range = savedRange.current;
      const reference = range && root.contains(range.endContainer) ? topBlock(range.endContainer, root) : null;
      const anchor = reference?.nextSibling ?? null;
      // An empty paragraph is replaced rather than left dangling above the new block.
      const replaceable = reference && reference.tagName === "P" && !reference.textContent?.trim() && !reference.querySelector("img,iframe");
      Array.from(holder.childNodes).forEach((node) => root.insertBefore(node, replaceable ? reference : anchor));
      if (replaceable) reference?.remove();
      const last = root.lastElementChild;
      if (!last || !isTextBlock(last)) root.insertAdjacentHTML("beforeend", "<p><br></p>");
      decorate(root);
      refreshState();
      pushHistory();
    };

    /** Moves a picture or video one step up or down between paragraphs. */
    const moveBlock = (element: HTMLElement | null, direction: -1 | 1) => {
      const root = rootRef.current;
      const block = element?.closest("figure,.video-embed") as HTMLElement | null;
      if (!root || !block || block.parentElement !== root) return;
      const sibling = direction < 0 ? block.previousElementSibling : block.nextElementSibling;
      if (!sibling) {
        toast.info(direction < 0 ? "This is already at the top." : "This is already at the bottom.");
        return;
      }
      pushHistory();
      root.insertBefore(block, direction < 0 ? sibling : sibling.nextSibling);
      refreshState();
      pushHistory();
      block.scrollIntoView({ block: "nearest", behavior: "smooth" });
    };

    const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      const modifier = event.metaKey || event.ctrlKey;
      if (!modifier) return;
      const key = event.key.toLowerCase();
      if (key === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (key === "y") {
        event.preventDefault();
        redo();
      } else if (key === "v" && event.shiftKey) {
        forcePlain.current = true;
        setTimeout(() => {
          forcePlain.current = false;
        }, 600);
      }
    };

    const onPaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
      const html = event.clipboardData.getData("text/html");
      const text = event.clipboardData.getData("text/plain");
      const plain = plainPaste || forcePlain.current || !html;
      event.preventDefault();
      if (!plain) {
        const cleaned = cleanPasted(html);
        if (cleaned.replace(/<[^>]*>/g, "").trim() || /<(img|hr)/i.test(cleaned)) {
          document.execCommand("insertHTML", false, cleaned);          decorate(rootRef.current as HTMLElement);
          refreshState();
          pushHistory();
          return;
        }
      }
      document.execCommand("insertText", false, text);
    };

    const onEditorClick = (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;
      const embed = target.closest(".video-embed") as HTMLElement | null;
      if (embed) {
        const src = embed.querySelector("iframe")?.getAttribute("src") ?? "";
        let params = new URLSearchParams();
        try {
          params = new URL(src).searchParams;
        } catch {
          /* keep defaults */
        }
        setDialog({
          kind: "video",
          element: embed,
          url: src.split("?")[0],
          autoplay: params.get("autoplay") === "1",
          loop: params.get("loop") === "1",
          controls: params.get("controls") !== "0",
          align: alignOf(embed),
        });
        return;
      }
      const image = target.closest("img") as HTMLElement | null;
      if (image) {
        setDialog({
          kind: "image",
          element: image,
          alt: image.getAttribute("alt") ?? "",
          link: image.closest("a")?.getAttribute("href") ?? "",
          align: alignOf(image.closest("figure")),
        });
      }
    };

    // Drag a picture or video to a new place in the article (on phones use the Move buttons).
    const onDragStart = (event: React.DragEvent<HTMLDivElement>) => {
      const element = (event.target as HTMLElement).closest("figure.blog-image,.video-embed") as HTMLElement | null;
      if (element && element.parentElement === rootRef.current) {
        dragged.current = element;
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", " ");
      }
    };
    const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
      if (dragged.current) event.preventDefault();
    };
    const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
      const root = rootRef.current;
      const element = dragged.current;
      dragged.current = null;
      if (!root || !element) return;
      event.preventDefault();
      let before: Element | null = null;
      for (const child of Array.from(root.children)) {
        if (child === element) continue;
        const box = child.getBoundingClientRect();
        if (event.clientY < box.top + box.height / 2) {
          before = child;
          break;
        }
      }
      pushHistory();
      root.insertBefore(element, before);
      refreshState();
      pushHistory();
    };

    const addImage = async (files: FileList | null) => {
      const file = files?.[0];
      if (fileRef.current) fileRef.current.value = "";
      if (!file) return;
      setUploading(true);
      try {
        const url = await uploadImage(file, "gallery");
        insertBlockHtml(
          `<figure class="blog-image"><img src="${url}" alt=""><figcaption></figcaption></figure>`,
        );
        toast.success("Image added. Tap it to link, align or move it.");
      } catch (error) {
        toast.error(friendlyError(error, "The image could not be added."));
      } finally {
        setUploading(false);
      }
    };

    const openLinkDialog = () => {
      refreshState();
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        toast.info("Select the words you want to turn into a link first.");
        return;      }
      const existing = selection.anchorNode?.parentElement?.closest("a");
      setDialog({ kind: "link", url: existing?.getAttribute("href") ?? "" });
    };

    const openVideoDialog = () => {
      refreshState();
      setDialog({ kind: "video", element: null, url: "", autoplay: false, loop: false, controls: true, align: "full" });
    };

    const applyDialog = () => {
      if (!dialog) return;
      if (dialog.kind === "link") {
        if (!dialog.url.trim()) {
          toast.error("Paste the link address first.");
          return;
        }
        restoreSelection();
        run("createLink", withHttps(dialog.url));
        setDialog(null);
      } else if (dialog.kind === "image") {
        pushHistory();
        const image = dialog.element;
        image.setAttribute("alt", dialog.alt.trim());
        const href = dialog.link.trim() ? withHttps(dialog.link) : "";
        const anchor = image.closest("a");
        if (href) {
          if (anchor) anchor.setAttribute("href", href);
          else {
            const wrapper = document.createElement("a");
            wrapper.setAttribute("href", href);
            image.replaceWith(wrapper);
            wrapper.appendChild(image);
          }
        } else if (anchor) {
          anchor.replaceWith(image);
        }
        const figure = image.closest("figure");
        if (figure) figure.className = withAlign("blog-image", dialog.align);
        pushHistory();
        setDialog(null);
      } else if (dialog.kind === "video") {
        const src = videoSrc(dialog.url, dialog);
        if (!src) {
          toast.error("That does not look like a YouTube link. Paste the address of a YouTube video.");
          return;
        }
        if (dialog.element) {
          pushHistory();
          dialog.element.querySelector("iframe")?.setAttribute("src", src);
          dialog.element.className = withAlign("video-embed", dialog.align);
          pushHistory();
        } else {
          insertBlockHtml(
            `<div class="${withAlign("video-embed", dialog.align)}" contenteditable="false"><iframe src="${src}" title="Video" loading="lazy" allowfullscreen></iframe></div>`,
          );
        }
        setDialog(null);
      }
    };

    const removeElement = () => {
      if (!dialog || dialog.kind === "link" || !dialog.element) return;
      pushHistory();
      const target = dialog.element.closest("figure,.video-embed") ?? dialog.element;
      target.remove();
      const root = rootRef.current;
      if (root && !root.firstElementChild) root.innerHTML = "<p><br></p>";
      refreshState();
      pushHistory();
      setDialog(null);
    };

    const tool = (
      label: string,
      icon: React.ReactNode,
      onClick: () => void,
      pressed?: boolean,
    ) => (
      <button
        type="button"
        title={label}
        aria-label={label}
        aria-pressed={pressed}
        className={`${styles.tool} ${pressed ? styles.toolOn : ""}`}
        onMouseDown={(event) => event.preventDefault()}
        onClick={onClick}
      >
        {icon}
      </button>
    );

    const alignPicker = (value: Align, onChange: (align: Align) => void) => (
      <div className={styles.alignRow} role="group" aria-label="Alignment">
        {ALIGNS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={value === key}
            className={`${styles.alignChoice} ${value === key ? styles.alignOn : ""}`}            onClick={() => onChange(key)}
          >
            {label}
          </button>
        ))}
      </div>
    );

    const mediaElement = dialog && dialog.kind !== "link" ? dialog.element : null;

    return (
      <div className={styles.editor}>
        <div className={styles.toolbar} role="toolbar" aria-label="Article formatting">
          <div className={styles.group}>
            {tool("Undo", <Undo2 size={16} />, undo)}
            {tool("Redo", <Redo2 size={16} />, redo)}
          </div>
          <div className={styles.group}>
            {tool("Bold", <Bold size={16} />, () => run("bold"), active.bold)}
            {tool("Italic", <Italic size={16} />, () => run("italic"), active.italic)}
            {tool("Underline", <Underline size={16} />, () => run("underline"), active.underline)}
            <label className={styles.colour} title="Text colour for the selected words">
              A
              <input
                type="color"
                aria-label="Text colour"
                defaultValue="#0e5c3f"
                onMouseDown={() => refreshState()}
                onChange={(event) => {
                  restoreSelection();
                  run("foreColor", event.target.value);
                }}
              />
            </label>
            {tool("Clear formatting from the selection", <Eraser size={16} />, () => run("removeFormat"))}
          </div>
          <div className={styles.group}>
            {tool("Heading", <Heading2 size={16} />, () => setBlock("h2"), active.h2)}
            {tool("Sub-heading", <Heading3 size={16} />, () => setBlock("h3"), active.h3)}
            {tool("Quote", <Quote size={16} />, () => setBlock("blockquote"), active.quote)}
          </div>
          <div className={styles.group}>
            {tool("Align left", <AlignLeft size={16} />, () => run("justifyLeft"))}
            {tool("Align centre", <AlignCenter size={16} />, () => run("justifyCenter"))}
            {tool("Align right", <AlignRight size={16} />, () => run("justifyRight"))}
            {tool("Justify", <AlignJustify size={16} />, () => run("justifyFull"))}
          </div>
          <div className={styles.group}>
            {tool("Bulleted list", <List size={16} />, () => run("insertUnorderedList"), active.ul)}
            {tool("Numbered list", <ListOrdered size={16} />, toggleNumbered, active.ol)}
            {tool("New line inside the same item or paragraph", <CornerDownLeft size={16} />, () => run("insertLineBreak"))}
            {tool("Divider line", <Minus size={16} />, () => run("insertHorizontalRule"))}
          </div>
          <div className={styles.group}>
            {tool("Add link", <Link2 size={16} />, openLinkDialog, active.link)}
            {tool("Remove link", <Unlink size={16} />, () => run("unlink"))}
            {tool(
              "Insert image",
              uploading ? <Spinner size="sm" /> : <ImagePlus size={16} />,
              () => {
                refreshState();
                fileRef.current?.click();
              },
            )}
            {tool("Insert YouTube video", <Youtube size={16} />, openVideoDialog)}
            {tool(
              plainPaste ? "Pasting as plain text. Tap to keep formatting when pasting." : "Pasting keeps formatting. Tap to paste as plain text.",
              <ClipboardType size={16} />,
              () => setPlainPaste((value) => !value),
              plainPaste,
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            hidden
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => void addImage(event.target.files)}
          />
        </div>
        <p className={styles.hint}>
          Tap a picture or video to link, align or move it up or down. On a computer you can also drag it.
        </p>

        <div
          ref={rootRef}
          className={styles.content}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-label="Blog article body"
          aria-multiline="true"
          data-empty={empty ? "true" : "false"}
          data-placeholder={placeholder ?? "Write your article here. Select words to format only those words."}
          onInput={() => {
            refreshState();
            scheduleSnapshot();
          }}
          onKeyDown={onKeyDown}
          onPaste={onPaste}          onClick={onEditorClick}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onDragEnd={() => {
            dragged.current = null;
          }}
        />

        <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
          <DialogContent>
            {dialog?.kind === "link" && (
              <>
                <DialogHeader>
                  <DialogTitle>Add a link</DialogTitle>
                  <DialogDescription>The selected words will open this address.</DialogDescription>
                </DialogHeader>
                <Input
                  autoFocus
                  value={dialog.url}
                  onChange={(event) => setDialog({ ...dialog, url: event.target.value })}
                  placeholder="https://example.com"
                  aria-label="Link address"
                />
              </>
            )}
            {dialog?.kind === "image" && (
              <>
                <DialogHeader>
                  <DialogTitle>Picture options</DialogTitle>
                  <DialogDescription>
                    Choose where the picture sits, link it to a page, or describe it for people who cannot see it.
                  </DialogDescription>
                </DialogHeader>
                <Input
                  value={dialog.alt}
                  onChange={(event) => setDialog({ ...dialog, alt: event.target.value })}
                  placeholder="What is in this picture?"
                  aria-label="Image description"
                />
                <Input
                  value={dialog.link}
                  onChange={(event) => setDialog({ ...dialog, link: event.target.value })}
                  placeholder="Open this link when tapped (optional)"
                  aria-label="Picture link"
                />
                {alignPicker(dialog.align, (align) => setDialog({ ...dialog, align }))}
              </>
            )}
            {dialog?.kind === "video" && (
              <>
                <DialogHeader>
                  <DialogTitle>{dialog.element ? "Video options" : "Add a YouTube video"}</DialogTitle>
                  <DialogDescription>Paste the address of any public YouTube video.</DialogDescription>
                </DialogHeader>
                <Input
                  autoFocus
                  value={dialog.url}
                  onChange={(event) => setDialog({ ...dialog, url: event.target.value })}
                  placeholder="https://www.youtube.com/watch?v=…"
                  aria-label="YouTube link"
                />
                {alignPicker(dialog.align, (align) => setDialog({ ...dialog, align }))}
                <div className={styles.options}>
                  <label className={styles.option}>
                    <Switch checked={dialog.autoplay} onCheckedChange={(checked) => setDialog({ ...dialog, autoplay: checked })} />
                    <span>
                      <strong>Start automatically</strong>
                      <small>Plays on its own, without sound, when the page opens.</small>
                    </span>
                  </label>
                  <label className={styles.option}>
                    <Switch checked={dialog.loop} onCheckedChange={(checked) => setDialog({ ...dialog, loop: checked })} />
                    <span>
                      <strong>Repeat</strong>
                      <small>Starts again when it ends.</small>
                    </span>
                  </label>
... (output capped at 40000 chars — continue with read_file path: "components/RichTextEditor.tsx" offset: 879)

                  <label className={styles.option}>
                    <Switch checked={dialog.controls} onCheckedChange={(checked) => setDialog({ ...dialog, controls: checked })} />
                    <span><strong>Show player controls</strong><small>Let visitors pause or control playback.</small></span>
                  </label>
                </div>
              </>
            )}
            <DialogFooter>
              {mediaElement && (
                <Button type="button" variant="destructive" onClick={removeElement}>Remove</Button>
              )}
              <Button type="button" variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
              <Button type="button" onClick={applyDialog}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  },
);
RichTextEditor.displayName = "RichTextEditor";
export default RichTextEditor;

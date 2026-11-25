import sanitizeHtml from "sanitize-html";

const BLOG_TAGS = [
  "h1", "h2", "h3", "p", "br", "strong", "b", "em", "i", "u", "blockquote", "ul", "ol", "li",
  "hr", "span", "a", "img", "figure", "figcaption", "div", "iframe",
];

/** Only YouTube's privacy-friendly embed address, with simple player options. */
const YOUTUBE_EMBED =
  /^https:\/\/www\.youtube-nocookie\.com\/embed\/[A-Za-z0-9_-]{11}(\?[A-Za-z0-9=&_%.-]*)?$/;

export const sanitizeBlogContent = (value: string) =>
  sanitizeHtml(value, {
    allowedTags: BLOG_TAGS,
    allowedAttributes: {
      span: ["style"],
      p: ["style"],
      h1: ["style"],
      h2: ["style"],
      h3: ["style"],
      blockquote: ["style"],
      li: ["style"],
      ol: ["start"],
      a: ["href", "target", "rel"],
      img: ["src", "alt", "loading"],
      figure: ["class"],
      div: ["class"],
      iframe: ["src", "title", "allow", "allowfullscreen", "loading", "referrerpolicy"],
    },
    allowedClasses: {
      figure: ["blog-image", "align-left", "align-right", "align-center"],
      div: ["video-embed", "align-left", "align-right", "align-center"],
    },
    allowedStyles: {
      "*": {
        "text-align": [/^(left|right|center|justify)$/],
      },
      span: {
        color: [/^#[0-9a-f]{3,8}$/i, /^rgb\([\d\s,%]+\)$/i, /^[a-z]{3,20}$/i],
      },
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: { img: ["http", "https"] },
    allowedIframeHostnames: ["www.youtube-nocookie.com"],
    allowIframeRelativeUrls: false,
    allowProtocolRelative: false,
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, target: "_blank", rel: "noopener noreferrer" },
      }),
      img: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, loading: "lazy" },
      }),
      iframe: (tagName, attribs) => ({
        tagName,
        attribs: {
          src: attribs.src ?? "",
          title: "Video",
          allow:
            "accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture",
          allowfullscreen: "allowfullscreen",
          loading: "lazy",
          referrerpolicy: "strict-origin-when-cross-origin",
        },
      }),
    },
    exclusiveFilter: (frame) =>
      frame.tag === "iframe" && !YOUTUBE_EMBED.test(frame.attribs.src ?? ""),
    disallowedTagsMode: "discard",
  });


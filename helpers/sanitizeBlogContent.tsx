import sanitizeHtml from "sanitize-html";

const BLOG_TAGS = ["h1","h2","h3","p","br","strong","b","em","i","u","blockquote","ul","ol","li","hr","span"];
export const sanitizeBlogContent = (value: string) => sanitizeHtml(value, {
  allowedTags: BLOG_TAGS,
  allowedAttributes: { span: ["style"] },
  allowedStyles: {
    span: {
      color: [/^#[0-9a-f]{3,8}$/i, /^rgb\([\d\s,%]+\)$/i, /^[a-z]{3,20}$/i],
   10	    },
   11	  },
   12	  disallowedTagsMode: "discard",
   13	});
   14	

import sanitizeHtml from "sanitize-html";

const allowedTags = [
  "a", "b", "blockquote", "br", "code", "div", "em", "h2", "h3", "h4", "hr",
  "i", "iframe", "img", "li", "ol", "p", "pre", "s", "source", "span", "strong",
  "table", "tbody", "td", "tfoot", "th", "thead", "tr", "u", "ul", "video",
];

const approvedIframeHosts = [
  "player.vimeo.com",
  "www.youtube.com",
  "www.youtube-nocookie.com",
  "youtube.com",
  "youtube-nocookie.com",
];

function safeUrl(value: string | undefined, kind: "link" | "media"): string | undefined {
  const candidate = value?.trim();
  if (!candidate || /[\u0000-\u001f\u007f\ufffd]/.test(candidate) || candidate.startsWith("//")) return undefined;
  if (candidate.startsWith("/") || (kind === "link" && candidate.startsWith("#"))) return candidate;
  try {
    const url = new URL(candidate);
    if (url.protocol === "https:" || (kind === "link" && url.protocol === "mailto:")) return candidate;
  } catch {
    return undefined;
  }
  return undefined;
}

export function sanitizeProductHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags,
    allowedAttributes: {
      a: ["href", "rel", "target", "title"],
      iframe: ["allowfullscreen", "height", "loading", "referrerpolicy", "sandbox", "src", "title", "width"],
      img: ["alt", "height", "loading", "src", "title", "width"],
      source: ["src", "type"],
      table: ["width"],
      td: ["colspan", "rowspan"],
      th: ["colspan", "rowspan"],
      video: ["controls", "height", "playsinline", "poster", "preload", "src", "width"],
    },
    allowedSchemes: ["https", "mailto"],
    allowedSchemesByTag: {
      iframe: ["https"],
      img: ["https"],
      source: ["https"],
      video: ["https"],
    },
    allowedIframeHostnames: approvedIframeHosts,
    allowProtocolRelative: false,
    nonTextTags: ["script", "style", "textarea", "option", "noscript", "form", "svg", "math", "template", "object"],
    transformTags: {
      a: (tagName, attribs) => {
        const { href, ...rest } = attribs;
        const safeHref = safeUrl(href, "link");
        return {
          tagName,
          attribs: {
            ...rest,
            ...(safeHref ? { href: safeHref } : {}),
            ...(attribs.target === "_blank" ? { rel: "noopener noreferrer" } : {}),
          },
        };
      },
      img: (tagName, attribs) => {
        const { src, ...rest } = attribs;
        const safeSrc = safeUrl(src, "media");
        return { tagName, attribs: { ...rest, ...(safeSrc ? { src: safeSrc } : {}) } };
      },
      source: (tagName, attribs) => {
        const { src, ...rest } = attribs;
        const safeSrc = safeUrl(src, "media");
        return { tagName, attribs: { ...rest, ...(safeSrc ? { src: safeSrc } : {}) } };
      },
      video: (tagName, attribs) => {
        const { poster, src, ...rest } = attribs;
        const safePoster = safeUrl(poster, "media");
        const safeSrc = safeUrl(src, "media");
        return {
          tagName,
          attribs: {
            ...rest,
            ...(safePoster ? { poster: safePoster } : {}),
            ...(safeSrc ? { src: safeSrc } : {}),
          },
        };
      },
      iframe: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          loading: "lazy",
          referrerpolicy: "no-referrer",
          sandbox: "allow-scripts allow-same-origin allow-presentation",
        },
      }),
    },
  }).trim();
}

export type ProductWithSanitizedHtml<T extends { descriptionHtml: string }> =
  Omit<T, "descriptionHtml"> & { sanitizedDescriptionHtml: string };

export function sanitizeProductForRendering<T extends { descriptionHtml: string }>(
  product: T,
): ProductWithSanitizedHtml<T> {
  const { descriptionHtml, ...rest } = product;
  return {
    ...rest,
    sanitizedDescriptionHtml: sanitizeProductHtml(descriptionHtml),
  };
}

// Tags of AI blocks (spec §2.3), without dependencies: the sanitizer uses them, and so does the preview runtime's
// second wall (it re-checks what it inserts).
export const ROOT_TAGS: ReadonlySet<string> = new Set(["section", "header", "footer", "nav", "aside", "div"]);

export const ALLOWED_TAGS: ReadonlySet<string> = new Set([
  "section", "header", "footer", "nav", "aside", "div", "main", "article", "ul", "ol", "li", "dl", "dt", "dd", "p",
  "span", "strong", "em", "small", "h1", "h2", "h3", "h4", "h5", "h6", "a", "button", "img", "figure", "figcaption",
  "blockquote", "cite", "hr", "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption", "label", "input",
  "textarea", "select", "option", "time", "mark", "abbr", "i", "br", "b", "u", "s", "sub", "sup", "q", "address",
]);


/** Attributes the sanitizer can output (plus `aria-*`). The runtime drops anything else it is handed. */
export const ALLOWED_ATTRS: ReadonlySet<string> = new Set([
  "class", "data-block-id", "data-icon", "data-placeholder", "data-asset", "data-dl-t", "href", "alt", "role", "type",
  "placeholder", "for", "id", "name", "scope", "colspan", "rowspan", "datetime", "value", "checked", "disabled",
  "tabindex", "autocomplete",
]);

export const isAllowedAttr = (name: string): boolean => ALLOWED_ATTRS.has(name) || /^aria-[a-z]+$/.test(name);

/**
 * Deep links to a technology of the tech tree (T3205, TECH_TREE_GDD.md section 6).
 *
 * A technology is addressed by its game id in the URL hash: `tech-tree.html#tech_lasers_2`.
 * The tree page selects it, opens its card and scrolls to it; selecting another one updates the
 * hash (without adding history entries), so the address bar can always be shared.
 *
 * Wiki articles (js/content.js) link to it with the usual Markdown link syntax and a relative URL,
 * `[Blue Lasers](tech-tree.html#tech_lasers_2)`: `formatTechLinks()` turns it into a same-tab
 * link (the external `https://` links keep opening in a new tab). This module is tiny and loads
 * no data, so the wiki can import it.
 */

export const TECH_TREE_PAGE = "tech-tree.html";

/** Game ids are `[a-z0-9_]`; anything else in a hash is not a technology. */
const ID_PATTERN = /^[A-Za-z0-9_]+$/;

/** Relative URL of the technology `id` in the tree. */
export function techTreeUrl(id) {
  return TECH_TREE_PAGE + "#" + encodeURIComponent(id);
}

/** Technology id named by a hash ("#tech_lasers_2" → "tech_lasers_2"), or null. */
export function techIdFromHash(hash) {
  let raw = String(hash || "").replace(/^#/, "");
  try {
    raw = decodeURIComponent(raw);
  } catch {
    return null;
  }
  return ID_PATTERN.test(raw) ? raw : null;
}

/** `[text](tech-tree.html#id)` in already escaped HTML → same-tab link to the tree. */
const LINK_PATTERN = /\[(.+?)\]\(tech-tree\.html#([A-Za-z0-9_]+)\)/g;

export function formatTechLinks(html) {
  return html.replace(LINK_PATTERN, (match, text, id) => `<a class="tech-tree-link" href="${techTreeUrl(id)}">${text}</a>`);
}

/** True for a link that goes to the tree (opened in the same tab). */
export function isTechTreeUrl(url) {
  return String(url || "").startsWith(TECH_TREE_PAGE);
}

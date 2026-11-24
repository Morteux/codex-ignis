/**
 * Reserved icon slot of the tech tree (T3003, TECH_TREE_GDD.md section 3 "Icons").
 *
 * Every node and the detail card get a fixed-size frame for the technology icon. The image is
 * loaded lazily from the assets repository (`STELLARIS_ASSETS_BASE` + the record's `icon` path,
 * `technologies/<icon>.png` as exported by T2506). While it loads, and if the file does not exist
 * yet, the frame stays empty with the same size: nothing moves and no made-up placeholder is shown.
 * The icons appear on their own once they are uploaded (T3008).
 */
import { STELLARIS_ASSETS_BASE } from "./asset-config.js";

/** Frame sizes in px (also set in styles.css, section 10). */
export const TECH_ICON_SIZES = { node: 40, card: 72 };

/** URL of a technology icon (absolute URLs are kept, for tests with a local file server). */
export function techIconUrl(tech, base = STELLARIS_ASSETS_BASE) {
  if (!tech || !tech.icon) return "";
  return /^(https?:|file:)/i.test(tech.icon) ? tech.icon : base + tech.icon;
}

/**
 * Fixed-size frame with the lazy icon of `tech`. `size`: "node" or "card". The image is decorative
 * (the name is always next to it): empty alt. A missing file removes the image and marks the
 * frame `is-missing`; its size never changes.
 */
export function createTechIconSlot(tech, size = "node", base = STELLARIS_ASSETS_BASE) {
  const frame = document.createElement("span");
  frame.className = `tech-icon-slot tech-icon-slot--${size === "card" ? "card" : "node"}`;
  frame.setAttribute("aria-hidden", "true");
  const url = techIconUrl(tech, base);
  if (!url) {
    frame.classList.add("is-missing");
    return frame;
  }
  const px = TECH_ICON_SIZES[size === "card" ? "card" : "node"];
  const img = document.createElement("img");
  img.alt = "";
  img.loading = "lazy";
  img.decoding = "async";
  img.width = px;
  img.height = px;
  img.addEventListener("load", () => frame.classList.add("is-loaded"), { once: true });
  img.addEventListener("error", () => {
    img.remove();
    frame.classList.add("is-missing");
  }, { once: true });
  img.src = url;
  frame.append(img);
  return frame;
}

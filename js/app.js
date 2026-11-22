import { knowledgeBase, localizeEntry } from "./content.js";
import { initializeAds } from "./ads.js";
import { t } from "./i18n.js";
import { getLang, applyPageTranslations, onLanguageChange } from "./page-shell.js";
import { highlightWords } from "./highlight-config.js";
import { resolveAssetUrl } from "./asset-config.js";

const searchInput = document.querySelector("#knowledge-search");
const searchStatus = document.querySelector("#search-status");
const entryCount = document.querySelector("#entry-count");
const entryList = document.querySelector("#index-empty");
const readerMeta = document.querySelector("#reader-meta");
const readerBody = document.querySelector("#reader-body");
const lightbox = document.querySelector("#image-lightbox");
const lightboxImage = document.querySelector("#lightbox-image");
const lightboxClose = document.querySelector("#lightbox-close");

let currentLang = getLang();
let currentQuery = "";
let currentEntry = null; // entrada base (sin localizar) actualmente abierta, o null
let scrollToReader = false; // set by an index click on mobile, used by the next render

/** Quita diacríticos y pasa a minúsculas para comparar texto sin acentos. */
function normalize(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[ch]));
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Quita diacríticos sin tocar mayúsculas/minúsculas (para usar como clave de mapa/color). */
function stripDiacritics(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Mapa en minúsculas y sin tildes → color. Al quitar los acentos de la clave,
// da igual que en highlight-config.js la palabra lleve tilde o no: "energia"
// y "energía" acaban resolviendo al mismo color.
const highlightWordsByLowerCase = new Map(
  Object.entries(highlightWords).map(([word, color]) => [stripDiacritics(word).toLowerCase(), color])
);

// Grupos de caracteres equivalentes con/sin tilde, usados para que el patrón
// de búsqueda encuentre la palabra tanto si el artículo la escribe con tilde
// como si no (independientemente de cómo esté escrita en highlight-config.js).
const diacriticGroups = {
  a: "aàáâãā",
  e: "eèéêëē",
  i: "iìíîïī",
  o: "oòóôõöō",
  u: "uùúûüū",
  n: "nñ",
  c: "cç"
};

/** Convierte una palabra en un patrón regex que acepta variantes con y sin tilde. */
function toDiacriticInsensitivePattern(word) {
  return [...stripDiacritics(word)]
    .map((ch) => {
      const group = diacriticGroups[ch.toLowerCase()];
      return group ? `[${group}]` : escapeRegExp(ch);
    })
    .join("");
}

// Un único patrón con todas las palabras de highlight-config.js, delimitado por
// límites de palabra "manuales" (en vez de \b) para que funcione bien con
// palabras acentuadas y no coincida con partes de palabras más largas.
const highlightWordsPattern = highlightWordsByLowerCase.size
  ? new RegExp(
      `(?<![\\p{L}\\p{N}_])(${[...highlightWordsByLowerCase.keys()]
        .map(toDiacriticInsensitivePattern)
        .join("|")})(?![\\p{L}\\p{N}_])`,
      "giu"
    )
  : null;

/**
 * Applies a replacement only to the text of an HTML string, never inside tags
 * (attributes such as href or style) nor inside entities such as &amp;.
 */
function replaceInText(html, pattern, replacer) {
  return html
    .split(/(<[^>]*>|&#?\w+;)/)
    .map((part, index) => (index % 2 ? part : part.replace(pattern, replacer)))
    .join("");
}

/** Colorea automáticamente las palabras definidas en js/highlight-config.js. */
function applyWordHighlights(html) {
  if (!highlightWordsPattern) return html;
  return replaceInText(html, highlightWordsPattern, (match) => {
    const color = highlightWordsByLowerCase.get(stripDiacritics(match).toLowerCase());
    return `<span class="hl-word" style="color: ${color}">${match}</span>`;
  });
}

/** Escapa el texto, convierte **negrita** en <strong> y [texto](url) en enlaces, y colorea palabras clave. */
function formatText(text) {
  let html = escapeHtml(text);
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  return applyWordHighlights(html);
}

/** Resalta, como si estuviera pintado con un marcador, las palabras de la búsqueda (con o sin tilde). */
function highlightMatches(html, rawQuery) {
  const words = rawQuery.trim().split(/\s+/).filter(Boolean).map((word) => toDiacriticInsensitivePattern(escapeHtml(word)));
  if (!words.length) return html;
  const pattern = new RegExp(`(${words.join("|")})`, "giu");
  return replaceInText(html, pattern, '<mark class="hl-marker">$1</mark>');
}

/** Abre la imagen en grande, centrada y a su resolución original (limitada al viewport). */
let lightboxOpener = null; // element focused before opening, focused again on close

function openLightbox(src, alt) {
  if (!lightbox || !lightboxImage || !src) return;
  lightboxOpener = document.activeElement;
  lightboxImage.src = resolveAssetUrl(src);
  lightboxImage.alt = alt || "";
  lightbox.hidden = false;
  lightboxClose?.focus();
}

function closeLightbox() {
  if (!lightbox || !lightboxImage) return;
  lightbox.hidden = true;
  lightboxImage.src = "";
  if (lightboxOpener && document.contains(lightboxOpener)) lightboxOpener.focus();
  lightboxOpener = null;
}

if (lightbox && lightboxImage && lightboxClose) {
  lightboxClose.addEventListener("click", closeLightbox);
  // Cerrar al pulsar fuera de la imagen (sobre el fondo oscurecido).
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) closeLightbox();
  });
  document.addEventListener("keydown", (event) => {
    if (lightbox.hidden) return;
    if (event.key === "Escape") closeLightbox();
    // Modal dialog: the close button is its only control, so Tab stays on it.
    if (event.key === "Tab") {
      event.preventDefault();
      lightboxClose.focus();
    }
  });
}

/** Wraps a zoomable image in a button, so the lightbox also opens with the keyboard. */
function zoomButton(img, className, src, alt) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.addEventListener("click", () => openLightbox(src, alt));
  button.append(img);
  return button;
}

/** Nivel de un bloque "heading": 1 = subtítulo, 2 = sub-subtítulo, 3 = sub-sub-subtítulo. */
function headingLevelInfo(level) {
  const normalized = level === 2 || level === 3 ? level : 1;
  if (normalized === 2) return { tag: "h4", className: "entry-heading-sub" };
  if (normalized === 3) return { tag: "h5", className: "entry-heading-subsub" };
  return { tag: "h3", className: "entry-heading" };
}

function renderBlock(block, query) {
  switch (block.type) {
    case "heading": {
      const { tag, className } = headingLevelInfo(block.level);
      const heading = document.createElement(tag);
      heading.className = className;
      heading.innerHTML = highlightMatches(formatText(block.text), query);
      return heading;
    }

    case "list": {
      const list = document.createElement("ul");
      list.className = "entry-list";
      block.items.forEach((item) => {
        const listItem = document.createElement("li");
        listItem.innerHTML = highlightMatches(formatText(item), query);
        list.append(listItem);
      });
      return list;
    }

    case "links": {
      const list = document.createElement("ul");
      list.className = "entry-links";
      block.items.forEach((item) => {
        const listItem = document.createElement("li");
        const link = document.createElement("a");
        link.href = item.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.innerHTML = highlightMatches(formatText(item.label), query);
        listItem.append(link);
        if (item.description) {
          const description = document.createElement("p");
          description.className = "link-description";
          description.innerHTML = highlightMatches(formatText(item.description), query);
          listItem.append(description);
        }
        list.append(listItem);
      });
      return list;
    }

    case "image": {
      const figure = document.createElement("figure");
      figure.className = "entry-image";
      const img = document.createElement("img");
      img.src = resolveAssetUrl(block.src);
      img.alt = block.alt || "";
      img.loading = "lazy";
      const zoom = block.src ? zoomButton(img, "entry-image-zoom", block.src, block.alt || "") : img;
      if (zoom !== img && !img.alt) zoom.setAttribute("aria-label", t(currentLang, "a11yZoomImage"));
      // A missing image is replaced by a visible notice instead of a broken icon.
      img.addEventListener("error", () => {
        const missing = document.createElement("p");
        missing.className = "entry-image-missing";
        missing.textContent = t(currentLang, "imageMissing")(block.alt || block.src || "");
        zoom.replaceWith(missing);
      });
      figure.append(zoom);
      if (block.caption) {
        const caption = document.createElement("figcaption");
        caption.innerHTML = highlightMatches(formatText(block.caption), query);
        figure.append(caption);
      }
      return figure;
    }

    case "columns": {
      const wrapper = document.createElement("div");
      wrapper.className = "entry-columns";
      (block.columns || []).forEach((columnBlocks) => {
        const column = document.createElement("div");
        column.className = "entry-column";
        (columnBlocks || []).forEach((subBlock) => {
          column.append(renderBlock(subBlock, query));
        });
        wrapper.append(column);
      });
      return wrapper;
    }

    case "note": {
      const note = document.createElement("div");
      note.className = "entry-note";
      note.innerHTML = highlightMatches(formatText(block.text), query);
      return note;
    }

    case "quote": {
      const quote = document.createElement("blockquote");
      quote.className = "entry-quote";

      if (block.portrait) {
        const portrait = document.createElement("img");
        portrait.className = "entry-quote-portrait";
        portrait.src = resolveAssetUrl(block.portrait);
        portrait.alt = block.portraitAlt || block.cite || "";
        portrait.loading = "lazy";
        const zoom = zoomButton(portrait, "entry-quote-zoom", block.portrait, portrait.alt);
        if (!portrait.alt) zoom.setAttribute("aria-label", t(currentLang, "a11yZoomImage"));
        portrait.addEventListener("error", () => zoom.remove());
        quote.append(zoom);
      }

      const content = document.createElement("div");
      content.className = "entry-quote-content";
      const text = document.createElement("p");
      text.innerHTML = highlightMatches(formatText(block.text), query);
      content.append(text);
      if (block.cite) {
        const cite = document.createElement("cite");
        cite.textContent = block.cite;
        content.append(cite);
      }
      quote.append(content);
      return quote;
    }

    case "divider": {
      return document.createElement("hr");
    }

    default: {
      const paragraph = document.createElement("p");
      paragraph.innerHTML = highlightMatches(formatText(block.text), query);
      return paragraph;
    }
  }
}

function renderEmptyReader() {
  readerMeta.innerHTML = `<span>${t(currentLang, "introPrompt")}</span><span>${t(currentLang, "statusInitialized")}</span>`;

  const empty = document.createElement("div");
  empty.className = "empty-state";

  const glyph = document.createElement("p");
  glyph.className = "empty-glyph";
  glyph.setAttribute("aria-hidden", "true");
  glyph.textContent = t(currentLang, "emptyGlyph");

  const heading = document.createElement("h2");
  heading.id = "reader-title";
  heading.textContent = t(currentLang, "readyTitle");

  const welcome = document.createElement("p");
  welcome.innerHTML = t(currentLang, "welcomeHtml");

  empty.append(glyph, heading, welcome);
  readerBody.replaceChildren(empty);
}

function renderEntry(entry) {
  const localized = localizeEntry(entry, currentLang);

  readerMeta.innerHTML = `<span>${t(currentLang, "introPrompt")}</span><span>${t(currentLang, "statusActive")}</span>`;

  const content = document.createElement("div");
  content.className = "entry-content";
  const title = document.createElement("h2");
  title.id = "reader-title";
  title.textContent = `${localized.icon || "·"} ${localized.title}`;
  content.append(title, ...localized.blocks.map((block) => renderBlock(block, currentQuery)));
  readerBody.replaceChildren(content);
}

/**
 * Lee el slug actual desde location.hash (formato "#/slug"), decodificándolo.
 * Los navegadores pueden dejar el hash codificado con %XX cuando contiene
 * caracteres no ASCII (como "ñ"), así que hay que revertir esa codificación
 * antes de comparar contra los slugs "en crudo" de content.js.
 */
function getSlugFromHash() {
  // Only "#/slug" names an entry; other hashes (the skip link's "#archivo") are in-page anchors.
  if (!window.location.hash.startsWith("#/")) return null;
  const raw = window.location.hash.slice(2);
  if (!raw) return "";
  try {
    return decodeURIComponent(raw);
  } catch (error) {
    // Si el hash no es una secuencia %XX válida, se usa tal cual.
    return raw;
  }
}

/** Busca en knowledgeBase la entrada cuyo slug coincide con el hash actual. */
function findEntryFromHash() {
  const slug = getSlugFromHash();
  if (!slug) return null;
  return knowledgeBase.find((entry) => entry.slug === slug) || null;
}

function openEntry(entry) {
  // encodeURIComponent asegura que slugs con "ñ" u otros caracteres no ASCII
  // queden codificados de forma consistente y puedan decodificarse después.
  const hash = `#/${encodeURIComponent(entry.slug)}`;
  currentEntry = entry;
  if (window.location.hash === hash) refresh();
  else window.location.hash = hash; // the hashchange listener renders it
}

// Shorter queries only reveal an easter egg when they contain a whole trigger,
// so typing a single letter does not list every secret entry.
const MIN_PARTIAL_TRIGGER_QUERY = 3;

/** Un easter egg solo aparece si el texto buscado coincide (total o parcialmente) con algún trigger. */
function matchesEasterEgg(entry, normalizedQuery) {
  if (!normalizedQuery) return false;
  const triggers = [entry.triggers, ...Object.values(entry.i18n || {}).map((tr) => tr.triggers)].flat().filter(Boolean);
  return triggers.some((trigger) => {
    const normalizedTrigger = normalize(trigger);
    return normalizedQuery.includes(normalizedTrigger) ||
      ([...normalizedQuery].length >= MIN_PARTIAL_TRIGGER_QUERY && normalizedTrigger.includes(normalizedQuery));
  });
}

/** Extrae el texto "buscable" de un bloque, sin importar su tipo. */
function collectBlockText(block) {
  switch (block.type) {
    case "heading":
    case "paragraph":
    case "note":
    case "quote":
      return block.text || "";
    case "list":
      return (block.items || []).join(" ");
    case "links":
      return (block.items || [])
        .map((item) => `${item.label || ""} ${item.description || ""}`)
        .join(" ");
    case "image":
      return `${block.alt || ""} ${block.caption || ""}`;
    case "columns":
      return (block.columns || [])
        .flat()
        .map((subBlock) => collectBlockText(subBlock))
        .join(" ");
    default:
      return block.text || "";
  }
}

/** Comprueba si algún bloque de la entrada contiene la query buscada. */
function entryBlocksMatch(blocks, normalizedQuery) {
  return blocks.some((block) => normalize(collectBlockText(block)).includes(normalizedQuery));
}

function updateEntryCount() {
  const visibleCount = knowledgeBase.filter((entry) => !entry.hidden).length;
  entryCount.textContent = String(visibleCount).padStart(2, "0");
}

function renderIndexList() {
  const normalizedQuery = normalize(currentQuery);
  const catalogued = knowledgeBase.filter((entry) => !entry.hidden);

  const visible = knowledgeBase.filter((entry) => {
    if (entry.hidden) {
      return matchesEasterEgg(entry, normalizedQuery);
    }
    const localized = localizeEntry(entry, currentLang);
    return (
      normalize(localized.title).includes(normalizedQuery) ||
      entryBlocksMatch(localized.blocks, normalizedQuery)
    );
  });

  entryList.replaceChildren();

  if (!catalogued.length) {
    entryList.textContent = `└─ ${t(currentLang, "noActiveEntriesIndex")}`;
    searchStatus.textContent = currentQuery ? t(currentLang, "noRecordsToSearch") : t(currentLang, "waitingRecords");
    return;
  }

  searchStatus.textContent = visible.length
    ? t(currentLang, "matchesFound")(visible.length)
    : t(currentLang, "noMatches");

  visible.forEach((entry) => {
    const localized = localizeEntry(entry, currentLang);
    const button = document.createElement("button");
    button.className = "entry-button";
    button.type = "button";
    button.textContent = `${localized.icon || "·"} ${localized.title}`;
    button.addEventListener("click", () => {
      // On one-column (mobile) layouts the article is below the whole index: bring it into view once rendered.
      scrollToReader = window.matchMedia("(max-width: 700px)").matches;
      openEntry(entry);
    });
    entryList.append(button);
  });
}

function refresh() {
  renderIndexList();
  if (currentEntry) {
    renderEntry(currentEntry);
    if (scrollToReader) readerMeta.scrollIntoView({ block: "start" });
    scrollToReader = false;
  } else {
    renderEmptyReader();
  }
}

searchInput.addEventListener("input", () => {
  currentQuery = searchInput.value.trim();
  refresh();
});

onLanguageChange((lang) => {
  currentLang = lang;
  refresh();
});

// Si el hash cambia (botones atrás/adelante del navegador, o alguien edita
// la URL a mano estando ya en la página), se actualiza la entrada mostrada.
window.addEventListener("hashchange", () => {
  if (getSlugFromHash() === null) return; // in-page anchor: keep the open entry
  currentEntry = findEntryFromHash();
  refresh();
});

// Permite abrir una entrada (incluyendo easter eggs) directamente si alguien
// conoce/comparte su URL exacta con el slug, aunque contenga caracteres como "ñ".
currentEntry = findEntryFromHash();

updateEntryCount();
applyPageTranslations();
refresh();
initializeAds();

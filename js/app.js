import { knowledgeBase, localizeEntry } from "./content.js";
import { initializeAds } from "./ads.js";
import { SUPPORTED_LANGS, DEFAULT_LANG, detectInitialLang, storeLang, t } from "./i18n.js";
import { highlightWords } from "./highlight-config.js";

const searchInput = document.querySelector("#knowledge-search");
const searchStatus = document.querySelector("#search-status");
const entryCount = document.querySelector("#entry-count");
const entryList = document.querySelector("#index-empty");
const readerMeta = document.querySelector("#reader-meta");
const readerBody = document.querySelector("#reader-body");
const skipLink = document.querySelector("#skip-link");
const connectionStatus = document.querySelector("#connection-status");
const introPromptText = document.querySelector("#intro-prompt-text");
const introCopy = document.querySelector("#intro-copy");
const indexHeading = document.querySelector("#index-heading");
const searchLabel = document.querySelector("#search-label");
const footerText = document.querySelector("#footer-text");
const privacyLink = document.querySelector("#privacy-link");
const cookiesLink = document.querySelector("#cookies-link");
const langButtons = document.querySelectorAll(".lang-btn");
const metaDescription = document.querySelector('meta[name="description"]');
const lightbox = document.querySelector("#image-lightbox");
const lightboxImage = document.querySelector("#lightbox-image");
const lightboxClose = document.querySelector("#lightbox-close");

let currentLang = detectInitialLang();
let currentQuery = "";
let currentEntry = null; // entrada base (sin localizar) actualmente abierta, o null

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

// Mapa en minúsculas palabra → color, para poder buscar el color sin importar
// las mayúsculas/minúsculas con las que se escribió la palabra en el artículo.
const highlightWordsByLowerCase = new Map(
  Object.entries(highlightWords).map(([word, color]) => [word.toLowerCase(), color])
);

// Un único patrón con todas las palabras de highlight-config.js, delimitado por
// límites de palabra "manuales" (en vez de \b) para que funcione bien con
// palabras acentuadas y no coincida con partes de palabras más largas.
const highlightWordsPattern = highlightWordsByLowerCase.size
  ? new RegExp(
      `(?<![\\p{L}\\p{N}_])(${[...highlightWordsByLowerCase.keys()]
        .map(escapeRegExp)
        .join("|")})(?![\\p{L}\\p{N}_])`,
      "giu"
    )
  : null;

/** Colorea automáticamente las palabras definidas en js/highlight-config.js. */
function applyWordHighlights(html) {
  if (!highlightWordsPattern) return html;
  return html.replace(highlightWordsPattern, (match) => {
    const color = highlightWordsByLowerCase.get(match.toLowerCase());
    return `<span class="hl-word" style="color: ${color}">${match}</span>`;
  });
}

/** Escapa el texto, colorea palabras clave, convierte **negrita** en <strong> y [texto](url) en enlaces. */
function formatText(text) {
  let html = escapeHtml(text);
  html = applyWordHighlights(html);
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  return html;
}

/** Resalta, como si estuviera pintado con un marcador, las palabras de la búsqueda. */
function highlightMatches(html, rawQuery) {
  const query = rawQuery.trim();
  if (!query) return html;
  const words = query.split(/\s+/).filter(Boolean).map(escapeRegExp);
  if (!words.length) return html;
  const pattern = new RegExp(`(${words.join("|")})`, "gi");
  return html.replace(pattern, '<mark class="hl-marker">$1</mark>');
}

/** Abre la imagen en grande, centrada y a su resolución original (limitada al viewport). */
function openLightbox(src, alt) {
  if (!lightbox || !lightboxImage || !src) return;
  lightboxImage.src = src;
  lightboxImage.alt = alt || "";
  lightbox.hidden = false;
}

function closeLightbox() {
  if (!lightbox || !lightboxImage) return;
  lightbox.hidden = true;
  lightboxImage.src = "";
}

if (lightbox && lightboxImage && lightboxClose) {
  lightboxClose.addEventListener("click", closeLightbox);
  // Cerrar al pulsar fuera de la imagen (sobre el fondo oscurecido).
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) closeLightbox();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !lightbox.hidden) closeLightbox();
  });
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
      img.src = block.src;
      img.alt = block.alt || "";
      img.loading = "lazy";
      if (block.src) {
        img.addEventListener("click", () => openLightbox(block.src, block.alt || ""));
      }
      figure.append(img);
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
      const text = document.createElement("p");
      text.innerHTML = highlightMatches(formatText(block.text), query);
      quote.append(text);
      if (block.cite) {
        const cite = document.createElement("cite");
        cite.textContent = block.cite;
        quote.append(cite);
      }
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
  const raw = window.location.hash.replace(/^#\//, "");
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
  window.location.hash = `/${encodeURIComponent(entry.slug)}`;
  currentEntry = entry;
  refresh();
}

/** Un easter egg solo aparece si el texto buscado coincide (total o parcialmente) con algún trigger. */
function matchesEasterEgg(entry, normalizedQuery) {
  if (!normalizedQuery) return false;
  const triggers = entry.triggers || [];
  return triggers.some((trigger) => {
    const normalizedTrigger = normalize(trigger);
    return normalizedQuery.includes(normalizedTrigger) || normalizedTrigger.includes(normalizedQuery);
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
    button.addEventListener("click", () => openEntry(entry));
    entryList.append(button);
  });
}

function refresh() {
  renderIndexList();
  if (currentEntry) {
    renderEntry(currentEntry);
  } else {
    renderEmptyReader();
  }
}

function applyStaticStrings() {
  document.documentElement.lang = currentLang;
  document.title = t(currentLang, "pageTitle");
  if (metaDescription) metaDescription.setAttribute("content", t(currentLang, "documentDescription"));
  if (skipLink) skipLink.textContent = t(currentLang, "skipLink");
  if (connectionStatus) connectionStatus.textContent = t(currentLang, "onlineStatus");
  if (introPromptText) introPromptText.innerHTML = t(currentLang, "introPrompt");
  if (introCopy) introCopy.innerHTML = t(currentLang, "introCopy");
  if (indexHeading) indexHeading.textContent = t(currentLang, "indexHeading");
  if (searchLabel) searchLabel.textContent = t(currentLang, "searchLabel");
  if (searchInput) searchInput.setAttribute("placeholder", t(currentLang, "searchPlaceholder"));
  if (footerText) footerText.textContent = t(currentLang, "footerText");
  if (privacyLink) privacyLink.textContent = t(currentLang, "privacyLink");
  if (cookiesLink) cookiesLink.textContent = t(currentLang, "cookiesLink");
  langButtons.forEach((btn) => {
    btn.setAttribute("aria-pressed", String(btn.dataset.lang === currentLang));
  });
}

function setLanguage(lang) {
  currentLang = SUPPORTED_LANGS.includes(lang) ? lang : DEFAULT_LANG;
  storeLang(currentLang);
  applyStaticStrings();
  refresh();
}

searchInput.addEventListener("input", () => {
  currentQuery = searchInput.value.trim();
  refresh();
});

langButtons.forEach((btn) => {
  btn.addEventListener("click", () => setLanguage(btn.dataset.lang));
});

// Si el hash cambia (botones atrás/adelante del navegador, o alguien edita
// la URL a mano estando ya en la página), se actualiza la entrada mostrada.
window.addEventListener("hashchange", () => {
  currentEntry = findEntryFromHash();
  refresh();
});

// Permite abrir una entrada (incluyendo easter eggs) directamente si alguien
// conoce/comparte su URL exacta con el slug, aunque contenga caracteres como "ñ".
currentEntry = findEntryFromHash();

updateEntryCount();
setLanguage(currentLang);
initializeAds();

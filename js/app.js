import { knowledgeBase } from "./content.js";
import { initializeAds } from "./ads.js";
import { highlightWords } from "./highlight-config.js";

const searchInput = document.querySelector("#knowledge-search");
const searchStatus = document.querySelector("#search-status");
const entryCount = document.querySelector("#entry-count");
const entryList = document.querySelector("#index-empty");
const reader = document.querySelector(".reader");

entryCount.textContent = String(knowledgeBase.length).padStart(2, "0");

/* ── Resaltado automático de palabras ─────────────────────────────────── */

let highlightRegex;
let highlightLookup;

function buildHighlightIndex() {
  const words = Object.keys(highlightWords || {});
  highlightLookup = new Map(words.map((word) => [word.toLocaleLowerCase("es"), highlightWords[word]]));

  if (!words.length) {
    highlightRegex = null;
    return;
  }

  const escaped = words
    .slice()
    .sort((a, b) => b.length - a.length)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  // Límites de palabra compatibles con acentos: no usamos \b porque \w no
  // incluye letras acentuadas y rompería palabras como "titán".
  highlightRegex = new RegExp(`(?<![\\p{L}\\p{N}_])(${escaped.join("|")})(?![\\p{L}\\p{N}_])`, "giu");
}

buildHighlightIndex();

/** Añade texto plano a un contenedor, coloreando las palabras del diccionario. */
function appendHighlighted(container, text) {
  if (!highlightRegex) {
    container.append(document.createTextNode(text));
    return;
  }

  highlightRegex.lastIndex = 0;
  let lastIndex = 0;
  let match;

  while ((match = highlightRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      container.append(document.createTextNode(text.slice(lastIndex, match.index)));
    }

    const span = document.createElement("span");
    span.className = "highlight-word";
    span.style.color = highlightLookup.get(match[0].toLocaleLowerCase("es")) || "";
    span.textContent = match[0];
    container.append(span);

    lastIndex = highlightRegex.lastIndex;
    if (match.index === highlightRegex.lastIndex) highlightRegex.lastIndex += 1;
  }

  if (lastIndex < text.length) {
    container.append(document.createTextNode(text.slice(lastIndex)));
  }
}

/* ── Formato inline: **negrita** y [texto](url) ───────────────────────── */

const INLINE_PATTERN = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/g;

function tokenizeInline(text) {
  const tokens = [];
  let lastIndex = 0;
  let match;

  INLINE_PATTERN.lastIndex = 0;
  while ((match = INLINE_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }

    if (match[1] !== undefined) {
      tokens.push({ type: "link", content: match[1], href: match[2] });
    } else {
      tokens.push({ type: "bold", content: match[3] });
    }

    lastIndex = INLINE_PATTERN.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: "text", content: text.slice(lastIndex) });
  }

  return tokens;
}

/** Añade texto con formato (negrita/enlaces) y resaltado a un contenedor. */
function appendInline(parent, text) {
  tokenizeInline(text).forEach((token) => {
    if (token.type === "bold") {
      const strong = document.createElement("strong");
      appendHighlighted(strong, token.content);
      parent.append(strong);
    } else if (token.type === "link") {
      const a = document.createElement("a");
      a.href = token.href;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      appendHighlighted(a, token.content);
      parent.append(a);
    } else {
      appendHighlighted(parent, token.content);
    }
  });
}

/* ── Render de bloques ─────────────────────────────────────────────────── */

function renderBlock(block) {
  switch (block.type) {
    case "list": {
      const list = document.createElement("ul");
      list.className = "entry-list";
      block.items.forEach((item) => {
        const listItem = document.createElement("li");
        appendInline(listItem, item);
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
        link.textContent = item.label;
        listItem.append(link);
        if (item.description) {
          const description = document.createElement("span");
          description.className = "entry-links-description";
          appendInline(description, item.description);
          listItem.append(" — ", description);
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
      figure.append(img);
      if (block.caption) {
        const caption = document.createElement("figcaption");
        appendInline(caption, block.caption);
        figure.append(caption);
      }
      return figure;
    }

    case "heading": {
      const heading = document.createElement("h3");
      heading.className = "entry-heading";
      appendInline(heading, block.text);
      return heading;
    }

    case "note": {
      const note = document.createElement("aside");
      note.className = "entry-note";
      appendInline(note, block.text);
      return note;
    }

    case "quote": {
      const quote = document.createElement("blockquote");
      quote.className = "entry-quote";
      const p = document.createElement("p");
      appendInline(p, block.text);
      quote.append(p);
      if (block.cite) {
        const cite = document.createElement("cite");
        cite.textContent = block.cite;
        quote.append(cite);
      }
      return quote;
    }

    case "divider":
      return document.createElement("hr");

    case "paragraph":
    default: {
      const paragraph = document.createElement("p");
      appendInline(paragraph, block.text);
      return paragraph;
    }
  }
}

function renderEntry(entry) {
  reader.replaceChildren();

  const meta = document.createElement("div");
  meta.className = "reader-meta";
  meta.innerHTML = "<span class=\"prompt\"><span aria-hidden=\"true\">›</span> Terminal de conocimiento / Inicio</span><span>SECTOR / STELLARIS</span>";

  const content = document.createElement("div");
  content.className = "entry-content";
  const title = document.createElement("h2");
  title.textContent = `${entry.icon || "·"} ${entry.title}`;
  content.append(title, ...entry.blocks.map(renderBlock));
  reader.append(meta, content);
}

function openEntry(entry) {
  window.location.hash = `/${entry.slug}`;
  renderEntry(entry);
}

/* ── Índice y búsqueda (título + contenido de cada bloque) ────────────── */

/** Extrae todo el texto buscable de una entrada, incluyendo sus bloques. */
function getEntrySearchText(entry) {
  const parts = [entry.title];

  entry.blocks.forEach((block) => {
    switch (block.type) {
      case "paragraph":
      case "heading":
      case "note":
      case "quote":
        parts.push(block.text || "");
        if (block.cite) parts.push(block.cite);
        break;
      case "list":
        parts.push(...(block.items || []));
        break;
      case "links":
        (block.items || []).forEach((item) => {
          parts.push(item.label || "", item.description || "");
        });
        break;
      case "image":
        parts.push(block.alt || "", block.caption || "");
        break;
      default:
        break;
    }
  });

  return parts.join(" ");
}

function renderIndex(query = "") {
  const normalizedQuery = query.toLocaleLowerCase("es");
  const matches = knowledgeBase.filter((entry) => getEntrySearchText(entry).toLocaleLowerCase("es").includes(normalizedQuery));
  entryList.replaceChildren();

  if (!knowledgeBase.length) {
    entryList.textContent = "└─ sin entradas activas";
    searchStatus.textContent = query ? "No hay registros disponibles para buscar todavía." : "Esperando registros del archivo.";
    return;
  }

  searchStatus.textContent = matches.length ? `${matches.length} registro(s) encontrado(s).` : "No hay coincidencias.";
  matches.forEach((entry) => {
    const button = document.createElement("button");
    button.className = "entry-button";
    button.type = "button";
    button.textContent = `${entry.icon || "·"} ${entry.title}`;
    button.addEventListener("click", () => openEntry(entry));
    entryList.append(button);
  });
}

searchInput.addEventListener("input", () => renderIndex(searchInput.value.trim()));

const initialSlug = window.location.hash.replace(/^#\//, "");
const initialEntry = knowledgeBase.find((entry) => entry.slug === initialSlug);
if (initialEntry) renderEntry(initialEntry);
renderIndex();

initializeAds();

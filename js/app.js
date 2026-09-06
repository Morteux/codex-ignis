import { knowledgeBase, localizeEntry } from "./content.js";
import { initializeAds } from "./ads.js";
import { SUPPORTED_LANGS, DEFAULT_LANG, detectInitialLang, storeLang, t } from "./i18n.js";

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

/** Escapa el texto y convierte **negrita** en <strong>. */
function formatText(text) {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
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

function renderBlock(block, query) {
  if (block.type === "list") {
    const list = document.createElement("ul");
    list.className = "entry-list";
    block.items.forEach((item) => {
      const listItem = document.createElement("li");
      listItem.innerHTML = highlightMatches(formatText(item), query);
      list.append(listItem);
    });
    return list;
  }

  const paragraph = document.createElement("p");
  paragraph.innerHTML = highlightMatches(formatText(block.text), query);
  return paragraph;
}

function renderEmptyReader() {
  readerMeta.innerHTML = `<span>${t(currentLang, "sectorLabel")}</span><span>${t(currentLang, "statusInitialized")}</span>`;

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

  readerMeta.innerHTML = `<span>${t(currentLang, "sectorLabel")}</span><span>${t(currentLang, "statusActive")}</span>`;

  const content = document.createElement("div");
  content.className = "entry-content";
  const title = document.createElement("h2");
  title.id = "reader-title";
  title.textContent = `${localized.icon || "·"} ${localized.title}`;
  content.append(title, ...localized.blocks.map((block) => renderBlock(block, currentQuery)));
  readerBody.replaceChildren(content);
}

function openEntry(entry) {
  window.location.hash = `/${entry.slug}`;
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
    return normalize(localized.title).includes(normalizedQuery);
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
  skipLink.textContent = t(currentLang, "skipLink");
  connectionStatus.textContent = t(currentLang, "onlineStatus");
  introPromptText.textContent = t(currentLang, "introPrompt");
  introCopy.textContent = t(currentLang, "introCopy");
  indexHeading.textContent = t(currentLang, "indexHeading");
  searchLabel.textContent = t(currentLang, "searchLabel");
  searchInput.setAttribute("placeholder", t(currentLang, "searchPlaceholder"));
  footerText.textContent = t(currentLang, "footerText");
  privacyLink.textContent = t(currentLang, "privacyLink");
  cookiesLink.textContent = t(currentLang, "cookiesLink");
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

// Permite abrir un easter egg directamente si alguien conoce/comparte su URL exacta.
const initialSlug = window.location.hash.replace(/^#\//, "");
currentEntry = knowledgeBase.find((entry) => entry.slug === initialSlug) || null;

updateEntryCount();
setLanguage(currentLang);
initializeAds();
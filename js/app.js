import { knowledgeBase } from "./content.js";
import { initializeAds } from "./ads.js";

const searchInput = document.querySelector("#knowledge-search");
const searchStatus = document.querySelector("#search-status");
const entryCount = document.querySelector("#entry-count");
const entryList = document.querySelector("#index-empty");
const reader = document.querySelector(".reader");

entryCount.textContent = String(knowledgeBase.length).padStart(2, "0");

function renderBlock(block) {
  if (block.type === "list") {
    const list = document.createElement("ul");
    list.className = "entry-list";
    block.items.forEach((item) => {
      const listItem = document.createElement("li");
      listItem.textContent = item;
      list.append(listItem);
    });
    return list;
  }

  const paragraph = document.createElement("p");
  paragraph.textContent = block.text;
  return paragraph;
}

function renderEntry(entry) {
  reader.replaceChildren();

  const meta = document.createElement("div");
  meta.className = "reader-meta";
  meta.innerHTML = "<span>SECTOR / STELLARIS</span><span>REGISTRO / ACTIVO</span>";

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

function renderIndex(query = "") {
  const normalizedQuery = query.toLocaleLowerCase("es");
  const matches = knowledgeBase.filter((entry) => entry.title.toLocaleLowerCase("es").includes(normalizedQuery));
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

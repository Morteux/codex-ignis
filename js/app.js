import { knowledgeBase } from "./content.js";
import { initializeAds } from "./ads.js";

const searchInput = document.querySelector("#knowledge-search");
const searchStatus = document.querySelector("#search-status");
const entryCount = document.querySelector("#entry-count");

entryCount.textContent = String(knowledgeBase.length).padStart(2, "0");

searchInput.addEventListener("input", () => {
  const query = searchInput.value.trim();
  if (!knowledgeBase.length) {
    searchStatus.textContent = query
      ? "No hay registros disponibles para buscar todavía."
      : "Esperando registros del archivo.";
  }
});

initializeAds();

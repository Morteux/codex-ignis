/**
 * Search and filters of the tech tree (T3203, TECH_TREE_GDD.md section 6).
 *
 * - Search by name, accent-insensitive and case-insensitive ("energia" finds "Energía"); every
 *   word must appear in the technology name, a variant name or the game id.
 * - Filters: area, field (only the fields of the chosen area), tier, kind and DLC ("base game" =
 *   no DLC).
 * The tree keeps its layout: the technologies that do not match are dimmed (`is-filtered-out`)
 * and those that match the search are outlined (`is-match`). A results line counts them and a
 * short list of matches (buttons) selects and shows one.
 */
import { t } from "./i18n.js";
import { KIND_KEYS, gameNameSpan } from "./tech-tree-layout.js";
import { areaName } from "./tech-tree-card.js";

/** Matches listed under the filters (the tree shows all of them). */
export const RESULT_LIMIT = 30;

/** Lower case without accents or diacritics ("Énergie" → "energie"). */
export function foldText(text) {
  return String(text || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Technologies of `data` that pass `filters` ({query, area, field, tier, kind, dlc}). */
export function filterTechnologies(data, filters) {
  const words = foldText(filters.query).split(/\s+/).filter(Boolean);
  return data.technologies.filter((tech) => {
    if (filters.area && tech.area !== filters.area) return false;
    if (filters.field && tech.field !== filters.field) return false;
    if (filters.tier !== "" && filters.tier !== undefined && tech.tier !== Number(filters.tier)) return false;
    if (filters.kind && tech.kind !== filters.kind) return false;
    if (filters.dlc === "base" && tech.dlc.length) return false;
    if (filters.dlc && filters.dlc !== "base" && !tech.dlc.includes(filters.dlc)) return false;
    if (!words.length) return true;
    const haystack = foldText([tech.name, tech.id, ...tech.variants.map((variant) => variant.name)].join(" "));
    return words.every((word) => haystack.includes(word));
  });
}

const EMPTY = { query: "", area: "", field: "", tier: "", kind: "", dlc: "" };

/**
 * Builds the search form in `container` and applies it to the nodes under `root`.
 * `onPick(id)` is called when a result is chosen. Returns `{ relabel(), state(), set(partial) }`.
 */
export function createSearch(container, root, data, getLang, { onPick, onAreaFilter }) {
  const state = { ...EMPTY };
  let currentIds = null;
  const kinds = Object.keys(KIND_KEYS).filter((kind) => data.technologies.some((tech) => tech.kind === kind));
  const dlcs = [...new Set(data.technologies.flatMap((tech) => tech.dlc))].sort((a, b) => a.localeCompare(b, "en"));
  const tiers = data.tiers.map((entry) => entry.tier).sort((a, b) => a - b);

  const form = document.createElement("form");
  form.className = "tech-filters";
  form.setAttribute("role", "search");
  form.addEventListener("submit", (event) => event.preventDefault());

  const field = (name, control) => {
    const label = document.createElement("label");
    label.className = "tech-filter tech-filter--" + name;
    const text = document.createElement("span");
    text.className = "tech-filter-label";
    label.append(text, control);
    return { label, text, control };
  };
  const search = document.createElement("input");
  search.type = "search";
  search.id = "tech-search";
  search.autocomplete = "off";
  search.spellcheck = false;
  const selects = {};
  ["area", "field", "tier", "kind", "dlc"].forEach((name) => {
    const select = document.createElement("select");
    select.id = "tech-filter-" + name;
    select.dataset.filter = name;
    selects[name] = select;
  });
  const controls = {
    query: field("query", search),
    area: field("area", selects.area),
    field: field("field", selects.field),
    tier: field("tier", selects.tier),
    kind: field("kind", selects.kind),
    dlc: field("dlc", selects.dlc),
  };
  const reset = document.createElement("button");
  reset.type = "button";
  reset.className = "tech-filter-reset";
  const count = document.createElement("p");
  count.className = "tech-filter-count";
  count.id = "tech-filter-count";
  count.setAttribute("role", "status");
  count.setAttribute("aria-live", "polite");
  const results = document.createElement("ul");
  results.className = "tech-filter-results";
  results.id = "tech-filter-results";
  const row = document.createElement("div");
  row.className = "tech-filter-row";
  row.append(...Object.values(controls).map((entry) => entry.label), reset);
  form.append(row, count, results);
  container.replaceChildren(form);

  function option(value, text, gameName = false) {
    const node = document.createElement("option");
    node.value = value;
    node.textContent = text;
    if (gameName) node.lang = "en";
    return node;
  }

  function fillOptions(lang) {
    const all = t(lang, "techTreeFilterAll");
    selects.area.replaceChildren(option("", all), ...data.areas.map((area) => option(area, areaName(area), true)));
    const fields = data.fields.filter((entry) => !state.area || entry.area === state.area);
    if (state.field && !fields.some((entry) => entry.id === state.field)) state.field = "";
    selects.field.replaceChildren(option("", all), ...fields.map((entry) => option(entry.id, entry.name, true)));
    selects.tier.replaceChildren(option("", all), ...tiers.map((tier) => option(String(tier), t(lang, "techTreeTier").replace("{tier}", tier))));
    selects.kind.replaceChildren(option("", all), ...kinds.map((kind) => option(kind, t(lang, KIND_KEYS[kind]))));
    selects.dlc.replaceChildren(option("", all), option("base", t(lang, "techTreeBaseGame")), ...dlcs.map((dlc) => option(dlc, dlc, true)));
    Object.entries(selects).forEach(([name, select]) => { select.value = state[name]; });
  }

  function relabel() {
    const lang = getLang();
    form.setAttribute("aria-label", t(lang, "techTreeFiltersLabel"));
    controls.query.text.textContent = t(lang, "techTreeSearchLabel");
    search.placeholder = t(lang, "techTreeSearchPlaceholder");
    controls.area.text.textContent = t(lang, "techTreeFilterArea");
    controls.field.text.textContent = t(lang, "techTreeFilterField");
    controls.tier.text.textContent = t(lang, "techTreeFilterTier");
    controls.kind.text.textContent = t(lang, "techTreeFilterKind");
    controls.dlc.text.textContent = t(lang, "techTreeDlc");
    reset.textContent = t(lang, "techTreeFilterReset");
    results.setAttribute("aria-label", t(lang, "techTreeFilterResults"));
    fillOptions(lang);
    apply();
  }

  /** Lines dimmed unless both ends match; also after every redraw (new path elements). */
  function paintLines() {
    root.querySelectorAll(".tech-line").forEach((line) => {
      line.classList.toggle("is-filtered-out", Boolean(currentIds) && !(currentIds.has(line.dataset.from) && currentIds.has(line.dataset.to)));
    });
  }

  function apply() {
    const lang = getLang();
    const active = Object.keys(EMPTY).some((key) => state[key] !== "");
    const matches = active ? filterTechnologies(data, state) : [];
    const ids = new Set(matches.map((tech) => tech.id));
    root.classList.toggle("has-filter", active);
    root.querySelectorAll(".tech-node").forEach((node) => {
      node.classList.toggle("is-filtered-out", active && !ids.has(node.dataset.techId));
      node.classList.toggle("is-match", active && Boolean(state.query.trim()) && ids.has(node.dataset.techId));
    });
    currentIds = active ? ids : null;
    paintLines();
    reset.disabled = !active;
    count.textContent = !active ? "" : matches.length
      ? t(lang, "techTreeFilterCount").replace("{count}", matches.length).replace("{total}", data.technologies.length)
      : t(lang, "techTreeFilterNone");
    const shown = matches.slice().sort((a, b) => a.name.localeCompare(b.name, "en")).slice(0, RESULT_LIMIT);
    results.replaceChildren(...shown.map((tech) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "tech-card-link tech-node--" + tech.kind;
      button.dataset.techId = tech.id;
      button.append(gameNameSpan(tech.name));
      const meta = document.createElement("span");
      meta.className = "tech-card-link-meta";
      meta.textContent = t(lang, "techTreeTier").replace("{tier}", tech.tier) + " · " + areaName(tech.area);
      button.append(meta);
      button.addEventListener("click", () => onPick(tech.id));
      item.append(button);
      return item;
    }));
    if (matches.length > RESULT_LIMIT) {
      const more = document.createElement("li");
      more.className = "tech-filter-more";
      more.textContent = t(lang, "techTreeFilterMore").replace("{count}", matches.length - RESULT_LIMIT);
      results.append(more);
    }
    results.hidden = !active;
  }

  search.addEventListener("input", () => {
    state.query = search.value;
    apply();
  });
  Object.entries(selects).forEach(([name, select]) => select.addEventListener("change", () => {
    state[name] = select.value;
    if (name === "area") {
      fillOptions(getLang());
      if (state.area) onAreaFilter(state.area);
    }
    apply();
  }));
  reset.addEventListener("click", () => {
    Object.assign(state, EMPTY);
    search.value = "";
    fillOptions(getLang());
    apply();
    search.focus();
  });
  // the lines are new elements after every redraw
  root.addEventListener("tech-lines-drawn", paintLines);

  relabel();
  return { relabel, apply, state: () => ({ ...state }) };
}

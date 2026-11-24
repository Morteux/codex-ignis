/**
 * Comparison between two data versions of the tech tree (T3303, TECH_TREE_GDD.md section 5).
 *
 * `compareTechData(from, to)` is pure: technologies added (only in `to`), removed (only in
 * `from`) and changed (same id, different base cost, tier or prerequisites; other fields such as
 * the description are not reported). `createCompare` draws the section of the page: two version
 * selectors (from, to) and a Compare button; the other data file is loaded only when asked.
 * Every technology links to its node in the version where it exists (`?version=<id>#<tech id>`).
 * Game names stay in English (GDD §4.3); the labels are translated.
 */
import { t } from "./i18n.js";
import { TECH_VERSIONS, loadTechData, versionUrl } from "./tech-versions.js";
import { areaName } from "./tech-tree-card.js";

const byName = (a, b) => a.name.localeCompare(b.name, "en") || a.id.localeCompare(b.id);

/** Differences from `from` to `to`: { added, removed, changed } sorted by name. */
export function compareTechData(from, to) {
  const before = new Map(from.technologies.map((tech) => [tech.id, tech]));
  const after = new Map(to.technologies.map((tech) => [tech.id, tech]));
  const added = to.technologies.filter((tech) => !before.has(tech.id)).sort(byName);
  const removed = from.technologies.filter((tech) => !after.has(tech.id)).sort(byName);
  const changed = [];
  for (const tech of to.technologies) {
    const old = before.get(tech.id);
    if (!old) continue;
    const change = { id: tech.id, name: tech.name, area: tech.area, tech };
    if ((old.baseCost ?? null) !== (tech.baseCost ?? null)) change.cost = { from: old.baseCost ?? null, to: tech.baseCost ?? null };
    if (old.tier !== tech.tier) change.tier = { from: old.tier, to: tech.tier };
    const oldPre = new Set(old.prerequisites || []);
    const newPre = new Set(tech.prerequisites || []);
    const plus = [...newPre].filter((id) => !oldPre.has(id)).sort();
    const minus = [...oldPre].filter((id) => !newPre.has(id)).sort();
    if (plus.length || minus.length) change.prerequisites = { added: plus, removed: minus };
    if (change.cost || change.tier || change.prerequisites) changed.push(change);
  }
  changed.sort(byName);
  return { added, removed, changed };
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

/** Link to the node of `id` in the tree of version `versionId`. */
function techLink(versionId, id, name) {
  const url = new URL(versionUrl(window.location.href, versionId));
  url.hash = id;
  const link = el("a", "tech-compare-link", name);
  link.href = url.href;
  link.dataset.techId = id;
  link.dataset.version = versionId;
  return link;
}

const costText = (value) => (value === null ? "—" : String(value));

/**
 * Draws the comparison in `container`. `shown` is the version the page shows and `shownData` its
 * already loaded data (reused instead of loading the file again).
 */
export function createCompare(container, shown, shownData, getLang) {
  const cache = new Map([[shown.id, Promise.resolve(shownData)]]);
  const load = (version) => {
    if (!cache.has(version.id)) cache.set(version.id, loadTechData(version));
    return cache.get(version.id);
  };
  const others = TECH_VERSIONS.filter((version) => version.id !== shown.id);
  // default: from the version just older than the shown one (the list is newest first) to the shown one
  const shownIndex = TECH_VERSIONS.indexOf(shown);
  const older = TECH_VERSIONS.slice(shownIndex + 1)[0] || others[0] || shown;

  const intro = el("p", "tech-compare-intro");
  const controls = el("div", "tech-compare-controls");
  const result = el("div", "tech-compare-result");
  result.setAttribute("role", "status");
  result.setAttribute("aria-live", "polite");
  container.replaceChildren(intro, controls, result);

  const selects = {};
  const labels = {};
  for (const [key, initial] of [["from", older], ["to", shown]]) {
    const id = "tech-compare-" + key;
    labels[key] = el("label");
    labels[key].htmlFor = id;
    selects[key] = el("select", "tech-version-select tech-compare-select");
    selects[key].id = id;
    selects[key].append(...TECH_VERSIONS.map((version) => {
      const option = el("option", null, version.label);
      option.value = version.id;
      option.selected = version.id === initial.id;
      return option;
    }));
    const field = el("span", "tech-compare-field");
    field.append(labels[key], selects[key]);
    controls.append(field);
  }
  const button = el("button", "tech-compare-run");
  button.type = "button";
  controls.append(button);

  let last = null; // { kind: "diff", from, to, diff } | { kind: "same" } | { kind: "loading" } | { kind: "error", id }
  let run = 0;

  function renderList(lang, key, items, versionId, describe) {
    const block = el("section", "tech-compare-group");
    block.dataset.group = key;
    block.append(el("h3", "tech-compare-group-heading", t(lang, "techTreeCompare" + key[0].toUpperCase() + key.slice(1)) + " (" + items.length + ")"));
    if (!items.length) {
      block.append(el("p", "tech-compare-empty", t(lang, "techTreeCompareNone")));
      return block;
    }
    const list = el("ul", "tech-compare-list");
    list.append(...items.map((item) => {
      const row = el("li", "tech-compare-item");
      row.dataset.techId = item.id;
      row.append(techLink(versionId, item.id, item.name), " ", el("code", "tech-compare-id", item.id));
      row.append(...describe(item));
      return row;
    }));
    block.append(list);
    return block;
  }

  function render() {
    const lang = getLang();
    intro.textContent = t(lang, "techTreeCompareIntro");
    labels.from.textContent = t(lang, "techTreeCompareFrom");
    labels.to.textContent = t(lang, "techTreeCompareTo");
    button.textContent = t(lang, "techTreeCompareRun");
    if (TECH_VERSIONS.length < 2) {
      controls.hidden = true;
      result.replaceChildren(el("p", "tech-compare-note", t(lang, "techTreeCompareSingle").replace("{version}", shown.label)));
      return;
    }
    if (!last) return result.replaceChildren();
    if (last.kind === "same") return result.replaceChildren(el("p", "tech-compare-note", t(lang, "techTreeCompareSame")));
    if (last.kind === "loading") return result.replaceChildren(el("p", "tech-compare-note", t(lang, "techTreeCompareLoading")));
    if (last.kind === "error") return result.replaceChildren(el("p", "tech-compare-note", t(lang, "techTreeCompareError").replace("{id}", last.id)));
    const { from, to, diff } = last;
    const summary = el("p", "tech-compare-summary", t(lang, "techTreeCompareSummary")
      .replace("{from}", from.label).replace("{to}", to.label)
      .replace("{added}", diff.added.length).replace("{removed}", diff.removed.length).replace("{changed}", diff.changed.length));
    const meta = (tech) => [el("span", "tech-compare-meta", areaName(tech.area) + " · " + t(lang, "techTreeTier").replace("{tier}", tech.tier))];
    const names = (data, ids) => ids.map((id) => (data.technologies.find((tech) => tech.id === id) || { name: id }).name).join(", ");
    const describeChange = (change) => {
      const lines = el("ul", "tech-compare-changes");
      const line = (key, text) => {
        const item = el("li", null, text);
        item.dataset.change = key;
        lines.append(item);
      };
      if (change.cost) line("cost", t(lang, "techTreeCompareCost").replace("{from}", costText(change.cost.from)).replace("{to}", costText(change.cost.to)));
      if (change.tier) line("tier", t(lang, "techTreeCompareTierChange").replace("{from}", change.tier.from).replace("{to}", change.tier.to));
      if (change.prerequisites) {
        const parts = [];
        if (change.prerequisites.added.length) parts.push("+ " + names(last.toData, change.prerequisites.added));
        if (change.prerequisites.removed.length) parts.push("− " + names(last.fromData, change.prerequisites.removed));
        line("prerequisites", t(lang, "techTreeComparePrerequisites").replace("{changes}", parts.join("; ")));
      }
      return [lines];
    };
    result.replaceChildren(summary,
      renderList(lang, "added", diff.added, to.id, meta),
      renderList(lang, "removed", diff.removed, from.id, meta),
      renderList(lang, "changed", diff.changed, to.id, describeChange));
  }

  async function compare() {
    const from = TECH_VERSIONS.find((version) => version.id === selects.from.value);
    const to = TECH_VERSIONS.find((version) => version.id === selects.to.value);
    const ticket = ++run;
    if (from === to) {
      last = { kind: "same" };
      return render();
    }
    last = { kind: "loading" };
    render();
    let fromData, toData;
    try {
      fromData = await load(from);
    } catch {
      cache.delete(from.id);
      last = { kind: "error", id: from.id };
    }
    try {
      if (fromData) toData = await load(to);
    } catch {
      cache.delete(to.id);
      last = { kind: "error", id: to.id };
    }
    if (ticket !== run) return;
    if (fromData && toData) last = { kind: "diff", from, to, fromData, toData, diff: compareTechData(fromData, toData) };
    render();
  }

  button.addEventListener("click", compare);
  render();
  return { relabel: render, compare };
}

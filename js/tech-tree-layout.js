/**
 * Layout of the tech tree (T3102, TECH_TREE_GDD.md section 6): inside each area, one column per
 * tier and one row per field. Every cell holds the nodes of that field and tier, sorted by name.
 *
 * A node is a button with the reserved icon slot (js/tech-tree-icons.js), the technology name
 * (English, a game name) and a translated line with its tier and kind. Only the data file drives
 * the layout: areas, fields and tiers come from TECH_DATA, never from a hand-written list.
 */
import { t } from "./i18n.js";
import { createTechIconSlot } from "./tech-tree-icons.js";

/** i18n key of each node kind (`kind` of the data file, GDD §4.3). */
export const KIND_KEYS = {
  normal: "techTreeKindNormal",
  starter: "techTreeKindStarter",
  acquisition: "techTreeKindAcquisition",
  rare: "techTreeKindRare",
  dangerous: "techTreeKindDangerous",
  repeatable: "techTreeKindRepeatable",
  event: "techTreeKindEvent",
};

/** "Tier 2 · Rare" in the current language. */
export function nodeMetaText(tech, lang) {
  return t(lang, "techTreeTier").replace("{tier}", tech.tier) + " · " + t(lang, KIND_KEYS[tech.kind] || KIND_KEYS.normal);
}

function createNode(tech, lang) {
  const node = document.createElement("button");
  node.type = "button";
  node.className = `tech-node tech-node--${tech.kind}`;
  node.dataset.techId = tech.id;
  node.dataset.kind = tech.kind;
  node.dataset.tier = tech.tier;
  node.setAttribute("aria-pressed", "false");
  const text = document.createElement("span");
  text.className = "tech-node-text";
  const name = document.createElement("span");
  name.className = "tech-node-name";
  name.textContent = tech.name;
  const meta = document.createElement("span");
  meta.className = "tech-node-meta";
  meta.textContent = nodeMetaText(tech, lang);
  text.append(name, meta);
  node.append(createTechIconSlot(tech, "node"), text);
  return node;
}

/**
 * Fills `container` with the grid of `area`: a header row with the tiers, then one row per field
 * of the area (in the data file's order). Returns a Map id → node element.
 */
export function renderAreaGrid(container, data, area, lang) {
  const tiers = data.tiers.map((entry) => entry.tier).sort((a, b) => a - b);
  const fields = data.fields.filter((field) => field.area === area);
  const techs = data.technologies.filter((tech) => tech.area === area);
  const nodes = new Map();

  const grid = document.createElement("div");
  grid.className = "tech-grid";
  grid.dataset.area = area;
  grid.style.setProperty("--tech-tiers", tiers.length);

  const corner = document.createElement("div");
  corner.className = "tech-grid-corner";
  grid.append(corner);
  tiers.forEach((tier, index) => {
    const head = document.createElement("div");
    head.className = "tech-tier-head";
    head.dataset.tier = tier;
    head.style.gridColumn = index + 2;
    head.textContent = t(lang, "techTreeTier").replace("{tier}", tier);
    grid.append(head);
  });

  fields.forEach((field, row) => {
    const label = document.createElement("div");
    label.className = "tech-field-label";
    label.dataset.field = field.id;
    label.style.gridRow = row + 2;
    label.textContent = field.name;
    grid.append(label);
    tiers.forEach((tier, column) => {
      const cell = document.createElement("div");
      cell.className = "tech-cell";
      cell.dataset.field = field.id;
      cell.dataset.tier = tier;
      cell.style.gridRow = row + 2;
      cell.style.gridColumn = column + 2;
      techs.filter((tech) => tech.field === field.id && tech.tier === tier)
        .sort((a, b) => a.name.localeCompare(b.name, "en"))
        .forEach((tech) => {
          const node = createNode(tech, lang);
          nodes.set(tech.id, node);
          cell.append(node);
        });
      grid.append(cell);
    });
  });

  container.replaceChildren(grid);
  return nodes;
}

/** Translates the tier headers and node lines of every grid after a language change. */
export function relabelGrids(root, data, lang) {
  const byId = new Map(data.technologies.map((tech) => [tech.id, tech]));
  root.querySelectorAll(".tech-tier-head").forEach((head) => {
    head.textContent = t(lang, "techTreeTier").replace("{tier}", head.dataset.tier);
  });
  root.querySelectorAll(".tech-node").forEach((node) => {
    node.querySelector(".tech-node-meta").textContent = nodeMetaText(byId.get(node.dataset.techId), lang);
  });
}

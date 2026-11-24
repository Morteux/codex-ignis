/**
 * Keyboard navigation and screen-reader descriptions of the tech tree nodes (T3403,
 * TECH_TREE_GDD.md section 6).
 *
 * - One Tab stop per area (roving tabindex): only the last focused node of each area grid is in the
 *   Tab order (at first, its first node); Tab leaves the tree instead of crossing 679 buttons.
 * - Inside a grid: ← → move to the nearest node of the previous / next tier (skipping empty tiers),
 *   ↑ ↓ to the previous / next node of the same tier column (across fields), Home / End to the
 *   first / last node of the area. Enter or Space selects (the node is a button). The focused
 *   node is scrolled into view. The panel itself keeps its arrow keys for panning (T3204).
 * - Every node is described by its field (the row label) and, while something is selected, by
 *   its state (selected / prerequisite chain / depends on the selected), through
 *   `aria-describedby` to hidden texts that follow the language.
 */
import { t } from "./i18n.js";

const STATE_TEXTS = [
  ["is-selected", "tech-sr-state-selected", "techTreeStateSelected"],
  ["is-prerequisite", "tech-sr-state-prerequisite", "techTreeStatePrerequisite"],
  ["is-unlocked", "tech-sr-state-unlocked", "techTreeStateUnlocked"],
];

export function createKeyboard(root, getLang) {
  const grids = [...root.querySelectorAll(".tech-grid")];

  // hidden texts of the states, referenced by aria-describedby
  const texts = document.createElement("div");
  texts.hidden = true;
  texts.className = "tech-sr-texts";
  STATE_TEXTS.forEach(([, id]) => {
    const span = document.createElement("span");
    span.id = id;
    texts.append(span);
  });
  root.append(texts);

  /** Field label ids, so every node can be described by its row. */
  grids.forEach((grid) => {
    grid.querySelectorAll(".tech-field-label").forEach((label) => {
      label.id = `tech-field-${grid.dataset.area}-${label.dataset.field}`;
    });
    const nodes = [...grid.querySelectorAll(".tech-node")];
    nodes.forEach((node, index) => {
      node.tabIndex = index === 0 ? 0 : -1;
    });
  });

  function describe() {
    root.querySelectorAll(".tech-node").forEach((node) => {
      const grid = node.closest(".tech-grid");
      const cell = node.closest(".tech-cell");
      const ids = [`tech-field-${grid.dataset.area}-${cell.dataset.field}`];
      STATE_TEXTS.forEach(([className, id]) => {
        if (node.classList.contains(className)) ids.push(id);
      });
      node.setAttribute("aria-describedby", ids.join(" "));
    });
  }

  function relabel() {
    const lang = getLang();
    STATE_TEXTS.forEach(([, id, key]) => {
      document.getElementById(id).textContent = t(lang, key);
    });
  }

  /** Makes `node` the Tab stop of its area. */
  function makeCurrent(node) {
    const grid = node.closest(".tech-grid");
    grid.querySelectorAll('.tech-node[tabindex="0"]').forEach((other) => {
      if (other !== node) other.tabIndex = -1;
    });
    node.tabIndex = 0;
  }

  /** Nodes of a grid grouped by tier column, each column in visual order (field rows, then cell order). */
  function columns(grid) {
    const byTier = new Map();
    grid.querySelectorAll(".tech-node").forEach((node) => {
      const tier = Number(node.dataset.tier);
      if (!byTier.has(tier)) byTier.set(tier, []);
      byTier.get(tier).push(node);
    });
    const top = (node) => node.getBoundingClientRect().top;
    return [...byTier.keys()].sort((a, b) => a - b).map((tier) => byTier.get(tier).sort((a, b) => top(a) - top(b)));
  }

  function target(node, key) {
    const grid = node.closest(".tech-grid");
    if (key === "Home" || key === "End") {
      const all = columns(grid).flat();
      return key === "Home" ? all[0] : all[all.length - 1];
    }
    const cols = columns(grid);
    const col = cols.findIndex((list) => list.includes(node));
    const row = cols[col].indexOf(node);
    if (key === "ArrowUp") return cols[col][row - 1];
    if (key === "ArrowDown") return cols[col][row + 1];
    const next = cols[col + (key === "ArrowRight" ? 1 : -1)];
    if (!next) return null;
    // nearest node of that column to the vertical centre of this one
    const centre = (el) => { const box = el.getBoundingClientRect(); return box.top + box.height / 2; };
    const y = centre(node);
    return next.reduce((best, candidate) => (Math.abs(centre(candidate) - y) < Math.abs(centre(best) - y) ? candidate : best));
  }

  root.addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    const node = event.target.closest && event.target.closest(".tech-node");
    if (!node || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = target(node, event.key);
    if (!next) return;
    makeCurrent(next);
    next.focus({ preventScroll: true });
    next.scrollIntoView({ block: "nearest", inline: "nearest" });
  });
  root.addEventListener("focusin", (event) => {
    const node = event.target.closest && event.target.closest(".tech-node");
    if (node) makeCurrent(node);
  });

  relabel();
  describe();
  return {
    relabel,
    /** After a selection change: new descriptions, and the selected node becomes its area's Tab stop. */
    update(selectedId) {
      describe();
      const node = selectedId && root.querySelector(`.tech-node[data-tech-id="${selectedId}"]`);
      if (node) makeCurrent(node);
    },
  };
}

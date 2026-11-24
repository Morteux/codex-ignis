/**
 * Visual states of the tech tree (T3104, TECH_TREE_GDD.md section 6).
 *
 * - normal: every node, with the colour of its kind (left border, styles.css section 10);
 * - selected: the clicked node (`is-selected`, aria-pressed="true"); a second click or Escape
 *   clears it;
 * - prerequisite chain (T3202): every technology needed before the selected one, directly or
 *   through other prerequisites (`is-prerequisite`), and the lines inside that chain;
 * - dependents (T3202): every technology that needs the selected one, directly or through others
 *   (`is-unlocked`), and the lines inside that chain.
 * The direct ones (one step away) also get `is-direct`, drawn stronger. Chains cross areas.
 * While something is selected the tree gets `has-selection` and the other nodes are dimmed.
 * A live region says what is selected, for screen readers and as a text summary.
 */
import { t } from "./i18n.js";

const STATE_CLASSES = ["is-selected", "is-prerequisite", "is-unlocked", "is-direct"];

export function createSelection(root, data, status, getLang, onChange = () => {}) {
  const byId = new Map(data.technologies.map((tech) => [tech.id, tech]));
  const dependents = new Map();
  data.technologies.forEach((tech) => tech.prerequisites.forEach((id) => {
    if (!dependents.has(id)) dependents.set(id, []);
    dependents.get(id).push(tech.id);
  }));
  let selected = null;
  let ancestors = new Set();
  let descendants = new Set();

  /** Every id reachable from `id` through `next` (the data file has no cycles, T3002). */
  function closure(id, next) {
    const seen = new Set();
    const stack = [...next(id)];
    while (stack.length) {
      const current = stack.pop();
      if (seen.has(current)) continue;
      seen.add(current);
      stack.push(...next(current));
    }
    return seen;
  }
  const prerequisitesOf = (id) => (byId.get(id) ? byId.get(id).prerequisites : []);
  const dependentsOf = (id) => dependents.get(id) || [];

  const nodesOf = (ids) => ids.map((id) => root.querySelector(`.tech-node[data-tech-id="${id}"]`)).filter(Boolean);

  /** Classes of the lines; also called after every redraw (the paths are new elements). */
  function paintLines() {
    root.querySelectorAll(".tech-line").forEach((line) => {
      const { from, to } = line.dataset;
      line.classList.toggle("is-prerequisite", Boolean(selected) && ancestors.has(from) && (to === selected || ancestors.has(to)));
      line.classList.toggle("is-unlocked", Boolean(selected) && descendants.has(to) && (from === selected || descendants.has(from)));
    });
  }

  function announce() {
    const lang = getLang();
    if (!selected) {
      status.textContent = "";
      return;
    }
    status.textContent = t(lang, "techTreeSelectionStatus")
      .replace("{name}", byId.get(selected).name)
      .replace("{prerequisites}", ancestors.size)
      .replace("{unlocked}", descendants.size);
  }

  function select(id) {
    selected = id && byId.has(id) && id !== selected ? id : null;
    root.querySelectorAll(STATE_CLASSES.map((name) => "." + name).join(",")).forEach((node) => node.classList.remove(...STATE_CLASSES));
    root.querySelectorAll('.tech-node[aria-pressed="true"]').forEach((node) => node.setAttribute("aria-pressed", "false"));
    root.classList.toggle("has-selection", Boolean(selected));
    ancestors = selected ? closure(selected, prerequisitesOf) : new Set();
    descendants = selected ? closure(selected, dependentsOf) : new Set();
    if (selected) {
      nodesOf([...ancestors]).forEach((node) => node.classList.add("is-prerequisite"));
      nodesOf([...descendants]).forEach((node) => node.classList.add("is-unlocked"));
      nodesOf([...prerequisitesOf(selected), ...dependentsOf(selected)]).forEach((node) => node.classList.add("is-direct"));
      const node = nodesOf([selected])[0];
      node.classList.add("is-selected");
      node.setAttribute("aria-pressed", "true");
    }
    paintLines();
    announce();
    onChange(selected);
  }

  root.addEventListener("click", (event) => {
    const node = event.target.closest(".tech-node");
    if (node) select(node.dataset.techId);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && selected) select(null);
  });
  root.addEventListener("tech-lines-drawn", paintLines);

  return { select, selected: () => selected, announce, chain: () => ({ ancestors: [...ancestors], descendants: [...descendants] }) };
}

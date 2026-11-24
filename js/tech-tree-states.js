/**
 * Visual states of the tech tree (T3104, TECH_TREE_GDD.md section 6).
 *
 * - normal: every node, with the colour of its kind (left border, styles.css section 10);
 * - selected: the clicked node (`is-selected`, aria-pressed="true"); a second click or Escape
 *   clears it;
 * - prerequisite: the direct prerequisites of the selected one (`is-prerequisite`), and their lines;
 * - unlocked by the selected: the technologies that list it as a prerequisite (`is-unlocked`), and
 *   their lines. The whole chain in both directions is T3202.
 * While something is selected the tree gets `has-selection` and the other nodes are dimmed.
 * A live region says what is selected, for screen readers and as a text summary.
 */
import { t } from "./i18n.js";

const STATE_CLASSES = ["is-selected", "is-prerequisite", "is-unlocked"];

export function createSelection(root, data, status, getLang, onChange = () => {}) {
  const byId = new Map(data.technologies.map((tech) => [tech.id, tech]));
  const dependents = new Map();
  data.technologies.forEach((tech) => tech.prerequisites.forEach((id) => {
    if (!dependents.has(id)) dependents.set(id, []);
    dependents.get(id).push(tech.id);
  }));
  let selected = null;

  const nodesOf = (ids) => ids.map((id) => root.querySelector(`.tech-node[data-tech-id="${id}"]`)).filter(Boolean);

  /** Classes of the lines; also called after every redraw (the paths are new elements). */
  function paintLines() {
    root.querySelectorAll(".tech-line").forEach((line) => {
      line.classList.toggle("is-prerequisite", line.dataset.to === selected);
      line.classList.toggle("is-unlocked", line.dataset.from === selected);
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
      .replace("{prerequisites}", byId.get(selected).prerequisites.length)
      .replace("{unlocked}", (dependents.get(selected) || []).length);
  }

  function select(id) {
    selected = id && byId.has(id) && id !== selected ? id : null;
    root.querySelectorAll(STATE_CLASSES.map((name) => "." + name).join(",")).forEach((node) => node.classList.remove(...STATE_CLASSES));
    root.querySelectorAll('.tech-node[aria-pressed="true"]').forEach((node) => node.setAttribute("aria-pressed", "false"));
    root.classList.toggle("has-selection", Boolean(selected));
    if (selected) {
      nodesOf(byId.get(selected).prerequisites).forEach((node) => node.classList.add("is-prerequisite"));
      nodesOf(dependents.get(selected) || []).forEach((node) => node.classList.add("is-unlocked"));
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

  return { select, selected: () => selected, announce };
}

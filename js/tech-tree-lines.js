/**
 * Prerequisite lines of the tech tree (T3103, TECH_TREE_GDD.md section 6): one SVG per area grid,
 * under the nodes, with a curve from every prerequisite to the technology that needs it.
 *
 * Only technology prerequisites draw lines (requirements are text, GDD §4.1), and only when both
 * nodes are in the same area: a prerequisite from another area is listed in the detail card.
 * Positions come from offsetLeft / offsetTop inside the grid (the grid is the offset parent of
 * every node), so they do not depend on the page or panel scroll. The lines are redrawn whenever
 * a grid changes size (window resize, language change, a hidden mobile tab shown again) and when
 * the web font finishes loading.
 */

const SVG_NS = "http://www.w3.org/2000/svg";
/** Horizontal reach of the curve handles when both ends are in the same column, in px. */
const LOOP = 28;

function box(node) {
  return { left: node.offsetLeft, top: node.offsetTop, right: node.offsetLeft + node.offsetWidth, middle: node.offsetTop + node.offsetHeight / 2 };
}

/**
 * Path from prerequisite `from` to technology `to`: right edge → left edge for a later tier,
 * a loop on the right side for the same tier and left edge → right edge for an earlier one.
 */
export function linePath(from, to) {
  const a = box(from);
  const b = box(to);
  if (b.left >= a.right) {
    const handle = Math.max(LOOP, (b.left - a.right) / 2);
    return `M${a.right} ${a.middle}C${a.right + handle} ${a.middle} ${b.left - handle} ${b.middle} ${b.left} ${b.middle}`;
  }
  if (b.right <= a.left) {
    const handle = Math.max(LOOP, (a.left - b.right) / 2);
    return `M${a.left} ${a.middle}C${a.left - handle} ${a.middle} ${b.right + handle} ${b.middle} ${b.right} ${b.middle}`;
  }
  return `M${a.right} ${a.middle}C${a.right + LOOP} ${a.middle} ${b.right + LOOP} ${b.middle} ${b.right} ${b.middle}`;
}

/** (Re)draws the lines of one grid. A hidden grid (closed mobile tab) is skipped. */
export function drawGridLines(grid, data) {
  if (!grid.offsetWidth) return false;
  let svg = grid.querySelector(":scope > .tech-lines");
  if (!svg) {
    svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", "tech-lines");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    grid.prepend(svg);
  }
  svg.setAttribute("width", grid.offsetWidth);
  svg.setAttribute("height", grid.offsetHeight);
  svg.setAttribute("viewBox", `0 0 ${grid.offsetWidth} ${grid.offsetHeight}`);
  const nodes = new Map([...grid.querySelectorAll(".tech-node")].map((node) => [node.dataset.techId, node]));
  const paths = [];
  data.technologies.forEach((tech) => {
    const to = nodes.get(tech.id);
    if (!to) return;
    tech.prerequisites.forEach((id) => {
      const from = nodes.get(id);
      if (!from) return;
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("class", "tech-line");
      path.setAttribute("d", linePath(from, to));
      path.dataset.from = id;
      path.dataset.to = tech.id;
      paths.push(path);
    });
  });
  svg.replaceChildren(...paths);
  grid.dispatchEvent(new CustomEvent("tech-lines-drawn", { bubbles: true }));
  return true;
}

/**
 * Draws the lines of every `.tech-grid` under `root` now and keeps them up to date: a
 * ResizeObserver on each grid (and its nodes' cells), plus the web font load. Returns `redraw()`
 * to force a new drawing (e.g. after the labels change language).
 */
export function watchLines(root, data) {
  const pending = new Set();
  let frame = 0;
  const flush = () => {
    frame = 0;
    pending.forEach((grid) => drawGridLines(grid, data));
    pending.clear();
  };
  const schedule = (grids) => {
    grids.forEach((grid) => pending.add(grid));
    if (!frame) frame = requestAnimationFrame(flush);
  };
  const grids = () => [...root.querySelectorAll(".tech-grid")];
  const observer = new ResizeObserver((entries) => schedule(entries.map((entry) => entry.target.closest(".tech-grid"))));
  grids().forEach((grid) => {
    observer.observe(grid);
    grid.querySelectorAll(".tech-cell").forEach((cell) => observer.observe(cell));
  });
  grids().forEach((grid) => drawGridLines(grid, data));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => schedule(grids()));
  return () => schedule(grids());
}

/**
 * Prerequisite lines of the tech tree (T3103, T3601, TECH_TREE_GDD.md section 6): one SVG under
 * the nodes of the three stacked areas (`.tech-stack`), with a curve from every prerequisite to
 * the technology that needs it, also when the prerequisite is in another area.
 *
 * Only technology prerequisites draw lines (requirements are text, GDD §4.1). Positions are the
 * offsets of each node inside the stack (summed up the offset parents), so they depend neither on
 * the scroll of the tree window nor on the zoom (a CSS transform of the whole stack). The lines are
 * redrawn whenever the stack or a cell changes size (window resize, language change) and when the
 * web font finishes loading.
 */

const SVG_NS = "http://www.w3.org/2000/svg";
/** Horizontal reach of the curve handles when both ends are in the same column, in px. */
const LOOP = 28;

/** Box of `node` in the coordinates of `stack` (an ancestor). */
export function nodeBox(node, stack) {
  let left = 0;
  let top = 0;
  for (let el = node; el && el !== stack; el = el.offsetParent) {
    left += el.offsetLeft;
    top += el.offsetTop;
  }
  return { left, top, right: left + node.offsetWidth, middle: top + node.offsetHeight / 2 };
}

/**
 * Path between two boxes (prerequisite `a` → technology `b`): right edge → left edge for a later
 * tier, a loop on the right side for the same tier and left edge → right edge for an earlier one.
 */
export function linePath(a, b) {
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

/** (Re)draws the lines of the stack. A hidden stack is skipped. */
export function drawLines(stack, data) {
  if (!stack.offsetWidth) return false;
  let svg = stack.querySelector(":scope > .tech-lines");
  if (!svg) {
    svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", "tech-lines");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    stack.prepend(svg);
  }
  svg.setAttribute("width", stack.offsetWidth);
  svg.setAttribute("height", stack.offsetHeight);
  svg.setAttribute("viewBox", `0 0 ${stack.offsetWidth} ${stack.offsetHeight}`);
  const nodes = new Map([...stack.querySelectorAll(".tech-node")].map((node) => [node.dataset.techId, node]));
  const boxes = new Map();
  const boxOf = (id) => {
    if (!boxes.has(id)) boxes.set(id, nodeBox(nodes.get(id), stack));
    return boxes.get(id);
  };
  const paths = [];
  data.technologies.forEach((tech) => {
    if (!nodes.has(tech.id)) return;
    tech.prerequisites.forEach((id) => {
      if (!nodes.has(id)) return;
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("class", "tech-line");
      path.setAttribute("d", linePath(boxOf(id), boxOf(tech.id)));
      path.dataset.from = id;
      path.dataset.to = tech.id;
      if (nodes.get(id).closest(".tech-area") !== nodes.get(tech.id).closest(".tech-area")) path.dataset.cross = "1";
      paths.push(path);
    });
  });
  svg.replaceChildren(...paths);
  stack.dispatchEvent(new CustomEvent("tech-lines-drawn", { bubbles: true }));
  return true;
}

/**
 * Draws the lines of the `.tech-stack` under `root` now and keeps them up to date: a
 * ResizeObserver on the stack and on every cell, plus the web font load. Returns `redraw()` to
 * force a new drawing (e.g. after the labels change language).
 */
export function watchLines(root, data) {
  const stack = root.querySelector(".tech-stack");
  let frame = 0;
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(() => {
      frame = 0;
      drawLines(stack, data);
    });
  };
  const observer = new ResizeObserver(schedule);
  observer.observe(stack);
  stack.querySelectorAll(".tech-cell").forEach((cell) => observer.observe(cell));
  drawLines(stack, data);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
  return schedule;
}

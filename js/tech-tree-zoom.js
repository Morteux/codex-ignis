/**
 * Zoom and pan of the tech tree (T3204, TECH_TREE_GDD.md section 6).
 *
 * Every area panel (`.tech-area-scroll`) keeps its own scroll, which is the pan: scroll bars,
 * mouse wheel, one finger on touch screens, and arrow keys once the panel has the focus (it is
 * focusable). On top of that:
 * - mouse: drag the empty space of the tree to pan; Ctrl + wheel zooms around the pointer;
 * - touch: pinch with two fingers zooms around the fingers;
 * - keyboard: `+` / `-` zoom and `0` goes back to 100 % while the focus is in the tree, and the
 *   zoom bar has buttons for the same.
 * The zoom is one level for the three areas. It scales each grid with a CSS transform (the nodes
 * and the SVG lines together, so the lines need no redraw) inside a wrapper sized to the scaled
 * grid, so the panel scrolls exactly over the visible tree. At 100 % nothing is transformed.
 */
import { t } from "./i18n.js";

export const ZOOM_MIN = 0.4;
export const ZOOM_MAX = 1.6;
/** Steps of the buttons and keys. */
export const ZOOM_STEPS = [0.4, 0.5, 0.6, 0.75, 0.9, 1, 1.15, 1.3, 1.45, 1.6];

const clamp = (value) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value));

function nextStep(zoom, direction) {
  if (direction > 0) return ZOOM_STEPS.find((step) => step > zoom + 0.001) ?? ZOOM_MAX;
  return [...ZOOM_STEPS].reverse().find((step) => step < zoom - 0.001) ?? ZOOM_MIN;
}

/**
 * Sets up zoom and pan for every `.tech-area-scroll` under `root`, with its buttons in `bar`.
 * Returns `{ zoom(), setZoom(value, anchor?), relabel() }`.
 */
export function createZoom(root, bar, getLang, areaLabel) {
  let zoom = 1;
  const scrolls = [...root.querySelectorAll(".tech-area-scroll")];

  // wrap every grid once; the wrapper takes the scaled size
  scrolls.forEach((scroll) => {
    const grid = scroll.querySelector(".tech-grid");
    if (!grid || grid.parentElement.classList.contains("tech-zoom")) return;
    const wrap = document.createElement("div");
    wrap.className = "tech-zoom";
    grid.replaceWith(wrap);
    wrap.append(grid);
    scroll.tabIndex = 0;
  });

  function sizeWrappers() {
    scrolls.forEach((scroll) => {
      const wrap = scroll.querySelector(".tech-zoom");
      const grid = wrap && wrap.querySelector(".tech-grid");
      if (!grid) return;
      if (zoom === 1) {
        wrap.style.removeProperty("width");
        wrap.style.removeProperty("height");
        grid.style.removeProperty("transform");
      } else {
        wrap.style.width = grid.offsetWidth * zoom + "px";
        wrap.style.height = grid.offsetHeight * zoom + "px";
        grid.style.transform = `scale(${zoom})`;
      }
    });
    root.classList.toggle("is-zoomed", zoom !== 1);
  }

  const resize = new ResizeObserver(() => {
    if (zoom !== 1) sizeWrappers();
  });
  scrolls.forEach((scroll) => {
    const grid = scroll.querySelector(".tech-grid");
    if (grid) resize.observe(grid);
  });

  const level = document.createElement("output");
  level.className = "tech-zoom-level";
  level.id = "tech-zoom-level";
  const buttons = {};
  [["out", "−"], ["in", "+"], ["reset", "100 %"]].forEach(([name, text]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tech-zoom-btn";
    button.dataset.zoom = name;
    button.textContent = text;
    buttons[name] = button;
  });
  const label = document.createElement("span");
  label.className = "tech-zoom-label";
  const hint = document.createElement("p");
  hint.className = "tech-zoom-hint";
  const group = document.createElement("div");
  group.className = "tech-zoom-controls";
  group.setAttribute("role", "group");
  group.append(label, buttons.out, level, buttons.in, buttons.reset);
  bar.replaceChildren(group, hint);

  function relabel() {
    const lang = getLang();
    label.textContent = t(lang, "techTreeZoomLabel");
    group.setAttribute("aria-label", t(lang, "techTreeZoomLabel"));
    buttons.in.setAttribute("aria-label", t(lang, "techTreeZoomIn"));
    buttons.out.setAttribute("aria-label", t(lang, "techTreeZoomOut"));
    buttons.reset.setAttribute("aria-label", t(lang, "techTreeZoomReset"));
    hint.textContent = t(lang, "techTreeZoomHint");
    scrolls.forEach((scroll) => {
      scroll.setAttribute("role", "region");
      scroll.setAttribute("aria-label", t(lang, "techTreePanelLabel").replace("{area}", areaLabel(scroll.closest(".tech-area").dataset.area)));
    });
  }

  function paint() {
    level.textContent = Math.round(zoom * 100) + " %";
    buttons.out.disabled = zoom <= ZOOM_MIN + 0.001;
    buttons.in.disabled = zoom >= ZOOM_MAX - 0.001;
    buttons.reset.disabled = zoom === 1;
  }

  /**
   * New zoom level. `anchor` = {scroll, x, y} (point in the panel's client box that stays put);
   * without it every visible panel keeps its centre.
   */
  function setZoom(value, anchor) {
    const next = Math.round(clamp(value) * 1000) / 1000;
    if (next === zoom) return;
    const ratio = next / zoom;
    const targets = anchor ? [anchor] : scrolls.filter((scroll) => scroll.offsetWidth).map((scroll) => ({ scroll, x: scroll.clientWidth / 2, y: scroll.clientHeight / 2 }));
    const before = targets.map(({ scroll, x, y }) => ({ scroll, x, y, left: (scroll.scrollLeft + x) * ratio - x, top: (scroll.scrollTop + y) * ratio - y }));
    zoom = Math.abs(next - 1) < 0.001 ? 1 : next;
    sizeWrappers();
    before.forEach(({ scroll, left, top }) => {
      scroll.scrollLeft = left;
      scroll.scrollTop = top;
    });
    paint();
    root.dispatchEvent(new CustomEvent("tech-zoom-change", { detail: zoom }));
  }

  buttons.in.addEventListener("click", () => setZoom(nextStep(zoom, 1)));
  buttons.out.addEventListener("click", () => setZoom(nextStep(zoom, -1)));
  buttons.reset.addEventListener("click", () => setZoom(1));

  scrolls.forEach((scroll) => {
    // Ctrl + wheel (and the trackpad pinch, which browsers send as Ctrl + wheel): zoom at the pointer
    scroll.addEventListener("wheel", (event) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      const box = scroll.getBoundingClientRect();
      setZoom(zoom * Math.exp(-event.deltaY * 0.0015), { scroll, x: event.clientX - box.left, y: event.clientY - box.top });
    }, { passive: false });

    // mouse drag on the empty space pans
    let drag = null;
    scroll.addEventListener("pointerdown", (event) => {
      if (event.pointerType !== "mouse" || event.button !== 0 || event.target.closest(".tech-node, button, a, input, select")) return;
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: scroll.scrollLeft, top: scroll.scrollTop };
      scroll.setPointerCapture(event.pointerId);
      scroll.classList.add("is-panning");
    });
    scroll.addEventListener("pointermove", (event) => {
      if (!drag || event.pointerId !== drag.id) return;
      scroll.scrollLeft = drag.left - (event.clientX - drag.x);
      scroll.scrollTop = drag.top - (event.clientY - drag.y);
    });
    const stop = (event) => {
      if (!drag || event.pointerId !== drag.id) return;
      drag = null;
      scroll.classList.remove("is-panning");
    };
    scroll.addEventListener("pointerup", stop);
    scroll.addEventListener("pointercancel", stop);

    // two-finger pinch zooms around the fingers (one finger keeps the native scroll)
    let pinch = null;
    const spread = (touches) => Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
    scroll.addEventListener("touchstart", (event) => {
      if (event.touches.length === 2) pinch = { distance: spread(event.touches), zoom };
    }, { passive: true });
    scroll.addEventListener("touchmove", (event) => {
      if (!pinch || event.touches.length !== 2) return;
      event.preventDefault();
      const box = scroll.getBoundingClientRect();
      const x = (event.touches[0].clientX + event.touches[1].clientX) / 2 - box.left;
      const y = (event.touches[0].clientY + event.touches[1].clientY) / 2 - box.top;
      setZoom(pinch.zoom * spread(event.touches) / pinch.distance, { scroll, x, y });
    }, { passive: false });
    scroll.addEventListener("touchend", (event) => {
      if (event.touches.length < 2) pinch = null;
    });
  });

  // keys while the focus is in the tree (a node or a panel)
  root.addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const scroll = event.target.closest(".tech-area-scroll");
    const anchor = scroll ? { scroll, x: scroll.clientWidth / 2, y: scroll.clientHeight / 2 } : undefined;
    if (event.key === "+" || event.key === "=") setZoom(nextStep(zoom, 1), anchor);
    else if (event.key === "-" || event.key === "_") setZoom(nextStep(zoom, -1), anchor);
    else if (event.key === "0") setZoom(1, anchor);
    else return;
    event.preventDefault();
  });

  relabel();
  paint();
  return { zoom: () => zoom, setZoom, relabel };
}

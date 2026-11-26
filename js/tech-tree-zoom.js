/**
 * Zoom and pan of the tech tree (T3204, T3601, TECH_TREE_GDD.md section 6).
 *
 * The three areas are stacked in one tree window (`.tech-areas`), whose scroll is the pan: scroll
 * bars, mouse wheel, one finger on touch screens, and arrow keys once the window has the focus (it
 * is focusable). On top of that:
 * - mouse: drag the empty space of the tree to pan; Ctrl + wheel zooms around the pointer;
 * - touch: pinch with two fingers zooms around the fingers;
 * - keyboard: `+` / `-` zoom and `0` goes back to 100 % while the focus is in the tree, and the
 *   zoom bar has buttons for the same.
 * The zoom scales the whole stack (`.tech-stack`: the three areas, their nodes and the SVG lines
 * together, so the lines need no redraw) with a CSS transform inside a wrapper (`.tech-zoom`)
 * sized to the scaled stack, so the window scrolls exactly over the visible tree. At 100 %
 * nothing is transformed.
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
 * Sets up zoom and pan of the tree window `root`, with its buttons in `bar`.
 * Returns `{ zoom(), setZoom(value, anchor?), relabel() }`.
 */
export function createZoom(root, bar, getLang) {
  let zoom = 1;
  const scroll = root;
  const wrap = root.querySelector(".tech-zoom");
  const stack = root.querySelector(".tech-stack");
  scroll.tabIndex = 0;

  /*
   * T3701: the field labels, the grid corners and the area headings stick to the left edge of the
   * window with `position: sticky` at 100 %. Inside the scaled stack the browser applies the
   * sticky shift before the scale, so it moves `zoom` times as fast as the scroll (zoomed in the
   * column floats into the panel, zoomed out it slides off to the left). While zoomed they are
   * `position: relative` instead (`.is-zoomed` in styles.css) and their `left` is set here from
   * the scroll: scrollLeft / zoom in stack pixels, kept inside the box of their parent like sticky.
   */
  let pins = [];
  function measurePins() {
    pins = [];
    if (zoom === 1) return;
    const origin = stack.getBoundingClientRect().left;
    const els = [...stack.querySelectorAll(".tech-field-label, .tech-grid-corner, .tech-area-heading")];
    els.forEach((el) => el.style.removeProperty("left"));
    els.forEach((el) => {
      const box = el.getBoundingClientRect();
      const natural = (box.left - origin) / zoom;
      const room = (el.parentElement.getBoundingClientRect().right - box.right) / zoom;
      pins.push({ el, natural, room: Math.max(0, room) });
    });
  }
  function placePins() {
    const x = scroll.scrollLeft / zoom;
    pins.forEach((pin) => {
      pin.el.style.left = Math.min(pin.room, Math.max(0, x - pin.natural)) + "px";
    });
  }
  scroll.addEventListener("scroll", () => {
    if (zoom !== 1) placePins();
  }, { passive: true });

  function sizeWrapper() {
    if (zoom === 1) {
      wrap.style.removeProperty("width");
      wrap.style.removeProperty("height");
      stack.style.removeProperty("transform");
      stack.querySelectorAll(".tech-field-label, .tech-grid-corner, .tech-area-heading").forEach((el) => el.style.removeProperty("left"));
    } else {
      wrap.style.width = stack.offsetWidth * zoom + "px";
      wrap.style.height = stack.offsetHeight * zoom + "px";
      stack.style.transform = `scale(${zoom})`;
    }
    root.classList.toggle("is-zoomed", zoom !== 1);
    measurePins();
    placePins();
  }

  new ResizeObserver(() => {
    if (zoom !== 1) sizeWrapper();
  }).observe(stack);

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
    scroll.setAttribute("role", "region");
    scroll.setAttribute("aria-label", t(lang, "techTreeWindowLabel"));
  }

  function paint() {
    level.textContent = Math.round(zoom * 100) + " %";
    buttons.out.disabled = zoom <= ZOOM_MIN + 0.001;
    buttons.in.disabled = zoom >= ZOOM_MAX - 0.001;
    buttons.reset.disabled = zoom === 1;
  }

  /**
   * New zoom level. `anchor` = {x, y} (point in the window's client box that stays put); without
   * it the window keeps its centre.
   */
  function setZoom(value, anchor) {
    const next = Math.round(clamp(value) * 1000) / 1000;
    if (next === zoom) return;
    const ratio = next / zoom;
    const { x, y } = anchor || { x: scroll.clientWidth / 2, y: scroll.clientHeight / 2 };
    const left = (scroll.scrollLeft + x) * ratio - x;
    const top = (scroll.scrollTop + y) * ratio - y;
    zoom = Math.abs(next - 1) < 0.001 ? 1 : next;
    sizeWrapper();
    scroll.scrollLeft = left;
    scroll.scrollTop = top;
    if (zoom !== 1) placePins();
    paint();
    root.dispatchEvent(new CustomEvent("tech-zoom-change", { detail: zoom }));
  }

  buttons.in.addEventListener("click", () => setZoom(nextStep(zoom, 1)));
  buttons.out.addEventListener("click", () => setZoom(nextStep(zoom, -1)));
  buttons.reset.addEventListener("click", () => setZoom(1));

  {
    // Ctrl + wheel (and the trackpad pinch, which browsers send as Ctrl + wheel): zoom at the pointer
    scroll.addEventListener("wheel", (event) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      const box = scroll.getBoundingClientRect();
      setZoom(zoom * Math.exp(-event.deltaY * 0.0015), { x: event.clientX - box.left, y: event.clientY - box.top });
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
      setZoom(pinch.zoom * spread(event.touches) / pinch.distance, { x, y });
    }, { passive: false });
    scroll.addEventListener("touchend", (event) => {
      if (event.touches.length < 2) pinch = null;
    });
  }

  // keys while the focus is in the tree (a node or a panel)
  root.addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === "+" || event.key === "=") setZoom(nextStep(zoom, 1));
    else if (event.key === "-" || event.key === "_") setZoom(nextStep(zoom, -1));
    else if (event.key === "0") setZoom(1);
    else return;
    event.preventDefault();
  });

  relabel();
  paint();
  return { zoom: () => zoom, setZoom, relabel };
}

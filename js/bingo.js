/**
 * Stellaris bingos (bingo.html), generic engine (P24.1).
 *
 * Every bingo is one entry of BINGOS (js/bingo-data.js): the selector lists them all and the
 * board is built from the entry's layout ("grid", "ordered" or "shape"), icon size and items.
 * Each cell is a button: greyscale by default, in colour once clicked (click again to unmark).
 * The marks survive language changes and switching bingos during the visit, but not a reload.
 *
 * The download button draws a PNG of the visible bingo with its current marks: "grid" and
 * "ordered" bingos in a fixed number of columns (layout.columns), "shape" bingos with their
 * own cell positions, whatever the screen width.
 *
 * The language and the translations of the static markup (data-i18n / data-i18n-attr) are
 * handled by the shared shell (js/page-shell.js); this module only repaints the bingo.
 */

import { t } from "./i18n.js";
import "./i18n-bingo.js";
import "./i18n-empire-names.js";
import { getLang, applyPageTranslations, onLanguageChange } from "./page-shell.js";
import { STELLARIS_ASSETS_BASE as IMAGE_BASE } from "./asset-config.js";
import { BINGOS } from "./bingo-data.js";

const DEFAULT_COLUMNS = 9;

const typeSelect = document.querySelector("#bingo-type");
const descriptionEl = document.querySelector("#bingo-description");
const grid = document.querySelector("#bingo-grid");
const emptyMessage = document.querySelector("#bingo-empty");
const downloadButton = document.querySelector("#bingo-download");
const downloadStatus = document.querySelector("#bingo-download-status");

let currentLang = getLang();
let currentBingo = BINGOS[0];
// Marked cells per bingo, for the whole visit ("<bingo id>:<item id>").
const markedState = new Map();

/** Identity of an item inside its bingo: its `id`, or its i18n key when it has none. */
const itemId = (item) => item.id ?? item.i18nKey;

/** Name of an item: its i18n text, plus its variant in brackets when it has one. */
function itemName(item) {
    const name = t(currentLang, item.i18nKey);
    return item.variantKey ? `${name} (${t(currentLang, item.variantKey)})` : name;
}

function cardKey(bingo, item) {
    return `${bingo.id}:${itemId(item)}`;
}

/**
 * Cells of a bingo in display order, each one with its 1-based [row, col] (null = let the
 * screen grid place it; the PNG then uses `columns`).
 */
function layoutCells(bingo) {
    const layout = bingo.layout || { type: "grid" };
    if (layout.type === "shape") {
        return bingo.items
            .filter((item) => layout.cells[itemId(item)])
            .map((item) => ({ item, position: layout.cells[itemId(item)] }));
    }
    let items = bingo.items;
    if (layout.type === "ordered") {
        const rank = new Map(layout.order.map((key, index) => [key, index]));
        items = [...items].sort((a, b) => (rank.get(itemId(a)) ?? Infinity) - (rank.get(itemId(b)) ?? Infinity));
    }
    return items.map((item) => ({ item, position: null }));
}

/**
 * Builds one bingo cell (button with its icon). With `showNames` the name is visible under the
 * icon; otherwise it is only the native tooltip ("title") and the "aria-label". In both cases
 * the text stays in ".bingo-card-title", which buildBingoCanvas() writes on the PNG. An item
 * without image (img: null) keeps an empty slot of the same size.
 */
function buildCard(bingo, item, position) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "bingo-card";
    if (position) {
        card.style.gridRow = String(position[0]);
        card.style.gridColumn = String(position[1]);
    }
    if (item.tags?.length) card.dataset.tags = item.tags.join(" ");
    if (item.dlc) card.dataset.dlc = item.dlc;

    const key = cardKey(bingo, item);
    const isMarked = markedState.get(key) || false;
    card.classList.toggle("is-marked", isMarked);
    card.setAttribute("aria-pressed", String(isMarked));

    const name = itemName(item);
    card.title = name;
    card.setAttribute("aria-label", name);

    let icon;
    if (item.img) {
        icon = document.createElement("img");
        // CORS request, so the remote icons do not taint the canvas of the PNG download.
        icon.crossOrigin = "anonymous";
        icon.addEventListener("error", () => card.classList.add("is-image-missing"));
        icon.src = `${IMAGE_BASE}${item.img}`;
        icon.alt = "";
        icon.loading = "lazy";
    } else {
        icon = document.createElement("span");
        icon.className = "bingo-card-slot";
        card.classList.add("is-image-missing");
    }

    const title = document.createElement("span");
    title.className = bingo.showNames ? "bingo-card-title bingo-card-title--visible" : "bingo-card-title";
    title.textContent = name;

    card.append(icon, title);

    card.addEventListener("click", () => {
        const nowMarked = card.classList.toggle("is-marked");
        card.setAttribute("aria-pressed", String(nowMarked));
        markedState.set(key, nowMarked);
    });

    return card;
}

/** Fills the selector with every bingo of BINGOS, in the current language. */
function renderSelector() {
    if (!typeSelect) return;
    typeSelect.replaceChildren(...BINGOS.map((bingo) => {
        const option = document.createElement("option");
        option.value = bingo.id;
        option.textContent = t(currentLang, bingo.titleKey);
        return option;
    }));
    typeSelect.value = currentBingo.id;
}

/** Repaints the whole board of the selected bingo. */
function renderGrid() {
    if (!grid) return;
    const bingo = currentBingo;
    const layout = bingo.layout || { type: "grid" };
    const cells = layoutCells(bingo);

    grid.className = `bingo-grid bingo-grid--${bingo.id} bingo-grid--${layout.type}`;
    // Small icons also get tighter padding and gaps (the civics board).
    grid.classList.toggle("bingo-grid--compact", bingo.iconSize < 80);
    grid.style.setProperty("--bingo-cell", `${bingo.iconSize}px`);
    if (layout.type === "shape") {
        grid.style.setProperty("--bingo-shape-columns", String(layout.columns));
        grid.style.setProperty("--bingo-shape-rows", String(layout.rows));
    } else {
        grid.style.removeProperty("--bingo-shape-columns");
        grid.style.removeProperty("--bingo-shape-rows");
    }
    grid.dataset.bingo = bingo.id;

    if (descriptionEl) descriptionEl.textContent = bingo.descriptionKey ? t(currentLang, bingo.descriptionKey) : "";

    grid.replaceChildren();

    const hasEntries = cells.length > 0;
    grid.hidden = !hasEntries;
    if (emptyMessage) emptyMessage.hidden = hasEntries;
    if (downloadButton) downloadButton.disabled = !hasEntries;

    cells.forEach(({ item, position }) => grid.append(buildCard(bingo, item, position)));
}

/** Waits for an image to load, forcing the load if it was "lazy". */
function waitForImage(img) {
    // "complete" is also true for an icon that already failed: do not wait for it forever.
    if (!img || img.complete) return Promise.resolve();
    return new Promise((resolve) => {
        img.loading = "eager";
        img.addEventListener("load", () => resolve(), { once: true });
        img.addEventListener("error", () => resolve(), { once: true });
    });
}

/** Reads a CSS variable of the current theme, with a fallback. */
function readThemeColor(name, fallback) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
}

/** Splits a text into lines that fit a maximum width inside the canvas. */
function wrapText(ctx, text, maxWidth) {
    const words = text.split(/\s+/);
    const lines = [];
    let line = "";
    words.forEach((word) => {
        const candidate = line ? `${line} ${word}` : word;
        if (line && ctx.measureText(candidate).width > maxWidth) {
            lines.push(line);
            line = word;
        } else {
            line = candidate;
        }
    });
    if (line) lines.push(line);
    return lines;
}

/** [row, col] (0-based) of every card on the PNG, and the size of the board in cells. */
function canvasPositions(bingo, count) {
    const layout = bingo.layout || { type: "grid" };
    if (layout.type === "shape") {
        const cells = layoutCells(bingo);
        return { cols: layout.columns, rows: layout.rows, positions: cells.map(({ position }) => [position[0] - 1, position[1] - 1]) };
    }
    const cols = layout.columns || DEFAULT_COLUMNS;
    const positions = Array.from({ length: count }, (_, index) => [Math.floor(index / cols), index % cols]);
    return { cols, rows: Math.ceil(count / cols), positions };
}

/** Draws a <canvas> with every cell of the visible bingo and its current marks. */
async function buildBingoCanvas() {
    const bingo = currentBingo;
    const cards = grid.querySelectorAll(".bingo-card");
    const { cols, rows, positions } = canvasPositions(bingo, cards.length);
    const cellImage = 130;
    const cellPadding = 10;
    const titleLines = 2;
    const lineHeight = 13;
    const cellWidth = cellImage + cellPadding * 2;
    const cellHeight = cellImage + cellPadding + titleLines * lineHeight + cellPadding;
    const headerHeight = 78;
    const outerPadding = 24;
    // Oversampling: the canvas is drawn at twice the resolution (the coordinates below stay in
    // logical pixels thanks to ctx.scale) for a sharper PNG.
    const SCALE = 2;

    const background = readThemeColor("--background", "#07110c");
    const surface = readThemeColor("--surface", "#0c1911");
    const line = readThemeColor("--line", "#294836");
    const text = readThemeColor("--text", "#e1f2df");
    const muted = readThemeColor("--muted", "#91af99");
    const accent = readThemeColor("--accent", "#a7f56a");

    await Promise.all(Array.from(cards).map((card) => waitForImage(card.querySelector("img"))));

    const canvas = document.createElement("canvas");
    canvas.width = (outerPadding * 2 + cols * cellWidth) * SCALE;
    canvas.height = (outerPadding * 2 + headerHeight + rows * cellHeight) * SCALE;
    const ctx = canvas.getContext("2d");
    ctx.scale(SCALE, SCALE);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const canvasTitle = t(currentLang, "bingoHeading").toUpperCase();
    const canvasSubtitle = `Codex Ignis · ${t(currentLang, bingo.titleKey)}`;

    ctx.textBaseline = "top";
    ctx.fillStyle = text;
    ctx.font = "700 24px monospace";
    ctx.fillText(canvasTitle, outerPadding, outerPadding);
    ctx.fillStyle = muted;
    ctx.font = "12px monospace";
    ctx.fillText(canvasSubtitle, outerPadding, outerPadding + 32);

    cards.forEach((card, index) => {
        const [row, col] = positions[index];
        const x = outerPadding + col * cellWidth;
        const y = outerPadding + headerHeight + row * cellHeight;
        const isMarked = card.classList.contains("is-marked");
        const img = card.querySelector("img");
        const title = card.querySelector(".bingo-card-title").textContent;

        ctx.fillStyle = surface;
        ctx.fillRect(x, y, cellWidth, cellHeight);
        ctx.lineWidth = isMarked ? 3 : 1;
        ctx.strokeStyle = isMarked ? accent : line;
        ctx.strokeRect(x + 1, y + 1, cellWidth - 2, cellHeight - 2);

        ctx.save();
        ctx.filter = isMarked ? "none" : "grayscale(100%)";
        if (img && img.naturalWidth > 0) ctx.drawImage(img, x + cellPadding, y + cellPadding, cellImage, cellImage);
        ctx.restore();

        ctx.fillStyle = isMarked ? accent : muted;
        ctx.font = "10px monospace";
        ctx.textAlign = "center";
        const lines = wrapText(ctx, title, cellWidth - cellPadding * 1.5).slice(0, titleLines);
        const textStartY = y + cellPadding + cellImage + 6;
        lines.forEach((textLine, i) => {
            ctx.fillText(textLine, x + cellWidth / 2, textStartY + i * lineHeight);
        });
        ctx.textAlign = "left";
    });

    return canvas;
}

if (downloadButton) {
    downloadButton.addEventListener("click", async () => {
        if (!grid.querySelector(".bingo-card")) return;
        downloadButton.disabled = true;
        if (downloadStatus) downloadStatus.textContent = "";
        try {
            const canvas = await buildBingoCanvas();
            const link = document.createElement("a");
            link.download = `bingo-${currentBingo.fileSlug}-stellaris.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
        } catch (error) {
            if (downloadStatus) downloadStatus.textContent = t(currentLang, "bingoDownloadError");
        } finally {
            downloadButton.disabled = !grid.querySelector(".bingo-card");
        }
    });
}

if (typeSelect) {
    typeSelect.addEventListener("change", () => {
        currentBingo = BINGOS.find((bingo) => bingo.id === typeSelect.value) || BINGOS[0];
        renderGrid();
    });
}

onLanguageChange((lang) => {
    currentLang = lang;
    renderSelector();
    renderGrid();
});

applyPageTranslations();
renderSelector();
renderGrid();

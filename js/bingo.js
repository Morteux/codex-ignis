/**
 * Bingo de Stellaris (orígenes y principios).
 *
 * La rejilla se genera en JS a partir de js/bingo-data.js según el tipo de
 * bingo elegido en el desplegable. Cada casilla es un botón: por defecto se
 * muestra en escala de grises; al pulsarla se marca como conseguida y se ve
 * a color (y se vuelve a pulsar para desmarcarla). El estado marcado se
 * mantiene al cambiar de idioma o al volver a un tipo de bingo ya visitado
 * durante la misma visita, pero no se guarda entre recargas de página.
 *
 * El botón de descarga genera una imagen PNG con el estado actual del
 * bingo que esté visible en ese momento (orígenes o principios), en una
 * rejilla fija de 9 columnas independiente de cómo se vea en pantalla.
 *
 * Esta página no usa js/legal.js: al construir la rejilla dinámicamente,
 * este módulo se encarga también de aplicar las traducciones (mismo
 * mecanismo de data-i18n / data-i18n-attr) para mantener todo sincronizado.
 */

import { SUPPORTED_LANGS, DEFAULT_LANG, detectInitialLang, storeLang, t } from "./i18n.js";
import { IMAGE_BASE, ORIGIN_BINGO, PRINCIPLE_BINGO } from "./bingo-data.js";

const BINGO_SETS = {
    origins: { data: ORIGIN_BINGO, fileSlug: "origenes", titleKey: "bingoTypeOrigins" },
    principles: { data: PRINCIPLE_BINGO, fileSlug: "principios", titleKey: "bingoTypePrinciples" }
};

const langButtons = document.querySelectorAll(".lang-btn");
const typeSelect = document.querySelector("#bingo-type");
const grid = document.querySelector("#bingo-grid");
const emptyMessage = document.querySelector("#bingo-empty");
const downloadButton = document.querySelector("#bingo-download");
const metaDescription = document.querySelector('meta[name="description"]');

let currentLang = detectInitialLang();
let currentType = "origins";
// Recuerda qué casillas están marcadas por tipo, mientras dure la visita.
const markedState = new Map();

function cardKey(type, index) {
    return `${type}:${index}`;
}

function applyTranslations() {
    document.documentElement.lang = currentLang;

    document.querySelectorAll("[data-i18n]").forEach((el) => {
        el.innerHTML = t(currentLang, el.dataset.i18n);
    });

    document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
        const [attr, key] = el.dataset.i18nAttr.split(":");
        el.setAttribute(attr, t(currentLang, key));
    });

    langButtons.forEach((btn) => {
        btn.setAttribute("aria-pressed", String(btn.dataset.lang === currentLang));
    });
}

/**
 * Construye una casilla de bingo (botón con imagen) para una entrada de
 * datos.
 *
 * En orígenes el nombre se muestra siempre como texto visible bajo la
 * imagen (clase ".bingo-card-title--visible"). En principios el nombre NO
 * se muestra como texto: solo aparece como tooltip nativo al pasar el
 * ratón por encima (atributo "title"), y como "aria-label" para que siga
 * siendo accesible con lector de pantalla. En ambos casos el texto sigue
 * existiendo dentro de ".bingo-card-title" porque buildBingoCanvas() lo
 * usa para escribirlo en la imagen descargada.
 */
function buildCard(entry, index) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "bingo-card";

    const isMarked = markedState.get(cardKey(currentType, index)) || false;
    card.classList.toggle("is-marked", isMarked);
    card.setAttribute("aria-pressed", String(isMarked));

    const name = t(currentLang, entry.i18nKey);
    card.title = name;
    card.setAttribute("aria-label", name);

    const img = document.createElement("img");
    img.src = `${IMAGE_BASE}${entry.img}`;
    img.alt = "";
    img.loading = "lazy";

    const title = document.createElement("span");
    title.className = currentType === "origins" ? "bingo-card-title bingo-card-title--visible" : "bingo-card-title";
    title.textContent = name;

    card.append(img, title);

    card.addEventListener("click", () => {
        const nowMarked = card.classList.toggle("is-marked");
        card.setAttribute("aria-pressed", String(nowMarked));
        markedState.set(cardKey(currentType, index), nowMarked);
    });

    return card;
}

/** Vuelve a pintar la rejilla completa para el tipo de bingo actualmente seleccionado. */
function renderGrid() {
    if (!grid) return;
    const entries = BINGO_SETS[currentType].data;

    // Clase según el tipo activo: permite que las casillas de principios se
    // vean mucho más pequeñas que las de orígenes (ver styles.css).
    grid.classList.remove("bingo-grid--origins", "bingo-grid--principles");
    grid.classList.add(`bingo-grid--${currentType}`);

    grid.replaceChildren();

    const hasEntries = entries.length > 0;
    grid.hidden = !hasEntries;
    if (emptyMessage) emptyMessage.hidden = hasEntries;
    if (downloadButton) downloadButton.disabled = !hasEntries;

    if (!hasEntries) return;

    entries.forEach((entry, index) => {
        grid.append(buildCard(entry, index));
    });
}

/** Espera a que una imagen esté cargada, forzando la carga si era "lazy". */
function waitForImage(img) {
    if (img.complete && img.naturalWidth > 0) return Promise.resolve();
    return new Promise((resolve) => {
        img.loading = "eager";
        img.addEventListener("load", () => resolve(), { once: true });
        img.addEventListener("error", () => resolve(), { once: true });
    });
}

/** Lee una variable CSS del tema actual, con un valor de respaldo por si no existiera. */
function readThemeColor(name, fallback) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
}

/** Reparte un texto en líneas que quepan en un ancho máximo dentro del canvas. */
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

/** Genera un <canvas> con todas las casillas del tipo activo, respetando cuáles están marcadas ahora mismo. */
async function buildBingoCanvas() {
    const cards = grid.querySelectorAll(".bingo-card");
    const cols = 9;
    const rows = Math.ceil(cards.length / cols);
    const cellImage = 130;
    const cellPadding = 10;
    const titleLines = 2;
    const lineHeight = 13;
    const cellWidth = cellImage + cellPadding * 2;
    const cellHeight = cellImage + cellPadding + titleLines * lineHeight + cellPadding;
    const headerHeight = 78;
    const outerPadding = 24;
    // Factor de sobremuestreo: el canvas se dibuja internamente al doble de
    // resolución (todas las coordenadas de abajo siguen en píxeles "lógicos"
    // gracias a ctx.scale) y luego se exporta tal cual. El resultado es un
    // PNG más nítido -texto, bordes e iconos ampliados sin verse pixelados-
    // sin tener que tocar ningún otro número de este archivo.
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

    const titleByLang = { es: "BINGO", en: "BINGO", jp: "ビンゴ" };
    const canvasTitle = titleByLang[currentLang] || "BINGO";
    const canvasSubtitle = `Codex Ignis · ${t(currentLang, BINGO_SETS[currentType].titleKey)}`;

    ctx.textBaseline = "top";
    ctx.fillStyle = text;
    ctx.font = "700 24px monospace";
    ctx.fillText(canvasTitle, outerPadding, outerPadding);
    ctx.fillStyle = muted;
    ctx.font = "12px monospace";
    ctx.fillText(canvasSubtitle, outerPadding, outerPadding + 32);

    cards.forEach((card, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
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
        ctx.drawImage(img, x + cellPadding, y + cellPadding, cellImage, cellImage);
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
        if (!BINGO_SETS[currentType].data.length) return;
        downloadButton.disabled = true;
        try {
            const canvas = await buildBingoCanvas();
            const link = document.createElement("a");
            link.download = `bingo-${BINGO_SETS[currentType].fileSlug}-stellaris.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
        } finally {
            downloadButton.disabled = BINGO_SETS[currentType].data.length === 0;
        }
    });
}

if (typeSelect) {
    typeSelect.addEventListener("change", () => {
        currentType = typeSelect.value in BINGO_SETS ? typeSelect.value : "origins";
        renderGrid();
    });
}

langButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
        currentLang = SUPPORTED_LANGS.includes(btn.dataset.lang) ? btn.dataset.lang : DEFAULT_LANG;
        storeLang(currentLang);
        applyTranslations();
        renderGrid();
    });
});

if (metaDescription && !metaDescription.dataset.i18nAttr) {
    // La meta description ya trae su propio data-i18n-attr en el HTML; este
    // bloque queda como salvaguarda si algún día se elimina ese atributo.
    metaDescription.setAttribute("content", t(currentLang, "bingoMetaDescription"));
}

applyTranslations();
renderGrid();

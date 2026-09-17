/**
 * Bingo de orígenes de Stellaris.
 *
 * Cada casilla es un botón: por defecto se muestra en escala de grises: al
 * pulsarla se marca como conseguida y se ve a color (y se vuelve a pulsar
 * para desmarcarla). No se guarda el estado entre visitas: al recargar la
 * página, todas las casillas vuelven a estar sin marcar.
 *
 * El botón de descarga genera una imagen PNG con el estado actual del
 * bingo (qué casillas están marcadas en ese momento), en una rejilla fija
 * de 9 columnas independiente de cómo se vea en pantalla.
 */

const cards = document.querySelectorAll(".bingo-card");
const downloadButton = document.querySelector("#bingo-download");

cards.forEach((card) => {
    card.addEventListener("click", () => {
        const isMarked = card.classList.toggle("is-marked");
        card.setAttribute("aria-pressed", String(isMarked));
    });
});

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

/** Genera un <canvas> con todas las casillas, respetando cuáles están marcadas ahora mismo. */
async function buildBingoCanvas() {
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

    const background = readThemeColor("--background", "#07110c");
    const surface = readThemeColor("--surface", "#0c1911");
    const line = readThemeColor("--line", "#294836");
    const text = readThemeColor("--text", "#e1f2df");
    const muted = readThemeColor("--muted", "#91af99");
    const accent = readThemeColor("--accent", "#a7f56a");

    await Promise.all(Array.from(cards).map((card) => waitForImage(card.querySelector("img"))));

    const canvas = document.createElement("canvas");
    canvas.width = outerPadding * 2 + cols * cellWidth;
    canvas.height = outerPadding * 2 + headerHeight + rows * cellHeight;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const titleByLang = { es: "BINGO", en: "BINGO", jp: "ビンゴ" };
    const canvasTitle = titleByLang[document.documentElement.lang] || "BINGO";

    ctx.textBaseline = "top";
    ctx.fillStyle = text;
    ctx.font = "700 24px monospace";
    ctx.fillText(canvasTitle, outerPadding, outerPadding);
    ctx.fillStyle = muted;
    ctx.font = "12px monospace";
    ctx.fillText("Codex Ignis", outerPadding, outerPadding + 32);

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
        downloadButton.disabled = true;
        try {
            const canvas = await buildBingoCanvas();
            const link = document.createElement("a");
            link.download = "bingo-origenes-stellaris.png";
            link.href = canvas.toDataURL("image/png");
            link.click();
        } finally {
            downloadButton.disabled = false;
        }
    });
}

/**
 * Bingo de orígenes de Stellaris.
 *
 * Cada casilla es un botón: al pulsarla, se marca (o desmarca) visualmente
 * como conseguida. No se guarda el estado entre visitas: al recargar la
 * página, todas las casillas vuelven a estar sin marcar.
 */

const cards = document.querySelectorAll(".bingo-card");

cards.forEach((card) => {
    card.addEventListener("click", () => {
        const isMarked = card.classList.toggle("is-marked");
        card.setAttribute("aria-pressed", String(isMarked));
    });
});

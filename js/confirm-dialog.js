/**
 * Diálogo modal de confirmación con varios botones (P5.7: Guardar / No
 * guardar / Cancelar). Se construye al vuelo, no necesita HTML previo.
 *
 * confirmChoice({ title, message, buttons: [{ id, label, variant? }], cancelId })
 * devuelve una Promesa con el `id` del botón pulsado. Escape o pulsar fuera
 * del cuadro devuelven `cancelId` (por defecto "cancel"). `variant`:
 * "primary" | "danger" (opcional, solo estilo). El foco inicial va al botón
 * de cancelar para que Intro no ejecute por error una acción destructiva.
 */
export function confirmChoice({ title, message, buttons, cancelId = "cancel" }) {
  return new Promise((resolve) => {
    const previouslyFocused = document.activeElement;

    const overlay = document.createElement("div");
    overlay.className = "confirm-overlay";

    const dialog = document.createElement("div");
    dialog.className = "confirm-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "confirm-dialog-title");
    dialog.setAttribute("aria-describedby", "confirm-dialog-message");

    const titleEl = document.createElement("h2");
    titleEl.id = "confirm-dialog-title";
    titleEl.className = "confirm-dialog-title";
    titleEl.textContent = title;

    const messageEl = document.createElement("p");
    messageEl.id = "confirm-dialog-message";
    messageEl.className = "confirm-dialog-message";
    messageEl.textContent = message;

    const actions = document.createElement("div");
    actions.className = "confirm-dialog-actions";

    const buttonEls = buttons.map((button) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = `confirm-btn${button.variant ? ` is-${button.variant}` : ""}`;
      el.textContent = button.label;
      el.addEventListener("click", () => close(button.id));
      actions.append(el);
      return el;
    });

    dialog.append(titleEl, messageEl, actions);
    overlay.append(dialog);

    function close(result) {
      document.removeEventListener("keydown", onKeyDown, true);
      overlay.remove();
      if (previouslyFocused && typeof previouslyFocused.focus === "function") previouslyFocused.focus();
      resolve(result);
    }

    function onKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close(cancelId);
      } else if (event.key === "Tab" && buttonEls.length) {
        // Mantiene el foco dentro del cuadro mientras está abierto.
        const first = buttonEls[0];
        const last = buttonEls[buttonEls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) close(cancelId);
    });
    document.addEventListener("keydown", onKeyDown, true);
    document.body.append(overlay);

    const cancelIndex = buttons.findIndex((button) => button.id === cancelId);
    (buttonEls[cancelIndex] || buttonEls[0]).focus();
  });
}

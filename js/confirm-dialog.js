import { openModal } from "./modal.js";

/**
 * Diálogo modal de confirmación con varios botones (P5.7: Guardar / No
 * guardar / Cancelar). Se construye al vuelo, no necesita HTML previo.
 *
 * confirmChoice({ title, message, buttons: [{ id, label, variant? }], cancelId })
 * devuelve una Promesa con el `id` del botón pulsado. Escape o pulsar fuera
 * del cuadro devuelven `cancelId` (por defecto "cancel"). `variant`:
 * "primary" | "danger" (opcional, solo estilo). El foco inicial va al botón
 * de cancelar para que Intro no ejecute por error una acción destructiva.
 * Overlay, Escape, click outside, focus trap and focus back: js/modal.js (P23.10).
 */
export function confirmChoice({ title, message, buttons, cancelId = "cancel" }) {
  return new Promise((resolve) => {
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
      el.addEventListener("click", () => finish(button.id));
      actions.append(el);
      return el;
    });

    dialog.append(titleEl, messageEl, actions);
    overlay.append(dialog);

    const cancelIndex = buttons.findIndex((button) => button.id === cancelId);
    const close = openModal(overlay, {
      focusables: buttonEls,
      initialFocus: buttonEls[cancelIndex] || buttonEls[0],
      onCancel: () => finish(cancelId)
    });

    function finish(result) {
      close();
      resolve(result);
    }
  });
}

/**
 * Diálogo modal con un campo de texto (P6: renombrar planetas e imperios).
 *
 * promptText({ title, message, value, acceptLabel, cancelLabel, maxLength, validate })
 * devuelve una Promesa con el texto aceptado, o null si se cancela (Escape, clic
 * fuera o botón Cancelar). `validate(texto)` devuelve un mensaje de error (texto)
 * o null/"" si el valor es válido: mientras haya error el cuadro NO se cierra y el
 * mensaje se muestra debajo del campo, así las mismas comprobaciones de nombre
 * (vacío, duplicado) se aplican aquí que al guardar.
 */
export function promptText({ title, message, value = "", acceptLabel, cancelLabel, maxLength = 60, validate }) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "confirm-overlay";

    const dialog = document.createElement("div");
    dialog.className = "confirm-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "prompt-dialog-title");
    dialog.setAttribute("aria-describedby", "prompt-dialog-message");

    const titleEl = document.createElement("h2");
    titleEl.id = "prompt-dialog-title";
    titleEl.className = "confirm-dialog-title";
    titleEl.textContent = title;

    const messageEl = document.createElement("p");
    messageEl.id = "prompt-dialog-message";
    messageEl.className = "confirm-dialog-message";
    messageEl.textContent = message || "";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "empire-profile-name-input confirm-dialog-input";
    input.maxLength = maxLength;
    input.value = value;
    input.setAttribute("aria-labelledby", "prompt-dialog-title");

    const errorEl = document.createElement("p");
    errorEl.className = "confirm-dialog-error";
    errorEl.setAttribute("role", "alert");

    const actions = document.createElement("div");
    actions.className = "confirm-dialog-actions";

    const acceptBtn = document.createElement("button");
    acceptBtn.type = "button";
    acceptBtn.className = "confirm-btn is-primary";
    acceptBtn.textContent = acceptLabel;

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "confirm-btn";
    cancelBtn.textContent = cancelLabel;

    actions.append(acceptBtn, cancelBtn);
    dialog.append(titleEl, messageEl, input, errorEl, actions);
    overlay.append(dialog);

    function finish(result) {
      close();
      resolve(result);
    }

    function accept() {
      const error = validate ? validate(input.value) : null;
      if (error) {
        errorEl.textContent = error;
        input.focus();
        return;
      }
      finish(input.value.trim());
    }

    acceptBtn.addEventListener("click", accept);
    cancelBtn.addEventListener("click", () => finish(null));
    input.addEventListener("input", () => { errorEl.textContent = ""; });
    const close = openModal(overlay, {
      focusables: [input, acceptBtn, cancelBtn],
      onCancel: () => finish(null),
      onKeyDown: (event) => {
        if (event.key === "Enter" && document.activeElement === input) {
          event.preventDefault();
          accept();
        }
      }
    });
    input.select();
  });
}

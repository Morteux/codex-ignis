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
    const previouslyFocused = document.activeElement;

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

    function close(result) {
      document.removeEventListener("keydown", onKeyDown, true);
      overlay.remove();
      if (previouslyFocused && typeof previouslyFocused.focus === "function") previouslyFocused.focus();
      resolve(result);
    }

    function accept() {
      const error = validate ? validate(input.value) : null;
      if (error) {
        errorEl.textContent = error;
        input.focus();
        return;
      }
      close(input.value.trim());
    }

    function onKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close(null);
      } else if (event.key === "Enter" && document.activeElement === input) {
        event.preventDefault();
        accept();
      } else if (event.key === "Tab") {
        // Mantiene el foco dentro del cuadro mientras está abierto.
        const order = [input, acceptBtn, cancelBtn];
        const index = order.indexOf(document.activeElement);
        const next = event.shiftKey ? (index <= 0 ? order.length - 1 : index - 1) : (index === order.length - 1 ? 0 : index + 1);
        event.preventDefault();
        order[next].focus();
      }
    }

    acceptBtn.addEventListener("click", accept);
    cancelBtn.addEventListener("click", () => close(null));
    input.addEventListener("input", () => { errorEl.textContent = ""; });
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) close(null);
    });
    document.addEventListener("keydown", onKeyDown, true);
    document.body.append(overlay);

    input.focus();
    input.select();
  });
}

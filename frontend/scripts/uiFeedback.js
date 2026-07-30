(function () {
  function showToast(message, type, options = {}) {
    const kind = type || "info";
    const actionLabel = String(options.actionLabel || "").trim();
    const actionHref = String(options.actionHref || "").trim();
    const actionOnClick = typeof options.actionOnClick === "function"
      ? options.actionOnClick
      : null;
    const stack = document.getElementById("toast-stack");
    if (!stack) {
      // Fallback for pages without toast container.
      alert(message);
      return;
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${kind}`;
    toast.setAttribute("role", "status");

    const body = document.createElement("div");
    body.className = "toast-body";

    const text = document.createElement("span");
    text.className = "toast-message";
    text.textContent = message;
    body.appendChild(text);

    if (actionLabel && (actionHref || actionOnClick)) {
      const actionEl = actionHref
        ? document.createElement("a")
        : document.createElement("button");

      actionEl.className = "toast-action";
      actionEl.textContent = actionLabel;

      if (actionHref) {
        actionEl.href = actionHref;
      } else {
        actionEl.type = "button";
      }

      if (actionOnClick) {
        actionEl.addEventListener("click", event => {
          event.preventDefault();
          actionOnClick();
        });
      }

      body.appendChild(actionEl);
    }

    toast.appendChild(body);

    stack.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add("visible");
    });

    setTimeout(() => {
      toast.classList.remove("visible");
      setTimeout(() => toast.remove(), 240);
    }, 3200);
  }

  window.showToast = showToast;
})();

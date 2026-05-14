(function () {
  function showToast(message, type) {
    const kind = type || "info";
    const stack = document.getElementById("toast-stack");
    if (!stack) {
      // Fallback for pages without toast container.
      alert(message);
      return;
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${kind}`;
    toast.setAttribute("role", "status");
    toast.textContent = message;

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

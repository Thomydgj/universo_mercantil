document.addEventListener("DOMContentLoaded", () => {
  const runtimeConfig = window.UNIVERSO_CONFIG || {};
  const BACKEND_BASE_URL = (runtimeConfig.backendBaseUrl || "http://localhost:8000").replace(/\/$/, "");
  const SALES_WHATSAPP_NUMBER = runtimeConfig.whatsapp || "";
  const BACKEND_API_KEY = runtimeConfig.apiKey || "";

  const card = document.getElementById("checkout-result-card");
  const syncEl = document.getElementById("checkout-result-sync");
  const titleEl = document.getElementById("checkout-result-title");
  const subtitleEl = document.getElementById("checkout-result-subtitle");
  const txEl = document.getElementById("checkout-result-transaction");
  const detailEl = document.getElementById("checkout-result-detail");
  const whatsappEl = document.getElementById("checkout-result-whatsapp");
  const retryEl = document.getElementById("checkout-result-retry");

  const searchParams = new URLSearchParams(window.location.search);
  const txFromQuery = searchParams.get("id") || searchParams.get("transaction_id") || searchParams.get("transaction-id") || "";
  const referenceFromQuery = searchParams.get("reference") || "";

  const buildHeaders = () => {
    const headers = {};
    if (BACKEND_API_KEY) {
      headers["X-Api-Key"] = BACKEND_API_KEY;
    }
    return headers;
  };

  const setTone = tone => {
    const allowed = ["info", "success", "warning", "error"];
    const safeTone = allowed.includes(tone) ? tone : "info";
    card.classList.remove("checkout-result--info", "checkout-result--success", "checkout-result--warning", "checkout-result--error");
    card.classList.add(`checkout-result--${safeTone}`);
  };

  const setWhatsApp = ({ txId, reference, syncStatus }) => {
    if (!whatsappEl || !SALES_WHATSAPP_NUMBER) {
      return;
    }
    const refText = reference ? ` Pedido: ${reference}.` : "";
    const txText = txId ? ` Transacción: ${txId}.` : "";
    const pendingText = syncStatus === "pending_direct"
      ? " Quiero coordinar el pago directo de inmediato."
      : " Quiero confirmar mi pedido.";
    const message = encodeURIComponent(`Hola, acabo de finalizar el proceso de pago.${refText}${txText}${pendingText}`);
    whatsappEl.href = `https://wa.me/${SALES_WHATSAPP_NUMBER}?text=${message}`;
    whatsappEl.hidden = false;
  };

  const applyPayload = payload => {
    const ui = payload?.ui || {};
    const tone = ui.tone || "info";
    const reference = payload?.reference || referenceFromQuery || "";
    const txId = payload?.transaction_id || txFromQuery || "";
    const displayId = txId || reference || "N/A";
    const syncStatus = ui.sync_status || payload?.sync?.status || "unknown";
    const detail = ui.detail || payload?.sync?.message || payload?.sync?.reason || "Sin detalle adicional";

    if (syncStatus === "ok" || syncStatus === "pending_direct") {
      localStorage.removeItem("carrito");
    }

    setTone(tone);
    syncEl.textContent = `Estado de sincronización: ${syncStatus}`;
    titleEl.textContent = ui.title || "Estamos procesando tu pago";
    subtitleEl.textContent = ui.subtitle || "Tu proceso de checkout fue recibido. Te sugerimos verificar el estado de tu pedido en unos segundos.";
    txEl.textContent = displayId;
    detailEl.textContent = detail;

    setWhatsApp({ txId, reference, syncStatus });
  };

  const setErrorState = message => {
    setTone("error");
    syncEl.textContent = "Estado de sincronización: error";
    titleEl.textContent = "No se pudo validar el pago";
    subtitleEl.textContent = "No logramos consultar el estado del checkout en este momento.";
    txEl.textContent = txFromQuery || "N/A";
    detailEl.textContent = message || "Intenta nuevamente en unos segundos.";
    retryEl.hidden = false;
  };

  const fetchResult = async () => {
    const params = new URLSearchParams(searchParams);
    params.set("format", "json");
    const url = `${BACKEND_BASE_URL}/checkout/resultado?${params.toString()}`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: buildHeaders()
      });

      const raw = await response.text();
      let payload = {};
      try {
        payload = raw ? JSON.parse(raw) : {};
      } catch {
        throw new Error(`Respuesta inválida del servidor (${response.status})`);
      }

      if (!response.ok) {
        throw new Error(payload?.message || `No se pudo consultar el resultado (HTTP ${response.status})`);
      }

      applyPayload(payload);
    } catch (error) {
      setErrorState(error.message || "Error desconocido");
      if (typeof window.showToast === "function") {
        window.showToast("No se pudo consultar el estado de la transacción.", "error");
      }
    }
  };

  retryEl.addEventListener("click", () => {
    retryEl.hidden = true;
    fetchResult();
  });

  fetchResult();
});

// checkout.js
document.addEventListener("DOMContentLoaded", () => {
  const runtimeConfig = window.UNIVERSO_CONFIG || {};
  const BACKEND_BASE_URL = (runtimeConfig.backendBaseUrl || "http://localhost:8000").replace(/\/$/, "");
  const SALES_WHATSAPP_NUMBER = runtimeConfig.whatsapp || "573001234567";
  const BACKEND_API_KEY = runtimeConfig.apiKey || "";

  const buildRequestHeaders = (idempotencyKey = "") => {
    const headers = { "Content-Type": "application/json" };
    if (BACKEND_API_KEY) {
      headers["X-Api-Key"] = BACKEND_API_KEY;
    }
    if (idempotencyKey) {
      headers["X-Idempotency-Key"] = idempotencyKey;
    }
    return headers;
  };

  const buildIdempotencyKey = scope => {
    const baseScope = String(scope || "checkout").replace(/[^a-z0-9_-]/gi, "").toLowerCase() || "checkout";
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return `${baseScope}-${window.crypto.randomUUID()}`;
    }
    const randomPart = Math.random().toString(16).slice(2);
    return `${baseScope}-${Date.now()}-${randomPart}`;
  };

  const notify = (message, type) => {
    if (typeof window.showToast === "function") {
      window.showToast(message, type);
      return;
    }
    alert(message);
  };

  document.addEventListener("click", async event => {
    const btnPagar = event.target.closest(".btn-pagar");
    if (!btnPagar) return;
    event.preventDefault();

    let paymentTab = null;

    const { calcularTotal, calcularSubtotal, carrito } = window.carritoModule || {};

    if (!calcularTotal || !calcularSubtotal || !carrito) {
      notify("No se pudo cargar el carrito. Intenta nuevamente.", "error");
      return;
    }

    if (!window.datosEnvioConfirmados) {
      notify("Debes confirmar primero los datos de envío.", "warning");
      return;
    }

    if (!carrito || carrito.length === 0) {
      notify("Tu carrito está vacío.", "warning");
      return;
    }

    const carritoActual = JSON.parse(localStorage.getItem("carrito")) || carrito;

    const subtotal = calcularSubtotal();
    const shipping_cost = 0;
    const total = subtotal + shipping_cost;
    const amount_in_cents = total * 100;
    const WOMPI_MIN_AMOUNT_IN_CENTS = 150000; // 1500 COP
    const paymentMethod = window.datosEnvioConfirmados?.paymentMethod || "wompi";
    const deliveryType = window.datosEnvioConfirmados?.deliveryType || "shipping";

    if (paymentMethod === "wompi" && amount_in_cents < WOMPI_MIN_AMOUNT_IN_CENTS) {
      const minimoCop = Math.round(WOMPI_MIN_AMOUNT_IN_CENTS / 100);
      const faltanteCop = Math.round((WOMPI_MIN_AMOUNT_IN_CENTS - amount_in_cents) / 100);
      notify(`El monto mínimo para pagar con Wompi es $${minimoCop.toLocaleString("es-CO")}. Te faltan $${faltanteCop.toLocaleString("es-CO")}.`, "warning");
      return;
    }

    const reference = "orden_" + Date.now();
    const customer_email = document.getElementById("email")?.value || "cliente@ejemplo.com";
    const idempotencyKey = buildIdempotencyKey(paymentMethod === "direct" ? "direct-payment" : "checkout");

    const buyer = {
      nombre: window.datosEnvioConfirmados?.nombre || "",
      apellidos: window.datosEnvioConfirmados?.apellidos || "",
      numero_documento: window.datosEnvioConfirmados?.numeroDocumento || "",
      telefono: window.datosEnvioConfirmados?.telefono || "",
      email: customer_email
    };

    const shipping_address = {
      departamento: window.datosEnvioConfirmados?.departamento || "",
      ciudad: window.datosEnvioConfirmados?.ciudad || "",
      direccion: window.datosEnvioConfirmados?.direccion || "",
      detalle_direccion: window.datosEnvioConfirmados?.detalleDireccion || ""
    };

    const items = carritoActual.map(item => {
      const precio = Number(item.precio) || 0;
      const cantidad = Number(item.cantidad) || 1;
      const productId = item.id ? String(item.id) : "";
      return {
        id: productId,
        sku: item.sku || item.cartKey || (item.varianteId ? `${productId}::${item.varianteId}` : productId),
        nombre: item.nombre,
        variante_id: item.varianteId || null,
        variante_nombre: item.varianteNombre || null,
        cantidad,
        precio,
        subtotal: precio * cantidad,
        imagen: item.imagen || "",
        product_url: productId ? `detalles?id=${encodeURIComponent(productId)}` : ""
      };
    });

    const payload = {
      amount_in_cents,
      currency: "COP",
      reference,
      customer_email,
      name: "Compra en carrito",
      description: `Compra de ${items.length} productos`,
      collect_shipping: true,
      single_use: true,
      subtotal,
      shipping_cost,
      shipping_zone: window.datosEnvioConfirmados?.shippingZone || "Envío a convenir con el cliente",
      delivery_type: deliveryType,
      payment_method: paymentMethod,
      shipping_message: window.datosEnvioConfirmados?.shippingMessage || "Nos contactaremos contigo para convenir el envío según tus necesidades específicas.",
      pickup_message: window.datosEnvioConfirmados?.pickupMessage || "",
      buyer,
      shipping_address: deliveryType === "pickup" ? {} : shipping_address,
      items
    };

    try {
      if (paymentMethod === "direct") {
        notify("Creando pedido con pago pendiente...", "info");
        const directRes = await fetch(`${BACKEND_BASE_URL}/order/create-for-payment`, {
          method: "POST",
          headers: buildRequestHeaders(idempotencyKey),
          body: JSON.stringify(payload)
        });

        const directRaw = await directRes.text();
        let directData = {};
        try {
          directData = directRaw ? JSON.parse(directRaw) : {};
        } catch {
          throw new Error(`Respuesta inválida del servidor (${directRes.status})`);
        }

        if (!directRes.ok) {
          throw new Error(directData?.message || `No se pudo crear el pedido (HTTP ${directRes.status})`);
        }

        const orderRef = directData?.reference || reference;
        const nombre = `${buyer.nombre} ${buyer.apellidos}`.trim();
        const mensaje = encodeURIComponent(
          `Hola, acabo de crear el pedido ${orderRef}. Pago pendiente. Cliente: ${nombre || "N/A"}. Total: $${total.toLocaleString("es-CO")}. Quiero coordinar el pago directo.`
        );

        notify(`Pedido ${orderRef} creado con estado pendiente. Te redirigimos a WhatsApp.`, "success");
        setTimeout(() => {
          window.open(`https://wa.me/${SALES_WHATSAPP_NUMBER}?text=${mensaje}`, "_blank", "noopener");
        }, 900);
        return;
      }

      // Open the tab at click-time (before await) so browsers don't block it.
      paymentTab = window.open("about:blank", "_blank");
      if (paymentTab && paymentTab.document) {
        paymentTab.document.title = "Redirigiendo a pago";
        paymentTab.document.body.innerHTML = "<p style='font-family: sans-serif; padding: 24px;'>Preparando checkout seguro...</p>";
      }

      notify("Preparando enlace de pago...", "info");

      const res = await fetch(`${BACKEND_BASE_URL}/checkout`, {
        method: "POST",
        headers: buildRequestHeaders(idempotencyKey),
        body: JSON.stringify(payload)
      });

      const raw = await res.text();
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        throw new Error(`Respuesta inválida del servidor (${res.status})`);
      }

      if (!res.ok) {
        const backendMessage = data?.message || data?.error?.reason || data?.error?.messages || "Error en backend al crear el pago";
        throw new Error(`${backendMessage} (HTTP ${res.status})`);
      }

      const checkoutUrl = data?.checkout_url || (data?.data?.id ? `https://checkout.wompi.co/l/${data.data.id}` : null);

      if (!checkoutUrl) {
        throw new Error("No se recibió checkout_url desde backend");
      }

      if (paymentTab && !paymentTab.closed) {
        paymentTab.location.replace(checkoutUrl);
        paymentTab.opener = null;
      } else {
        window.location.assign(checkoutUrl);
      }
    } catch (err) {
      if (paymentTab && !paymentTab.closed) {
        paymentTab.close();
      }
      console.error("Error al crear el Payment Link:", err);
      notify(`No se pudo iniciar el pago: ${err.message || "error desconocido"}`, "error");
    }
  });
});

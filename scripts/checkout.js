// checkout.js
document.addEventListener("DOMContentLoaded", () => {
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

    const { calcularTotal, carrito } = window.carritoModule || {};

    if (!calcularTotal || !carrito) {
      notify("No se pudo cargar el carrito. Intenta nuevamente.", "error");
      return;
    }

    if (!window.datosEnvioConfirmados) {
      notify("Debes confirmar primero los datos de envio.", "warning");
      return;
    }

    if (!carrito || carrito.length === 0) {
      notify("Tu carrito esta vacio.", "warning");
      return;
    }

    const carritoActual = JSON.parse(localStorage.getItem("carrito")) || carrito;

    const amount_in_cents = calcularTotal() * 100;
    const WOMPI_MIN_AMOUNT_IN_CENTS = 150000; // 1500 COP

    if (amount_in_cents < WOMPI_MIN_AMOUNT_IN_CENTS) {
      const minimoCop = Math.round(WOMPI_MIN_AMOUNT_IN_CENTS / 100);
      const faltanteCop = Math.round((WOMPI_MIN_AMOUNT_IN_CENTS - amount_in_cents) / 100);
      notify(`El monto minimo para pagar con Wompi es $${minimoCop.toLocaleString("es-CO")}. Te faltan $${faltanteCop.toLocaleString("es-CO")}.`, "warning");
      return;
    }

    const reference = "orden_" + Date.now();
    const customer_email = document.getElementById("email")?.value || "cliente@ejemplo.com";

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
      return {
        id: item.id,
        nombre: item.nombre,
        cantidad,
        precio,
        subtotal: precio * cantidad
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
      buyer,
      shipping_address,
      items
    };

    try {
      // Open the tab at click-time (before await) so browsers don't block it.
      paymentTab = window.open("about:blank", "_blank");
      if (paymentTab && paymentTab.document) {
        paymentTab.document.title = "Redirigiendo a pago";
        paymentTab.document.body.innerHTML = "<p style='font-family: sans-serif; padding: 24px;'>Preparando checkout seguro...</p>";
      }

      notify("Preparando enlace de pago...", "info");

      const res = await fetch("https://f67a-181-234-90-245.ngrok-free.app/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const raw = await res.text();
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        throw new Error(`Respuesta invalida del servidor (${res.status})`);
      }

      if (!res.ok) {
        const backendMessage = data?.message || data?.error?.reason || data?.error?.messages || "Error en backend al crear el pago";
        throw new Error(`${backendMessage} (HTTP ${res.status})`);
      }

      const checkoutUrl = data?.checkout_url || (data?.data?.id ? `https://checkout.wompi.co/l/${data.data.id}` : null);

      if (!checkoutUrl) {
        throw new Error("No se recibio checkout_url desde backend");
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

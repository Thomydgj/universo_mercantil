// confirmarEnvio.js
document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector(".checkout-form");
  if (!form) return;

  const carritoContenedor = document.getElementById("container-tarjetas-carrito");
  const notify = (message, type) => {
    if (typeof window.showToast === "function") {
      window.showToast(message, type);
      return;
    }
    alert(message);
  };

  let datosEnvioConfirmados = null;
  const deliveryRadios = document.querySelectorAll("input[name='delivery-type']");
  const deliveryFields = document.querySelectorAll(".delivery-field input, .delivery-field select");
  const pickupInfo = document.getElementById("pickup-info");

  function obtenerDeliveryType() {
    return document.querySelector("input[name='delivery-type']:checked")?.value || "shipping";
  }

  function obtenerPaymentMethod() {
    return document.querySelector("input[name='payment-method']:checked")?.value || "wompi";
  }

  function actualizarModoEntrega() {
    const deliveryType = obtenerDeliveryType();
    const esPickup = deliveryType === "pickup";

    deliveryFields.forEach(field => {
      if (esPickup) {
        field.removeAttribute("required");
        field.setAttribute("disabled", "true");
      } else {
        field.setAttribute("required", "true");
        field.removeAttribute("disabled");
      }
    });

    if (pickupInfo) {
      pickupInfo.hidden = !esPickup;
    }

    if (window.checkoutShipping) {
      window.checkoutShipping.setDeliveryType(deliveryType);
    }
  }

  function sincronizarBotonComprar() {
    const btnComprar = document.querySelector(".btn-pagar");
    if (!btnComprar) return;

    if (datosEnvioConfirmados) {
      btnComprar.removeAttribute("disabled");
      btnComprar.removeAttribute("title");
    } else {
      btnComprar.setAttribute("disabled", "true");
      btnComprar.setAttribute("title", "Debes completar los datos de envio");
    }
  }

  // Escucha cambios en el carrito (cuando se re-renderiza)
  if (carritoContenedor) {
    const observer = new MutationObserver(() => {
      sincronizarBotonComprar();
    });
    observer.observe(carritoContenedor, { childList: true, subtree: true });
  }

  sincronizarBotonComprar();
  actualizarModoEntrega();

  deliveryRadios.forEach(radio => {
    radio.addEventListener("change", () => {
      if (!datosEnvioConfirmados) {
        actualizarModoEntrega();
      }
    });
  });

  form.addEventListener("submit", e => {
    e.preventDefault();

    // Capturar valores
    const nombre = document.getElementById("nombre").value.trim();
    const apellidos = document.getElementById("apellidos").value.trim();
    const numeroDocumento = document.getElementById("numero-documento").value.trim();
    const telefono = document.getElementById("telefono").value.trim();
    const email = document.getElementById("email").value.trim();
    const deliveryType = obtenerDeliveryType();
    const paymentMethod = obtenerPaymentMethod();
    const departamento = document.getElementById("departamento").value;
    const ciudad = document.getElementById("ciudad").value;
    const direccion = document.getElementById("direccion").value.trim();
    const detalleDireccion = document.getElementById("detalle-direccion").value.trim();

    // Validación de teléfono: exactamente 10 dígitos
    const telefonoValido = /^\d{10}$/.test(telefono);
    const documentoValido = /^\d{5,20}$/.test(numeroDocumento);

    const envioValido = deliveryType === "pickup" || (departamento && ciudad && direccion);

    if (!nombre || !apellidos || !documentoValido || !telefonoValido || !email || !envioValido) {
      notify("Completa todos los campos y verifica documento (5-20 digitos) y telefono (10 digitos).", "warning");
      return;
    }

    const state = window.checkoutShipping?.getState?.() || window.checkoutState || {};
    const shippingCost = deliveryType === "pickup" ? 0 : Number(state.shippingCost || 0);
    const shippingZone = deliveryType === "pickup" ? "Recoger en tienda" : (state.shippingZone || "Zona Nacional");

    // Guardar datos confirmados
    datosEnvioConfirmados = {
      nombre,
      apellidos,
      numeroDocumento,
      telefono,
      email,
      deliveryType,
      paymentMethod,
      departamento: deliveryType === "pickup" ? "" : departamento,
      ciudad: deliveryType === "pickup" ? "" : ciudad,
      direccion: deliveryType === "pickup" ? "" : direccion,
      detalleDireccion: deliveryType === "pickup" ? "" : detalleDireccion,
      shippingCost,
      shippingZone,
      pickupMessage: "Tu pedido estara disponible para entrega en tienda en 5 horas habiles, direccion: Cl. 21 # 22-10 local 102, Comuna 4 Occidental, Bucaramanga, Santander."
    };

    // Bloquear inputs
    [...form.elements].forEach(el => {
      if (el.tagName === "INPUT" || el.tagName === "SELECT") {
        el.setAttribute("disabled", "true");
      }
    });

    sincronizarBotonComprar();

    notify("Datos confirmados. Ya puedes finalizar tu pedido.", "success");

    // Exponer para checkout.js
    window.datosEnvioConfirmados = datosEnvioConfirmados;
  });
});

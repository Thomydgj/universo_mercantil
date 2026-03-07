// confirmarEnvio.js
document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector(".checkout-form");
  const carritoContenedor = document.getElementById("container-tarjetas-carrito");
  const notify = (message, type) => {
    if (typeof window.showToast === "function") {
      window.showToast(message, type);
      return;
    }
    alert(message);
  };

  let datosEnvioConfirmados = null;

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

  form.addEventListener("submit", e => {
    e.preventDefault();

    // Capturar valores
    const nombre = document.getElementById("nombre").value.trim();
    const apellidos = document.getElementById("apellidos").value.trim();
    const numeroDocumento = document.getElementById("numero-documento").value.trim();
    const telefono = document.getElementById("telefono").value.trim();
    const email = document.getElementById("email").value.trim();
    const departamento = document.getElementById("departamento").value;
    const ciudad = document.getElementById("ciudad").value;
    const direccion = document.getElementById("direccion").value.trim();
    const detalleDireccion = document.getElementById("detalle-direccion").value.trim();

    // Validación de teléfono: exactamente 10 dígitos
    const telefonoValido = /^\d{10}$/.test(telefono);
    const documentoValido = /^\d{5,20}$/.test(numeroDocumento);

    if (!nombre || !apellidos || !documentoValido || !telefonoValido || !email || !departamento || !ciudad || !direccion) {
      notify("Completa todos los campos y verifica documento (5-20 digitos) y telefono (10 digitos).", "warning");
      return;
    }

    // Guardar datos confirmados
    datosEnvioConfirmados = {
      nombre,
      apellidos,
      numeroDocumento,
      telefono,
      email,
      departamento,
      ciudad,
      direccion,
      detalleDireccion
    };

    // Bloquear inputs
    [...form.elements].forEach(el => {
      if (el.tagName === "INPUT" || el.tagName === "SELECT") {
        el.setAttribute("disabled", "true");
      }
    });

    sincronizarBotonComprar();

    notify("Datos de envio confirmados. Ahora puedes proceder con la compra.", "success");
    console.log("Datos de envío confirmados:", datosEnvioConfirmados);

    // Exponer para checkout.js
    window.datosEnvioConfirmados = datosEnvioConfirmados;
  });
});

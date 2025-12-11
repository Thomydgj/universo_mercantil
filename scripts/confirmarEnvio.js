// confirmarEnvio.js
document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector(".checkout-form");
  const btnConfirmar = form.querySelector("button[type='submit']");
  const btnComprar = document.querySelector(".btn-pagar"); // creado en loadCarrito.js

  let datosEnvioConfirmados = null;

  form.addEventListener("submit", e => {
    e.preventDefault();

    // Capturar valores
    const nombre = document.getElementById("nombre").value.trim();
    const apellidos = document.getElementById("apellidos").value.trim();
    const telefono = document.getElementById("telefono").value.trim();
    const email = document.getElementById("email").value.trim();
    const departamento = document.getElementById("departamento").value;
    const ciudad = document.getElementById("ciudad").value;
    const direccion = document.getElementById("direccion").value.trim();
    const detalleDireccion = document.getElementById("detalle-direccion").value.trim();

    // Validación de teléfono: exactamente 10 dígitos
    const telefonoValido = /^\d{10}$/.test(telefono);

    if (!nombre || !apellidos || !telefonoValido || !email || !departamento || !ciudad || !direccion) {
      alert("Por favor completa todos los campos requeridos y asegúrate que el teléfono tenga 10 dígitos.");
      return;
    }

    // Guardar datos confirmados
    datosEnvioConfirmados = {
      nombre,
      apellidos,
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

    // Habilitar botón COMPRAR y quitar tooltip
    if (btnComprar) {
      btnComprar.removeAttribute("disabled");
      btnComprar.removeAttribute("title");
    }

    alert("Datos de envío confirmados. Ahora puedes proceder con la compra.");
    console.log("Datos de envío confirmados:", datosEnvioConfirmados);

    // Exponer para checkout.js
    window.datosEnvioConfirmados = datosEnvioConfirmados;
  });

  // Inicialmente deshabilitar el botón COMPRAR y poner tooltip
  if (btnComprar) {
    btnComprar.setAttribute("disabled", "true");
    btnComprar.setAttribute("title", "Debes completar los datos de envío");
  }
});

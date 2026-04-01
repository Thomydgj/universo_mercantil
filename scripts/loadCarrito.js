// loadCarrito.js
document.addEventListener("DOMContentLoaded", () => {
  const contenedor = document.getElementById("container-tarjetas-carrito");
  const template = document.getElementById("template-carrito");

  let carrito = JSON.parse(localStorage.getItem("carrito")) || [];

  function obtenerEstadoCheckout() {
    if (window.checkoutShipping?.getState) {
      return window.checkoutShipping.getState();
    }
    return window.checkoutState || {};
  }

  function obtenerCostoEnvio() {
    return Number(obtenerEstadoCheckout().shippingCost || 0);
  }

  function obtenerZonaEnvio() {
    return obtenerEstadoCheckout().shippingZone || "Zona nacional";
  }

  function renderCarrito() {
    contenedor.innerHTML = "";

    carrito.forEach(prod => {
      const itemKey = prod.cartKey || (prod.varianteId ? `${prod.id}::${prod.varianteId}` : prod.id);
      const clone = template.content.cloneNode(true);

      // Rellenar datos
      clone.querySelector("img").src = prod.imagen;
      clone.querySelector(".nombre-carrito").textContent = prod.nombre;
      clone.querySelector(".precio-carrito").textContent = `$${Number(prod.precio).toLocaleString("es-CO")}`;
      const varianteNodo = clone.querySelector(".variante-carrito");
      if (varianteNodo && prod.varianteNombre) {
        varianteNodo.hidden = false;
        varianteNodo.textContent = `Variante: ${prod.varianteNombre}`;
      }
      const inputCantidad = clone.querySelector("input[type='number']");
      inputCantidad.value = prod.cantidad;

      // Validar cantidad mínima = 1
      // Evento input: permite borrar y escribir libremente
      inputCantidad.addEventListener("input", e => {
        const valor = parseInt(e.target.value, 10);
        if (!isNaN(valor) && valor >= 1) {
          prod.cantidad = valor;
          localStorage.setItem("carrito", JSON.stringify(carrito));
          actualizarTotal();
        }
      }); 

      // Evento blur: corrige si quedó vacío o inválido
      inputCantidad.addEventListener("blur", e => {
        let valor = parseInt(e.target.value, 10);
        if (isNaN(valor) || valor < 1) {
          valor = 1;
        }
        prod.cantidad = valor;
        e.target.value = valor;
        localStorage.setItem("carrito", JSON.stringify(carrito));
        actualizarTotal();
      });

      // Botón eliminar
      const btnEliminar = clone.querySelector(".btn-eliminar");
      if (btnEliminar) {
        btnEliminar.addEventListener("click", () => {
          carrito = carrito.filter(p => {
            const key = p.cartKey || (p.varianteId ? `${p.id}::${p.varianteId}` : p.id);
            return key !== itemKey;
          });
          localStorage.setItem("carrito", JSON.stringify(carrito));
          renderCarrito();
        });
      }

      contenedor.appendChild(clone);
    });

    // Bloque total
    if (carrito.length > 0) {
      const totalDiv = document.createElement("div");
      totalDiv.classList.add("precio-pedido");
      totalDiv.innerHTML = `
        <p class="total-line">Subtotal: <strong class="subtotal-pedido">$${calcularSubtotal().toLocaleString("es-CO")}</strong></p>
        <p class="total-line">Envio: <strong class="envio-pedido">$${obtenerCostoEnvio().toLocaleString("es-CO")}</strong></p>
        <p class="total-zone">Zona: <span class="zona-pedido">${obtenerZonaEnvio()}</span></p>
        <h3 class="total-pedido">Total del pedido: <span class="total-pedido-valor">$${calcularTotal().toLocaleString("es-CO")}</span></h3>
        <button type="button" class="btn-pagar">COMPRAR</button>
      `;
      contenedor.appendChild(totalDiv);
    } else {
      // Si el carrito está vacío
      const vacio = document.createElement("p");
      vacio.textContent = "Tu carrito está vacío.";
      contenedor.appendChild(vacio);
    }
  }

  function calcularSubtotal() {
    return carrito.reduce((acc, prod) => acc + prod.precio * prod.cantidad, 0);
  }

  function calcularTotal() {
    return calcularSubtotal() + obtenerCostoEnvio();
  }

  function actualizarTotal() {
    const subtotalNodo = contenedor.querySelector(".subtotal-pedido");
    const envioNodo = contenedor.querySelector(".envio-pedido");
    const zonaNodo = contenedor.querySelector(".zona-pedido");
    const totalNodo = contenedor.querySelector(".total-pedido-valor");

    if (subtotalNodo) subtotalNodo.textContent = `$${calcularSubtotal().toLocaleString("es-CO")}`;
    if (envioNodo) envioNodo.textContent = `$${obtenerCostoEnvio().toLocaleString("es-CO")}`;
    if (zonaNodo) zonaNodo.textContent = obtenerZonaEnvio();
    if (totalNodo) totalNodo.textContent = `$${calcularTotal().toLocaleString("es-CO")}`;
  }

  // Exponer funciones y carrito para otros módulos
  window.carritoModule = {
    renderCarrito,
    calcularSubtotal,
    calcularTotal,
    carrito
  };

  document.addEventListener("shipping:updated", () => {
    actualizarTotal();
  });

  window.addEventListener("shipping:updated", () => {
    actualizarTotal();
  });

  renderCarrito();
});


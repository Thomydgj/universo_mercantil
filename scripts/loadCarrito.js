// loadCarrito.js
document.addEventListener("DOMContentLoaded", () => {
  const contenedor = document.getElementById("container-tarjetas-carrito");
  const template = document.getElementById("template-carrito");

  let carrito = JSON.parse(localStorage.getItem("carrito")) || [];

  function renderCarrito() {
    contenedor.innerHTML = "";

    carrito.forEach(prod => {
      const clone = template.content.cloneNode(true);

      // Rellenar datos
      clone.querySelector("img").src = prod.imagen;
      clone.querySelector(".nombre-carrito").textContent = prod.nombre;
      clone.querySelector(".precio-carrito").textContent = `$${prod.precio.toLocaleString()}`;
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
          carrito = carrito.filter(p => p.id !== prod.id);
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
        <h3 class="total-pedido">Total del pedido: $${calcularTotal().toLocaleString()}</h3>
        <button class="btn-pagar">COMPRAR</button>
      `;
      contenedor.appendChild(totalDiv);
    } else {
      // Si el carrito está vacío
      const vacio = document.createElement("p");
      vacio.textContent = "Tu carrito está vacío.";
      contenedor.appendChild(vacio);
    }
  }

  function calcularTotal() {
    return carrito.reduce((acc, prod) => acc + prod.precio * prod.cantidad, 0);
  }

  function actualizarTotal() {
    const totalDiv = contenedor.querySelector(".precio-pedido h3");
    if (totalDiv) {
      totalDiv.textContent = `Total del pedido: $${calcularTotal().toLocaleString()}`;
    }
  }

  // Exponer funciones y carrito para otros módulos
  window.carritoModule = {
    renderCarrito,
    calcularTotal,
    carrito
  };

  renderCarrito();
});


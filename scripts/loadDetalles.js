// Selecciona el contenedor y el template
const container = document.getElementById("container-detalles-producto");
const template = document.getElementById("template-detalle");
const detalleBreadcrumb = document.getElementById("detalle-breadcrumb");
const detalleTitulo = document.getElementById("detalle-titulo");
const detalleSubtitulo = document.getElementById("detalle-subtitulo");
const notify = (message, type) => {
  if (typeof window.showToast === "function") {
    window.showToast(message, type);
    return;
  }
  alert(message);
};

// Obtiene el parámetro "id" de la URL (ejemplo: producto.html?id=amipak1)
const params = new URLSearchParams(window.location.search);
const idSeleccionado = params.get("id");

// Busca el producto en el array productos (definido en productos.js)
const producto = productos.find(p => p.id === idSeleccionado);

const nombresCategorias = {
  "carnicos": "Carnicos",
  "cafe-chocolate": "Cafe y Chocolate",
  "alimentos-preparados": "Alimentos Preparados",
  "panaderia": "Panaderia",
  "snacks": "Snacks",
  "mascotas": "Mascotas"
};

if (producto) {
  // Clona el contenido del template
  const card = template.content.cloneNode(true);

  const variantes = Array.isArray(producto.variantes) ? producto.variantes : [];
  const variantesNormalizadas = variantes
    .filter(variante => variante && (variante.nombre || variante.id || variante.color))
    .map((variante, index) => ({
      ...variante,
      key: variante.id || `variante-${index + 1}`,
      etiqueta: variante.color ? `${variante.nombre || `Variante ${index + 1}`} - Color ${variante.color}` : (variante.nombre || `Variante ${index + 1}`)
    }));
  const tieneVariantes = variantesNormalizadas.length > 0;
  const MAX_VARIANTES_CHIPS = 7;
  let varianteActivaKey = tieneVariantes ? variantesNormalizadas[0].key : null;

  // Rellena nombre, descripción y precio
  card.querySelector(".nombre-producto").textContent = producto.nombre;
  const descripcionNodo = card.querySelector(".descripcion-larga-producto");
  const precioNodo = card.querySelector(".precio-producto");
  const referenciaNodo = card.querySelector(".detalle-referencia");

  const categoriaPrincipal = producto.categorias && producto.categorias.length
    ? producto.categorias[0]
    : null;

  const categoriaNombre = categoriaPrincipal
    ? (nombresCategorias[categoriaPrincipal] || categoriaPrincipal)
    : "General";

  card.querySelector(".detalle-categoria").textContent = `Categoria: ${categoriaNombre}`;

  if (detalleTitulo) {
    detalleTitulo.textContent = producto.nombre;
  }

  if (detalleSubtitulo) {
    detalleSubtitulo.textContent = `Conoce caracteristicas, beneficios y opciones de compra para ${producto.nombre}.`;
  }

  if (detalleBreadcrumb) {
    const rutaCategoria = categoriaPrincipal
      ? `/productos.html?categoria=${categoriaPrincipal}`
      : "/productos.html";
    detalleBreadcrumb.innerHTML = `<a href="/principal.html">Inicio</a> / <a href="/productos.html">Productos</a> / <a href="${rutaCategoria}">${categoriaNombre}</a> / ${producto.nombre}`;
  }

  document.title = `${producto.nombre} - Universo Mercantil`;

  const varianteWrap = card.querySelector(".selector-variante-wrap");
  const chipsVariantes = card.querySelector(".variantes-chips");
  const etiquetaSelectVariante = card.querySelector(".selector-variante-label");
  const selectVariante = card.querySelector(".selector-variante");
  const ayudaVariantes = card.querySelector(".selector-variante-ayuda");

  if (tieneVariantes && varianteWrap && chipsVariantes && etiquetaSelectVariante && selectVariante && ayudaVariantes) {
    varianteWrap.hidden = false;

    const usarChips = variantesNormalizadas.length <= MAX_VARIANTES_CHIPS;

    if (usarChips) {
      etiquetaSelectVariante.hidden = true;
      selectVariante.hidden = true;
      ayudaVariantes.hidden = true;

      variantesNormalizadas.forEach((variante, index) => {
        const botonVariante = document.createElement("button");
        botonVariante.type = "button";
        botonVariante.className = "variante-chip";
        botonVariante.dataset.varianteKey = variante.key;
        botonVariante.textContent = variante.etiqueta;
        botonVariante.setAttribute("role", "radio");
        chipsVariantes.appendChild(botonVariante);
      });
    } else {
      chipsVariantes.hidden = true;
      etiquetaSelectVariante.hidden = false;
      selectVariante.hidden = false;
      ayudaVariantes.hidden = false;
      ayudaVariantes.textContent = "Este producto tiene muchas variantes. Usa la lista para encontrar rapido la opcion que necesitas.";

      variantesNormalizadas.forEach((variante, index) => {
        const option = document.createElement("option");
        option.value = variante.key;
        option.textContent = variante.etiqueta;
        selectVariante.appendChild(option);
      });

      selectVariante.value = varianteActivaKey;
    }
  }

  function obtenerVarianteSeleccionada() {
    if (!tieneVariantes) return null;
    return variantesNormalizadas.find(v => v.key === varianteActivaKey) || variantesNormalizadas[0] || null;
  }

  function actualizarEstadoVisualVariantes() {
    if (!chipsVariantes || chipsVariantes.hidden) return;
    const chips = chipsVariantes.querySelectorAll(".variante-chip");
    chips.forEach(chip => {
      const activa = chip.dataset.varianteKey === varianteActivaKey;
      chip.classList.toggle("is-active", activa);
      chip.setAttribute("aria-checked", activa ? "true" : "false");
    });
  }

  function obtenerImagenesActivas(variante) {
    if (variante && Array.isArray(variante.imagenes) && variante.imagenes.length) {
      return variante.imagenes;
    }
    if (Array.isArray(producto.imagenes) && producto.imagenes.length) {
      return producto.imagenes;
    }
    return [];
  }

  function actualizarInformacionProducto(variante) {
    const descripcion = variante?.descripcionLarga || producto.descripcionLarga;
    const precio = Number(variante?.precio ?? producto.precio);
    const refBase = producto.id.toUpperCase();
    const refVariante = variante?.id ? `-${String(variante.id).toUpperCase()}` : "";

    descripcionNodo.textContent = descripcion;
    precioNodo.textContent = `$${precio.toLocaleString("es-CO")}`;
    referenciaNodo.textContent = `Ref: ${refBase}${refVariante}`;

    const etiquetaVariante = variante?.etiqueta ? ` - ${variante.etiqueta}` : "";
    const textoWhatsApp = encodeURIComponent(
      `Hola, quiero informacion sobre ${producto.nombre}${etiquetaVariante} (ref: ${producto.id}).`
    );

    if (btnWhatsApp) {
      btnWhatsApp.href = `https://wa.me/?text=${textoWhatsApp}`;
    }
  }

  // Renderiza las imágenes en el carrusel
  const track = card.querySelector(".carrusel-fila");
  const prevButton = card.querySelector(".prev");
  const nextButton = card.querySelector(".next");
  let slides = [];
  let currentIndex = 0;

  function renderizarCarousel(imagenes, nombreMostrar) {
    track.innerHTML = "";

    imagenes.forEach(src => {
      const img = document.createElement("img");
      img.src = src;
      img.alt = nombreMostrar;
      img.loading = "lazy";
      track.appendChild(img);
    });

    slides = Array.from(track.children);
    currentIndex = 0;

    if (slides.length <= 1) {
      prevButton.style.display = "none";
      nextButton.style.display = "none";
    } else {
      prevButton.style.display = "inline-flex";
      nextButton.style.display = "inline-flex";
    }

    updateCarousel();
  }

  function updateCarousel() {
    if (!slides.length) {
      track.style.transform = "translateX(0)";
      return;
    }
    const width = slides[0].getBoundingClientRect().width;
    track.style.transform = `translateX(-${currentIndex * width}px)`;
  }

  window.addEventListener("resize", updateCarousel);

  nextButton.addEventListener("click", () => {
    if (currentIndex < slides.length - 1) {
      currentIndex++;
      updateCarousel();
    }
  });

  prevButton.addEventListener("click", () => {
    if (currentIndex > 0) {
      currentIndex--;
      updateCarousel();
    }
  });

  // Botones de acción
  const inputCantidad = card.querySelector(".cantidad-producto");
  const btnAgregar = card.querySelector(".btn-agregar");
  const btnComprar = card.querySelector(".btn-comprar");
  const btnWhatsApp = card.querySelector(".btn-whatsapp");

  const varianteInicial = obtenerVarianteSeleccionada();
  actualizarInformacionProducto(varianteInicial);
  actualizarEstadoVisualVariantes();
  renderizarCarousel(obtenerImagenesActivas(varianteInicial), producto.nombre);

  function aplicarVarianteSeleccionada() {
    const varianteActiva = obtenerVarianteSeleccionada();
    actualizarInformacionProducto(varianteActiva);
    actualizarEstadoVisualVariantes();
    renderizarCarousel(obtenerImagenesActivas(varianteActiva), `${producto.nombre} ${varianteActiva?.nombre || ""}`.trim());
  }

  if (tieneVariantes && chipsVariantes && !chipsVariantes.hidden) {
    chipsVariantes.addEventListener("click", event => {
      const boton = event.target.closest(".variante-chip");
      if (!boton) return;
      varianteActivaKey = boton.dataset.varianteKey;
      aplicarVarianteSeleccionada();
    });
  }

  if (tieneVariantes && selectVariante && !selectVariante.hidden) {
    selectVariante.addEventListener("change", () => {
      varianteActivaKey = selectVariante.value;
      aplicarVarianteSeleccionada();
    });
  }

  // Función reutilizable para agregar al carrito
  function agregarProductoAlCarrito(producto, cantidad) {
    if (!Number.isInteger(cantidad) || cantidad < 1) {
      notify("Ingresa una cantidad valida.", "warning");
      inputCantidad.value = 1;
      return;
    }

    const varianteActiva = obtenerVarianteSeleccionada();
    const imagenesActivas = obtenerImagenesActivas(varianteActiva);
    const cartKey = varianteActiva?.key ? `${producto.id}::${varianteActiva.key}` : producto.id;

    const productoCarrito = {
      cartKey,
      id: producto.id,
      nombre: producto.nombre,
      precio: Number(varianteActiva?.precio ?? producto.precio),
      cantidad,
      imagen: imagenesActivas[0] || "",
      varianteId: varianteActiva?.key || null,
      varianteNombre: varianteActiva?.nombre || null
    };

    let carrito = JSON.parse(localStorage.getItem("carrito")) || [];

    const existe = carrito.find(p => {
      const key = p.cartKey || (p.varianteId ? `${p.id}::${p.varianteId}` : p.id);
      return key === productoCarrito.cartKey;
    });
    if (existe) {
      existe.cantidad += cantidad;
    } else {
      carrito.push(productoCarrito);
    }

    localStorage.setItem("carrito", JSON.stringify(carrito));
    notify("Producto agregado al carrito", "success");
  }

  // Botón AGREGAR
  btnAgregar.addEventListener("click", () => {
    const cantidad = parseInt(inputCantidad.value, 10);
    agregarProductoAlCarrito(producto, cantidad);
  });

  // Botón COMPRAR
  btnComprar.addEventListener("click", () => {
    const cantidad = parseInt(inputCantidad.value, 10);
    agregarProductoAlCarrito(producto, cantidad);

    // Redirigir al carrito
    window.location.href = "/carrito.html"; // ajusta la ruta según tu proyecto
  });

  // Inserta el card en el contenedor
  container.appendChild(card);
} else {
  container.textContent = "Producto no encontrado.";
  if (detalleTitulo) {
    detalleTitulo.textContent = "Producto no disponible";
  }
  if (detalleSubtitulo) {
    detalleSubtitulo.textContent = "No encontramos el producto solicitado. Explora otras opciones del catalogo.";
  }
}

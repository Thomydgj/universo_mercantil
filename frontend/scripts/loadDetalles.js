document.addEventListener("DOMContentLoaded", async () => {
if (typeof cargarManifestImagenesNuevas === "function") {
  await cargarManifestImagenesNuevas();
}

// Selecciona el contenedor y el template
const container = document.getElementById("container-detalles-producto");
const template = document.getElementById("template-detalle");
const detalleBreadcrumb = document.getElementById("detalle-breadcrumb");
const detalleTitulo = document.getElementById("detalle-titulo");
const detalleSubtitulo = document.getElementById("detalle-subtitulo");
const runtimeConfig = window.UNIVERSO_CONFIG || {};
const whatsappNumber = runtimeConfig.whatsapp || "573001234567";
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
const categoriaContexto = params.get("categoria");

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
  const limpiarTexto = valor => String(valor || "").trim();
  const variantesNormalizadas = variantes
    .filter(variante => variante && (variante.nombre || variante.id || variante.color || variante.tamano || variante.talla))
    .map((variante, index) => {
      const nombre = limpiarTexto(variante.nombre) || `Variante ${index + 1}`;
      const tamano = limpiarTexto(variante.tamano || variante.talla) || nombre;
      const color = limpiarTexto(variante.color);
      const partesEtiqueta = [];

      if (tamano) partesEtiqueta.push(`Tamano ${tamano}`);
      if (color) partesEtiqueta.push(`Color ${color}`);

      return {
        ...variante,
        key: variante.id || `variante-${index + 1}`,
        tamano,
        color,
        etiqueta: partesEtiqueta.join(" - ") || nombre,
        nombre
      };
    });

  const obtenerValoresUnicos = valores => valores.filter((valor, indice, arr) => arr.indexOf(valor) === indice);
  const tieneVariantes = variantesNormalizadas.length > 0;
  const tamanosDisponibles = obtenerValoresUnicos(variantesNormalizadas.map(variante => variante.tamano).filter(Boolean));
  const coloresDisponibles = obtenerValoresUnicos(variantesNormalizadas.map(variante => variante.color).filter(Boolean));
  const tieneSelectorTamano = tamanosDisponibles.length > 0;
  const tieneSelectorColor = coloresDisponibles.length > 0;
  const tieneSelectoresDeVariante = tieneSelectorTamano || tieneSelectorColor;
  let tamanoActivo = tieneSelectorTamano ? (variantesNormalizadas[0]?.tamano || tamanosDisponibles[0] || null) : null;
  let colorActivo = tieneSelectorColor ? (variantesNormalizadas[0]?.color || coloresDisponibles[0] || null) : null;

  // Rellena nombre, descripción y precio
  card.querySelector(".nombre-producto").textContent = producto.nombre;
  const descripcionNodo = card.querySelector(".descripcion-larga-producto");
  const precioNodo = card.querySelector(".precio-producto");
  const referenciaNodo = card.querySelector(".detalle-referencia");

  const categoriasProducto = Array.isArray(producto.categorias) ? producto.categorias : [];
  const categoriaValida = categoriaContexto && categoriasProducto.includes(categoriaContexto);
  const categoriaPrincipal = categoriaValida ? categoriaContexto : null;

  const categoriaNombre = categoriaPrincipal
    ? (nombresCategorias[categoriaPrincipal] || categoriaPrincipal)
    : "Todas las categorias";

  card.querySelector(".detalle-categoria").textContent = `Categoria: ${categoriaNombre}`;

  if (detalleTitulo) {
    detalleTitulo.textContent = producto.nombre;
  }

  if (detalleSubtitulo) {
    detalleSubtitulo.textContent = `Conoce caracteristicas, beneficios y opciones de compra para ${producto.nombre}.`;
  }

  if (detalleBreadcrumb) {
    const rutaCategoria = categoriaPrincipal
      ? `productos.html?categoria=${categoriaPrincipal}`
      : "productos.html";
    detalleBreadcrumb.innerHTML = `<a href="index.html">Inicio</a> / <a href="productos.html">Productos</a> / <a href="${rutaCategoria}">${categoriaNombre}</a> / ${producto.nombre}`;
  }

  document.title = `${producto.nombre} - Universo Mercantil`;

  const varianteWrap = card.querySelector(".selector-variante-wrap");
  const grupoTamano = card.querySelector(".selector-tamano-grupo");
  const grupoColor = card.querySelector(".selector-color-grupo");
  const selectTamano = card.querySelector(".selector-tamano");
  const selectColor = card.querySelector(".selector-color");
  const ayudaVariantes = card.querySelector(".selector-variante-ayuda");

  if (tieneVariantes && tieneSelectoresDeVariante && varianteWrap && grupoTamano && grupoColor && selectTamano && selectColor && ayudaVariantes) {
    varianteWrap.hidden = false;
    grupoTamano.hidden = !tieneSelectorTamano;
    grupoColor.hidden = !tieneSelectorColor;
    ayudaVariantes.hidden = false;
    ayudaVariantes.textContent = "Selecciona tamano y color de forma independiente.";

    if (tieneSelectorTamano) {
      poblarSelect(selectTamano, tamanosDisponibles, tamanoActivo);
      tamanoActivo = selectTamano.value || tamanoActivo;
    }

    if (tieneSelectorColor) {
      poblarSelect(selectColor, coloresDisponibles, colorActivo);
      colorActivo = selectColor.value || colorActivo;
    }
  }

  function poblarSelect(select, opciones, valorActivo) {
    if (!select) return;

    select.innerHTML = "";
    opciones.forEach(opcion => {
      const option = document.createElement("option");
      option.value = opcion;
      option.textContent = opcion;
      select.appendChild(option);
    });

    if (valorActivo && opciones.includes(valorActivo)) {
      select.value = valorActivo;
    } else if (opciones.length) {
      select.value = opciones[0];
    }
  }

  function obtenerVarianteSeleccionada() {
    if (!tieneVariantes) return null;

    if (tamanoActivo && colorActivo) {
      const varianteExacta = variantesNormalizadas.find(
        variante => variante.tamano === tamanoActivo && variante.color === colorActivo
      );
      if (varianteExacta) return varianteExacta;
    }

    if (tamanoActivo) {
      const variantePorTamano = variantesNormalizadas.find(variante => variante.tamano === tamanoActivo);
      if (variantePorTamano) {
        return variantePorTamano;
      }
    }

    if (colorActivo) {
      const variantePorColor = variantesNormalizadas.find(variante => variante.color === colorActivo);
      if (variantePorColor) {
        return variantePorColor;
      }
    }

    return variantesNormalizadas[0] || null;
  }

  function obtenerEtiquetaSeleccionActiva(variante) {
    const partes = [];

    if (tieneSelectorTamano && tamanoActivo) {
      partes.push(`Tamano ${tamanoActivo}`);
    } else if (variante?.tamano) {
      partes.push(`Tamano ${variante.tamano}`);
    }

    if (tieneSelectorColor && colorActivo) {
      partes.push(`Color ${colorActivo}`);
    } else if (variante?.color) {
      partes.push(`Color ${variante.color}`);
    }

    return partes.join(" - ");
  }

  function obtenerImagenesActivas(variante) {
    if (categoriaValida && typeof obtenerImagenesProductoPorCategoria === "function") {
      const imagenesPorCategoria = obtenerImagenesProductoPorCategoria(producto, categoriaContexto);
      if (Array.isArray(imagenesPorCategoria) && imagenesPorCategoria.length) {
        return imagenesPorCategoria;
      }
    }

    if (!categoriaValida && typeof obtenerTodasImagenesProducto === "function") {
      const imagenesConsolidadas = obtenerTodasImagenesProducto(producto);
      if (Array.isArray(imagenesConsolidadas) && imagenesConsolidadas.length) {
        return imagenesConsolidadas;
      }
    }

    if (typeof obtenerTodasImagenesProducto === "function") {
      const imagenesConsolidadas = obtenerTodasImagenesProducto(producto);
      if (Array.isArray(imagenesConsolidadas) && imagenesConsolidadas.length) {
        return imagenesConsolidadas;
      }
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

    const etiquetaSeleccion = obtenerEtiquetaSeleccionActiva(variante);
    const etiquetaVariante = etiquetaSeleccion
      ? ` - ${etiquetaSeleccion}`
      : (variante?.etiqueta ? ` - ${variante.etiqueta}` : "");
    const textoWhatsApp = encodeURIComponent(
      `Hola, quiero informacion sobre ${producto.nombre}${etiquetaVariante} (ref: ${producto.id}).`
    );

    if (btnWhatsApp) {
      btnWhatsApp.href = `https://wa.me/${whatsappNumber}?text=${textoWhatsApp}`;
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
  renderizarCarousel(obtenerImagenesActivas(varianteInicial), `${producto.nombre} ${obtenerEtiquetaSeleccionActiva(varianteInicial) || varianteInicial?.etiqueta || ""}`.trim());

  function aplicarVarianteSeleccionada() {
    const varianteActiva = obtenerVarianteSeleccionada();
    actualizarInformacionProducto(varianteActiva);
    renderizarCarousel(obtenerImagenesActivas(varianteActiva), `${producto.nombre} ${obtenerEtiquetaSeleccionActiva(varianteActiva) || varianteActiva?.etiqueta || ""}`.trim());
  }

  if (tieneVariantes && tieneSelectorTamano && selectTamano) {
    selectTamano.addEventListener("change", () => {
      tamanoActivo = selectTamano.value;
      aplicarVarianteSeleccionada();
    });
  }

  if (tieneVariantes && tieneSelectorColor && selectColor) {
    selectColor.addEventListener("change", () => {
      colorActivo = selectColor.value;
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
    const tamanoSeleccionado = (tieneSelectorTamano ? tamanoActivo : varianteActiva?.tamano) || null;
    const colorSeleccionado = (tieneSelectorColor ? colorActivo : varianteActiva?.color) || null;
    const normalizarParteKey = valor => String(valor || "").toLowerCase().trim().replace(/\s+/g, "-");
    const partesKey = [producto.id];

    if (tamanoSeleccionado) {
      partesKey.push(`tamano=${normalizarParteKey(tamanoSeleccionado)}`);
    }

    if (colorSeleccionado) {
      partesKey.push(`color=${normalizarParteKey(colorSeleccionado)}`);
    }

    const cartKey = partesKey.join("::");
    const detalleVariante = [];

    if (tamanoSeleccionado) {
      detalleVariante.push(`Tamano: ${tamanoSeleccionado}`);
    }

    if (colorSeleccionado) {
      detalleVariante.push(`Color: ${colorSeleccionado}`);
    }

    const productoCarrito = {
      cartKey,
      id: producto.id,
      nombre: producto.nombre,
      precio: Number(varianteActiva?.precio ?? producto.precio),
      cantidad,
      imagen: imagenesActivas[0] || "",
      varianteId: [tamanoSeleccionado, colorSeleccionado].filter(Boolean).join("|") || varianteActiva?.key || null,
      varianteNombre: detalleVariante.length ? detalleVariante.join(" | ") : (varianteActiva?.etiqueta || null)
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
    window.location.href = "carrito.html"; // ajusta la ruta según tu proyecto
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
});


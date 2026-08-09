document.addEventListener("DOMContentLoaded", () => {
  if (typeof cargarManifestImagenesNuevas === "function") {
    cargarManifestImagenesNuevas().catch(() => {});
  }

  const container = document.getElementById("container-productos");
  const template = document.getElementById("template-producto");
  const categoriaActualEl = document.getElementById("categoria-actual");
  const contadorProductosEl = document.getElementById("contador-productos");
  const catalogoDescripcionEl = document.getElementById("catalogo-descripcion");
  const filtroCategoriasEl = document.getElementById("filtro-categorias");

  const params = new URLSearchParams(window.location.search);
  const categoriaSeleccionada = params.get("categoria");

  const nombresCategorias = {
    "carnicos": "Cárnicos",
    "cafe-chocolate": "Café y Chocolate",
    "alimentos-preparados": "Alimentos Preparados",
    "panaderia": "Panadería",
    "snacks": "Snacks",
    "mascotas": "Mascotas"
  };

  const descripcionesCategorias = {
    "carnicos": "Empaques y fundas especializadas para productos cárnicos con altos estándares de protección.",
    "cafe-chocolate": "Soluciones con excelente barrera para conservar aroma, textura y frescura.",
    "alimentos-preparados": "Empaques funcionales para productos listos para consumo y cadenas de distribución.",
    "panaderia": "Presentaciones atractivas y prácticas para panadería, repostería y consumo diario.",
    "snacks": "Formatos flexibles para snacks con enfoque en conservación y visibilidad en punto de venta.",
    "mascotas": "Empaques resistentes y funcionales para alimentos y productos del sector mascotas."
  };

  const categoriasDisponibles = Object.keys(bannersPorCategoria);

  const productosFiltrados = categoriaSeleccionada
    ? productos.filter(p => p.categorias.includes(categoriaSeleccionada))
    : productos;

  // Construye chips de categorías
  if (filtroCategoriasEl) {
    const chips = [
      `<a href="/productos" class="chip-categoria ${categoriaSeleccionada ? "" : "activa"}">Todas</a>`
    ];

    categoriasDisponibles.forEach(cat => {
      chips.push(
        `<a href="/productos?categoria=${cat}" class="chip-categoria ${categoriaSeleccionada === cat ? "activa" : ""}">${nombresCategorias[cat] || cat}</a>`
      );
    });

    filtroCategoriasEl.innerHTML = chips.join("");
  }

  // Actualiza información de contexto
  if (categoriaActualEl) {
    categoriaActualEl.textContent = categoriaSeleccionada
      ? `Categoría: ${nombresCategorias[categoriaSeleccionada] || categoriaSeleccionada}`
      : "Todas las categorías";
  }

  if (contadorProductosEl) {
    contadorProductosEl.textContent = `${productosFiltrados.length} producto${productosFiltrados.length === 1 ? "" : "s"}`;
  }

  if (catalogoDescripcionEl && categoriaSeleccionada && descripcionesCategorias[categoriaSeleccionada]) {
    catalogoDescripcionEl.textContent = descripcionesCategorias[categoriaSeleccionada];
  }

  // Renderiza el banner
  if (categoriaSeleccionada && bannersPorCategoria[categoriaSeleccionada]) {
    const bannerDesktop = bannersPorCategoria[categoriaSeleccionada].desktop;
    const bannerMobile = bannersPorCategoria[categoriaSeleccionada].mobile;

    document.getElementById("banner-productos").innerHTML = `
      <picture>
        <source media="(max-width: 768px)" srcset="${bannerMobile}">
        <img src="${bannerDesktop}" alt="Banner ${categoriaSeleccionada}">
      </picture>
    `;
  } else {
    const banner = document.getElementById("banner-productos");
    if (banner) {
      banner.innerHTML = `
        <picture>
          <source media="(max-width: 768px)" srcset="assets/images/banners/movil/hero_2_movil.webp">
          <img src="assets/images/banners/escritorio/hero_2_pc.webp" alt="Catálogo de productos">
        </picture>
      `;
    }
  }

  if (!productosFiltrados.length) {
    container.innerHTML = `<p class="catalogo-empty">No encontramos productos para esta categoría. Prueba con otra categoría o revisa el catálogo completo.</p>`;
    return;
  }

  // Renderiza las tarjetas
  productosFiltrados.forEach(p => {
    const card = template.content.cloneNode(true);
    const paramsDetalle = new URLSearchParams();
    paramsDetalle.set("id", p.id);
    if (categoriaSeleccionada) {
      paramsDetalle.set("categoria", categoriaSeleccionada);
    }

    const imagenesProducto = typeof obtenerImagenesProductoPorCategoria === "function"
      ? obtenerImagenesProductoPorCategoria(p, categoriaSeleccionada)
      : (typeof obtenerTodasImagenesProducto === "function" ? obtenerTodasImagenesProducto(p) : []);
    const imagenPrincipal = Array.isArray(imagenesProducto) && imagenesProducto.length
      ? imagenesProducto[0]
      : "";

    card.querySelector("a").href = `/detalles?${paramsDetalle.toString()}`;
    card.querySelector("img").src = imagenPrincipal;
    card.querySelector("img").alt = p.nombre;
    card.querySelector("img").loading = "lazy";
    card.querySelector(".nombre-producto").textContent = p.nombre;
    card.querySelector(".descripcion-corta-producto").textContent = p.descripcionCorta;
    container.appendChild(card);
  });
});

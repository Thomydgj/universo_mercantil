document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("container-productos");
  const template = document.getElementById("template-producto");
  const categoriaActualEl = document.getElementById("categoria-actual");
  const contadorProductosEl = document.getElementById("contador-productos");
  const catalogoDescripcionEl = document.getElementById("catalogo-descripcion");
  const filtroCategoriasEl = document.getElementById("filtro-categorias");

  const params = new URLSearchParams(window.location.search);
  const categoriaSeleccionada = params.get("categoria");

  const nombresCategorias = {
    "carnicos": "Carnicos",
    "cafe-chocolate": "Cafe y Chocolate",
    "alimentos-preparados": "Alimentos Preparados",
    "panaderia": "Panaderia",
    "snacks": "Snacks",
    "mascotas": "Mascotas"
  };

  const descripcionesCategorias = {
    "carnicos": "Empaques y fundas especializadas para productos carnicos con altos estandares de proteccion.",
    "cafe-chocolate": "Soluciones con excelente barrera para conservar aroma, textura y frescura.",
    "alimentos-preparados": "Empaques funcionales para productos listos para consumo y cadenas de distribucion.",
    "panaderia": "Presentaciones atractivas y practicas para panaderia, reposteria y consumo diario.",
    "snacks": "Formatos flexibles para snacks con enfoque en conservacion y visibilidad en punto de venta.",
    "mascotas": "Empaques resistentes y funcionales para alimentos y productos del sector mascotas."
  };

  const categoriasDisponibles = Object.keys(bannersPorCategoria);

  const productosFiltrados = categoriaSeleccionada
    ? productos.filter(p => p.categorias.includes(categoriaSeleccionada))
    : productos;

  // Construye chips de categorias
  if (filtroCategoriasEl) {
    const chips = [
      `<a href="/productos.html" class="chip-categoria ${categoriaSeleccionada ? "" : "activa"}">Todas</a>`
    ];

    categoriasDisponibles.forEach(cat => {
      chips.push(
        `<a href="/productos.html?categoria=${cat}" class="chip-categoria ${categoriaSeleccionada === cat ? "activa" : ""}">${nombresCategorias[cat] || cat}</a>`
      );
    });

    filtroCategoriasEl.innerHTML = chips.join("");
  }

  // Actualiza informacion de contexto
  if (categoriaActualEl) {
    categoriaActualEl.textContent = categoriaSeleccionada
      ? `Categoria: ${nombresCategorias[categoriaSeleccionada] || categoriaSeleccionada}`
      : "Todas las categorias";
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
          <source media="(max-width: 768px)" srcset="assets/images/banners/movil/aniversario_movil.jpg">
          <img src="assets/images/banners/escritorio/aniversario_pc.jpg" alt="Catalogo de productos">
        </picture>
      `;
    }
  }

  if (!productosFiltrados.length) {
    container.innerHTML = `<p class="catalogo-empty">No encontramos productos para esta categoria. Prueba con otra categoria o revisa el catalogo completo.</p>`;
    return;
  }

  // Renderiza las tarjetas
  productosFiltrados.forEach(p => {
    const card = template.content.cloneNode(true);
    card.querySelector("a").href = `/detalles.html?id=${p.id}`;
    card.querySelector("img").src = p.imagenes[0];
    card.querySelector("img").alt = p.nombre;
    card.querySelector("img").loading = "lazy";
    card.querySelector(".nombre-producto").textContent = p.nombre;
    card.querySelector(".descripcion-corta-producto").textContent = p.descripcionCorta;
    container.appendChild(card);
  });
});

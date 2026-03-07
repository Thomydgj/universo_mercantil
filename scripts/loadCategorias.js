document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("container-categorias");
  const template = document.getElementById("template-categoria");
  const tipoActualEl = document.getElementById("tipo-actual");
  const contadorCategoriasEl = document.getElementById("contador-categorias");
  const categoriasDescripcionEl = document.getElementById("categorias-descripcion");
  const filtroTiposEl = document.getElementById("filtro-tipos");

  const params = new URLSearchParams(window.location.search);
  const tipoSeleccionado = params.get("tipo");

  const nombresTipos = {
    flexibles: "Empaques Flexibles",
    termoformados: "Empaques Termoformados"
  };

  const descripcionTipos = {
    flexibles: "Categorias para empaques flexibles de alta versatilidad, ideales para diferentes industrias y formatos.",
    termoformados: "Categorias para empaques termoformados con excelente presentacion y proteccion para el producto."
  };

  const tiposDisponibles = Object.keys(bannersPorTipo);

  const categoriasFiltradas = tipoSeleccionado
    ? categorias.filter(c => c.tipo.includes(tipoSeleccionado))
    : categorias;

  if (filtroTiposEl) {
    const chips = [
      `<a href="/categorias.html" class="chip-categoria ${tipoSeleccionado ? "" : "activa"}">Todos</a>`
    ];

    tiposDisponibles.forEach(tipo => {
      chips.push(
        `<a href="/categorias.html?tipo=${tipo}" class="chip-categoria ${tipoSeleccionado === tipo ? "activa" : ""}">${nombresTipos[tipo] || tipo}</a>`
      );
    });

    filtroTiposEl.innerHTML = chips.join("");
  }

  if (tipoActualEl) {
    tipoActualEl.textContent = tipoSeleccionado
      ? `Tipo: ${nombresTipos[tipoSeleccionado] || tipoSeleccionado}`
      : "Todos los tipos";
  }

  if (contadorCategoriasEl) {
    contadorCategoriasEl.textContent = `${categoriasFiltradas.length} categoria${categoriasFiltradas.length === 1 ? "" : "s"}`;
  }

  if (categoriasDescripcionEl && tipoSeleccionado && descripcionTipos[tipoSeleccionado]) {
    categoriasDescripcionEl.textContent = descripcionTipos[tipoSeleccionado];
  }

  // Renderiza el banner según el tipo
  if (tipoSeleccionado && bannersPorTipo[tipoSeleccionado]) {
    const bannerDesktop = bannersPorTipo[tipoSeleccionado].desktop;
    const bannerMobile = bannersPorTipo[tipoSeleccionado].mobile;

    document.getElementById("banner-categoria").innerHTML = `
      <picture>
        <source media="(max-width: 768px)" srcset="${bannerMobile}">
        <img src="${bannerDesktop}" alt="Banner ${tipoSeleccionado}">
      </picture>
    `;
  } else {
    const banner = document.getElementById("banner-categoria");
    if (banner) {
      banner.innerHTML = `
        <picture>
          <source media="(max-width: 768px)" srcset="assets/images/banners/movil/aniversario_movil.jpg">
          <img src="assets/images/banners/escritorio/aniversario_pc.jpg" alt="Categorias de empaque">
        </picture>
      `;
    }
  }

  if (!categoriasFiltradas.length) {
    container.innerHTML = `<p class="catalogo-empty">No encontramos categorias para este tipo de empaque. Intenta con otro filtro.</p>`;
    return;
  }

  // Renderiza las categorías filtradas
  categoriasFiltradas.forEach(c => {
    const card = template.content.cloneNode(true);
    card.querySelector("img").src = c.imagen;
    card.querySelector("img").alt = c.nombre;
    card.querySelector("img").loading = "lazy";
    card.querySelector(".nombre-categoria").textContent = c.nombre;
    card.querySelector(".link-categoria").href = `productos.html?categoria=${c.id}`;
    container.appendChild(card);
  });
});

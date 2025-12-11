// Selecciona el contenedor y el template
const container = document.getElementById("container-categorias");
const template = document.getElementById("template-categoria");

// Obtiene el parámetro "tipo" de la URL
const params = new URLSearchParams(window.location.search);
const tipoSeleccionado = params.get("tipo");

// Filtra las categorías según el tipo, o muestra todas si no hay parámetro
const categoriasFiltradas = tipoSeleccionado
  ? categorias.filter(c => c.tipo.includes(tipoSeleccionado))
  : categorias;

// Renderiza las categorías filtradas (o todas)
categoriasFiltradas.forEach(c => {
  const card = template.content.cloneNode(true);
  card.querySelector("img").src = c.imagen;
  card.querySelector("img").alt = c.nombre;
  card.querySelector(".nombre-categoria").textContent = c.nombre;
  card.querySelector(".link-categoria").href = `productos.html?categoria=${c.id}`;
  container.appendChild(card);
});

// Selecciona el contenedor y el template
const container = document.getElementById("container-productos");
const template = document.getElementById("template-producto");

// Obtiene el parámetro "categoria" de la URL
const params = new URLSearchParams(window.location.search);
const categoriaSeleccionada = params.get("categoria");

// Filtra los productos según la categoría, o muestra todos si no hay parámetro
const productosFiltrados = categoriaSeleccionada
    ? productos.filter(p => p.categorias.includes(categoriaSeleccionada))
    : productos;

// Renderiza los productos filtrados (o todos)
productosFiltrados.forEach(p => {
    const card = template.content.cloneNode(true);
    card.querySelector("a").href = `/detalles.html?id=${p.id}`;
    card.querySelector("img").src = p.imagenes[0]; // primera imagen
    card.querySelector("img").alt = p.nombre;
    card.querySelector(".nombre-producto").textContent = p.nombre;
    card.querySelector(".descripcion-corta-producto").textContent = p.descripcionCorta;
    // card.querySelector(".precio-producto").textContent = p.precio; 
    container.appendChild(card);
});

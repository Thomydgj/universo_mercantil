// Arreglo de categorías
const categorias = [
    { nombre: "Alimentos preparados", imagen: "assets/images/imagen_mock.jpg" },
    { nombre: "Café y chocolate", imagen: "assets/images/imagen_mock.jpg" },
    { nombre: "Cárnicos", imagen: "assets/images/carnicos.jpg" },
    { nombre: "Mascotas", imagen: "assets/images/imagen_mock.jpg" },
    { nombre: "Panadería y repostería", imagen: "assets/images/imagen_mock.jpg" },
    { nombre: "Snacks y cereales", imagen: "assets/images/imagen_mock.jpg" },
];

// Función para generar dinámicamente las tarjetas de categorías
function generarCategorias() {
    const container = document.getElementById("categorias-container");

    categorias.forEach(categoria => {
        const card = document.createElement("div");
        card.classList.add("categoria-card");

        card.innerHTML = `
            <img src="${categoria.imagen}" alt="${categoria.nombre}">
            <h3>${categoria.nombre}</h3>
        `;

        container.appendChild(card);
    });
}

// Ejecutar la función al cargar el script
document.addEventListener("DOMContentLoaded", generarCategorias);
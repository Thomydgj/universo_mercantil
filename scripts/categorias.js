// Datos de las categorías
const categorias = [
    { id: "alimentos", nombre: "Alimentos Preparados", imagen: "assets/images/categorias/alimentos.png" },
    { id: "cafe-chocolate", nombre: "Café y Chocolate", imagen: "assets/images/categorias/cafe-chocolate.png" },
    { id: "carnicos", nombre: "Cárnicos", imagen: "assets/images/categorias/carnicos.png" },
    { id: "mascotas", nombre: "Mascotas", imagen: "assets/images/categorias/mascotas.png" },
    { id: "panaderia", nombre: "Panadería y Repostería", imagen: "assets/images/categorias/panaderia.png" },
    { id: "snacks", nombre: "Snacks y Cereales", imagen: "assets/images/categorias/snacks.png" }
];

// Contenedor de categorías
const categoriasContainer = document.getElementById("categorias-container");

// Función para generar las tarjetas de categorías
function generarCategorias() {
    categorias.forEach((categoria) => {
        const tarjeta = document.createElement("div");
        tarjeta.classList.add("producto-card");
        tarjeta.innerHTML = `
            <img src="${categoria.imagen}" alt="${categoria.nombre}">
            <div class="producto-info">
                <h3>${categoria.nombre}</h3>
            </div>
        `;
        tarjeta.addEventListener("click", () => {
            // Redirigir a productos.html con el ID de la categoría como parámetro
            window.location.href = `productos.html?categoria=${categoria.id}`;
        });
        categoriasContainer.appendChild(tarjeta);
    });
}

// Generar las categorías al cargar la página
document.addEventListener("DOMContentLoaded", generarCategorias);
// Obtener el parámetro de la URL (declarar solo una vez)
const urlParams = new URLSearchParams(window.location.search);
const productoId = urlParams.get("id"); // El ID se obtiene como string
console.log("ID del producto:", productoId);

// Buscar el producto en los datos
let productoSeleccionado = null;
for (const categoria in productos) {
    console.log("Buscando en categoría:", categoria);
    const producto = productos[categoria].find((p) => p.id === productoId);
    if (producto) {
        productoSeleccionado = producto;
        break;
    }
}

console.log("Producto seleccionado:", productoSeleccionado);

// Mostrar los detalles del producto
if (productoSeleccionado) {
    document.getElementById("producto-nombre").textContent = productoSeleccionado.nombre;
    document.getElementById("producto-descripcion").textContent = productoSeleccionado.descripcionLarga;
    document.getElementById("producto-precio").textContent = productoSeleccionado.precio;

    // Generar el slider de imágenes
    const sliderContainer = document.getElementById("slider-container");
    productoSeleccionado.imagenes.forEach((imagen) => {
        const img = document.createElement("img");
        img.src = imagen;
        sliderContainer.appendChild(img);
    });
} else {
    document.body.innerHTML = "<h1>Producto no encontrado</h1>";
}

// Obtener el parámetro de la URL
const urlParams = new URLSearchParams(window.location.search);
const categoriaId = urlParams.get("categoria");

// Contenedores
const productosContainer = document.getElementById("productos-container");
const categoriaTitulo = document.getElementById("categoria-titulo");

// Función para mostrar los productos de la categoría seleccionada
function mostrarProductos() {
    // Filtrar productos por categoría
    const productosFiltrados = productos.filter((producto) =>
        producto.categorias.includes(categoriaId)
    );

    if (productosFiltrados.length === 0) {
        categoriaTitulo.textContent = "Categoría no encontrada";
        return;
    }

    // Actualizar el título de la categoría
    categoriaTitulo.textContent = `Productos para ${categoriaId.replace("-", " ")}`;

    // Generar las tarjetas de productos
    productosFiltrados.forEach((producto) => {
        const tarjeta = document.createElement("div");
        tarjeta.classList.add("producto-card");
        tarjeta.innerHTML = `
            <img src="${producto.imagenes[0]}" alt="${producto.nombre}">
            <div class="producto-info">
                <h3>${producto.nombre}</h3>
                <p>${producto.descripcionCorta}</p>
                <div class="producto-precio">${producto.precio}</div>
            </div>
            <button class="producto-btn" data-id="${producto.id}">Ver Producto</button>
        `;

        // Agregar evento para redirigir a la página del producto
        tarjeta.querySelector(".producto-btn").addEventListener("click", () => {
            window.location.href = `producto.html?id=${producto.id}`;
        });

        productosContainer.appendChild(tarjeta);
    });
}

// Mostrar los productos al cargar la página
document.addEventListener("DOMContentLoaded", mostrarProductos);
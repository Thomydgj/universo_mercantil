// Verifica si ya existe una variable con el mismo nombre
if (typeof urlParams === "undefined") {
    const urlParams = new URLSearchParams(window.location.search);
} else {
    console.log("La variable urlParams ya está definida.");
}

// Obtener el ID del producto desde la URL
const productoId = urlParams.get("id");
console.log("ID del producto:", productoId); // Verificar el ID obtenido de la URL

// Buscar el producto en los datos
const productoSeleccionado = productos.find((producto) => producto.id === productoId);
console.log("Producto seleccionado:", productoSeleccionado); // Verificar si el producto se encuentra

// Mostrar los detalles del producto
if (productoSeleccionado) {
    // Mostrar el nombre del producto
    document.getElementById("producto-nombre").textContent = productoSeleccionado.nombre;

    // Mostrar la descripción larga
    document.getElementById("producto-descripcion").textContent = productoSeleccionado.descripcionLarga;

    // Mostrar el precio
    document.getElementById("producto-precio").textContent = `Precio: ${productoSeleccionado.precio}`;

    // Generar el slider de imágenes
    const sliderContainer = document.getElementById("slider-container");
    productoSeleccionado.imagenes.forEach((imagen) => {
        const img = document.createElement("img");
        img.src = imagen;
        img.alt = productoSeleccionado.nombre;
        sliderContainer.appendChild(img);
    });
} else {
    // Mostrar un mensaje si el producto no se encuentra
    document.body.innerHTML = "<h1>Producto no encontrado</h1>";
}
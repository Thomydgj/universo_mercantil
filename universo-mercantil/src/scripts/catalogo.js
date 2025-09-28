// Datos de los productos
const productos = {
    flexibles: [
        { id: 1, nombre: "Bolsa Flex Up", descripcion: "Bolsa flexible y resistente.", precio: "$10000", imagen: "assets/images/flexibles1.jpg" },
        { id: 2, nombre: "Bolsa flow pack", descripcion: "Ideal para alimentos secos.", precio: "$10000", imagen: "assets/images/flexibles2.jpg" },
        { id: 3, nombre: "Bolsa plana", descripcion: "Perfecta para exhibición.", precio: "$10000", imagen: "assets/images/flexibles3.jpg" },
        { id: 4, nombre: "Bolsa tipo galón", descripcion: "Protección contra la luz.", precio: "$10000", imagen: "assets/images/flexibles4.jpg" },
        { id: 5, nombre: "Empaques laminados con papel", descripcion: "Ideal para productos frescos.", precio: "$10000", imagen: "assets/images/flexibles5.jpg" }
    ],
    termoformados: [
        { id: 6, nombre: "Bandeja Termoformada", descripcion: "Resistente y duradera.", precio: "$10000", imagen: "assets/images/termo1.jpg" },
        { id: 7, nombre: "Envase para Alimentos", descripcion: "Mantiene la frescura.", precio: "$10000", imagen: "assets/images/termo2.jpg" },
        { id: 8, nombre: "Contenedor Transparente", descripcion: "Ideal para exhibición.", precio: "$10000", imagen: "assets/images/termo3.jpg" },
        { id: 9, nombre: "Bandeja con Tapa", descripcion: "Fácil de usar y cerrar.", precio: "$10000", imagen: "assets/images/termo4.jpg" },
        { id: 10, nombre: "Envase Ecológico", descripcion: "Hecho de materiales reciclables.", precio: "$10000", imagen: "assets/images/termo5.jpg" },
        { id: 11, nombre: "Bandeja para Carnes", descripcion: "Perfecta para productos cárnicos.", precio: "$10000", imagen: "assets/images/termo6.jpg" },
    ],
    carnicos: [
        { id: 13, nombre: "AMIPAK", descripcion: "Conserva la frescura.", precio: "$10000", imagen: "assets/images/carnicos1.jpg" },
        { id: 14, nombre: "CORIA", descripcion: "Ideal para productos cárnicos.", precio: "$10000", imagen: "assets/images/carnicos2.jpg" },
        { id: 15, nombre: "MADEJA", descripcion: "Protección contra la humedad.", precio: "$10000", imagen: "assets/images/carnicos3.jpg" },
        { id: 16, nombre: "I-PEEL", descripcion: "Mantiene la frescura del queso.", precio: "$10000", imagen: "assets/images/carnicos4.jpg" },
        { id: 17, nombre: "MULTIFLEX", descripcion: "Ideal para productos cárnicos.", precio: "$10000", imagen: "assets/images/carnicos5.jpg" },
        { id: 18, nombre: "FIBROSA", descripcion: "Conserva la frescura por más tiempo.", precio: "$10000", imagen: "assets/images/carnicos6.jpg" }
    ]
};

// Función para generar las tarjetas de productos
function generarProductos(seccion, contenedorId) {
    const contenedor = document.getElementById(contenedorId);
    productos[seccion].forEach((producto) => {
        const tarjeta = document.createElement("div");
        tarjeta.classList.add("producto-card");

        tarjeta.innerHTML = `
            <img src="${producto.imagen}" alt="${producto.nombre}">
            <div class="producto-info">
                <h3>${producto.nombre}</h3>
                <p>${producto.descripcion}</p>
                <div class="producto-precio">${producto.precio}</div>
            </div>
            <button class="producto-btn">Agregar al carrito</button>
        `;

        contenedor.appendChild(tarjeta);
    });
}

// Generar productos al cargar la página
document.addEventListener("DOMContentLoaded", () => {
    generarProductos("flexibles", "flexibles-container");
    generarProductos("termoformados", "termoformados-container");
    generarProductos("carnicos", "carnicos-container");
});
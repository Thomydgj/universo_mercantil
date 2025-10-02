// Lista única de productos
const productos = [
    
    {
        id: "multibarrera",
        nombre: "Multibarrera",
        descripcionCorta: "Empaque versátil y resistente.",
        descripcionLarga: "El empaque Multibarrera es ideal para una amplia gama de productos, ofreciendo resistencia y versatilidad.",
        precio: "$$$$$$",
        imagenes: [
            "/assets/images/productos/Multibarrera/Multibarrera1.png",
            "/assets/images/productos/Multibarrera/Multibarrera2.png",
            "/assets/images/productos/Multibarrera/Multibarrera3.png"
        ],
        categorias: ["carnicos"]
    },
    {
        id: "multiflex",
        nombre: "Multiflex",
        descripcionCorta: "Empaque flexible y duradero.",
        descripcionLarga: "El empaque Multiflex está diseñado para adaptarse a diferentes tipos de productos, proporcionando durabilidad y flexibilidad.",
        precio: "$$$$$$",
        imagenes: [
            "/assets/images/productos/Multiflex/Multiflex1.png",
            "/assets/images/productos/Multiflex/Multiflex2.png",
            "/assets/images/productos/Multiflex/Multiflex3.png",
            "/assets/images/productos/Multiflex/Multiflex4.png",
            "/assets/images/productos/Multiflex/Multiflex5.png"
        ],
        categorias: ["carnicos"]
    },
    {
        id: "termoflex",
        nombre: "Termoflex",
        descripcionCorta: "Empaque térmico para máxima protección.",
        descripcionLarga: "El empaque Termoflex ofrece una excelente protección térmica, ideal para productos que requieren mantener su temperatura.",
        precio: "$$$$$$",
        imagenes: [
            "/assets/images/productos/Termoflex/Termoflex1.png",
            "/assets/images/productos/Termoflex/Termoflex2.png",
            "/assets/images/productos/Termoflex/Termoflex3.png",
            "/assets/images/productos/Termoflex/Termoflex4.png",
            "/assets/images/productos/Termoflex/Termoflex5.png",
            "/assets/images/productos/Termoflex/Termoflex6.png"
        ],
        categorias: ["carnicos"]
    },

    {
        id: "tripa-natural-cerdo",
        nombre: "Tripa Natural de Cerdo",
        descripcionCorta: "Empaque natural para cárnicos.",
        descripcionLarga: "La tripa natural de cerdo es perfecta para embutidos y productos cárnicos, ofreciendo una presentación auténtica y tradicional.",
        precio: "$$$$$$",
        imagenes: [
            "/assets/images/productos/Tripa_Natural_Cerdo/Tripa1.png",
            "/assets/images/productos/Tripa_Natural_Cerdo/Tripa2.png",
            "/assets/images/productos/Tripa_Natural_Cerdo/Tripa3.png",
        ],
        categorias: ["carnicos"]        
    },
    {
        id: "fibrosa",
        nombre: "Fibrosa",
        descripcionCorta: "Empaque resistente para cárnicos.",
        descripcionLarga: "El empaque Fibrosa está diseñado para productos cárnicos, proporcionando resistencia y durabilidad durante el almacenamiento y transporte.",
        precio: "$$$$$$",
        imagenes: [
            "/assets/images/productos/Fibrosa/Fibrosa1.png",
            "/assets/images/productos/Fibrosa/Fibrosa2.png",
            "/assets/images/productos/Fibrosa/Fibrosa3.png",
            "/assets/images/productos/Fibrosa/Fibrosa4.png",
            "/assets/images/productos/Fibrosa/Fibrosa5.png"
        ],
        categorias: ["carnicos"]
    },
    {
        id: "celulosa",
        nombre: "Celulosa",
        descripcionCorta: "Empaque biodegradable y sostenible.",
        descripcionLarga: "El empaque de celulosa es una opción ecológica, biodegradable y sostenible, ideal para productos que buscan reducir su impacto ambiental.",
        precio: "$$$$$$",
        imagenes: [
            "/assets/images/productos/Celulosa/Celulosa1.png",
            "/assets/images/productos/Celulosa/Celulosa2.png",
            "/assets/images/productos/Celulosa/Celulosa3.png",
            "/assets/images/productos/Celulosa/Celulosa4.png",
            "/assets/images/productos/Celulosa/Celulosa5.png"
        ],
        categorias: ["carnicos"]
    },
    {
        id: "flow-pack-selle-ventral",
        nombre: "Flow-Pack Selle Ventral",
        descripcionCorta: "Empaque sellado para máxima frescura.",
        descripcionLarga: "El Flow-Pack Selle Ventral ofrece un sellado seguro que mantiene la frescura de los productos, ideal para alimentos y snacks.",
        precio: "$$$$$$",
        imagenes: [
            "/assets/images/productos/Flow_Pack_Selle_Ventral/FPSelleVentral1.png",
            "/assets/images/productos/Flow_Pack_Selle_Ventral/FPSelleVentral2.png",

        ],
        categorias: ["cafe-chocolate", "panaderia"]
    },
    {
        id: "bolsa-flex-up-con-zipper",
        nombre: "Bolsa Flex-Up con Zipper",
        descripcionCorta: "Empaque reutilizable con cierre hermético.",
        descripcionLarga: "Este empaque cuenta con un zipper que permite un cierre hermético, ideal para conservar la frescura de los productos y facilitar su almacenamiento.",
        precio: "$$$$$$",
        imagenes: [
            "/assets/images/productos/Bolsa_Flex_Up_Con_Zipper/Zipper1.png",
            
            "/assets/images/productos/Bolsa_Flex_Up_Con_Zipper/Zipper2.png",
            "/assets/images/productos/Bolsa_Flex_Up_Con_Zipper/Zipper3.png",
            "/assets/images/productos/Bolsa_Flex_Up_Con_Zipper/Zipper4.png"
        ],
        categorias: ["cafe-chocolate"]
    },
    {
        id: "funda-plastica-multiflex",
        nombre: "Funda Plástica Multiflex",
        descripcionCorta: "Empaque plástico resistente y versátil.",
        descripcionLarga: "La funda plástica Multiflex es ideal para una variedad de productos, ofreciendo resistencia y versatilidad en su uso.",
        precio: "$$$$$$",
        imagenes: [
            "/assets/images/productos/Funda_Plastica_Multiflex/Multiflex1.png",
            "/assets/images/productos/Funda_Plastica_Multiflex/Multiflex2.png",
        ],
        categorias: ["mascotas"]
    },
    {
        id: "flex-up-forma",
        nombre: "Flex-Up con Forma",
        descripcionCorta: "Empaque flexible con diseño personalizado.",
        descripcionLarga: "Este empaque Flex-Up con Forma está diseñado para adaptarse a la forma del producto, ofreciendo una presentación atractiva y funcional.",
        precio: "$$$$$$",
        imagenes: [
            "/assets/images/productos/Flex_Up_con_Forma/Forma1.png",
            "/assets/images/productos/Flex_Up_con_Forma/Forma2.png",
            "/assets/images/productos/Flex_Up_con_Forma/Forma3.png",
            "/assets/images/productos/Flex_Up_con_Forma/Forma4.png",
            
        ],
        categorias: ["mascotas", "panaderia", "snacks"]
    },
    {
        id: "termoformados",
        nombre: "Termoformados",
        descripcionCorta: "Empaque termoformado para máxima protección.",
        descripcionLarga: "El empaque termoformado ofrece una protección superior para productos delicados, manteniéndolos frescos y seguros durante su transporte y almacenamiento.",
        precio: "$$$$$$",
        imagenes: [
            "/assets/images/productos/Termoformados/Termoformados1.png",
            "/assets/images/productos/Termoformados/Termoformados2.png",
            "/assets/images/productos/Termoformados/Termoformados3.png",
            "/assets/images/productos/Termoformados/Termoformados4.png",
            "/assets/images/productos/Termoformados/Termoformados5.png",
            "/assets/images/productos/Termoformados/Termoformados6.png",
            "/assets/images/productos/Termoformados/Termoformados7.png",
            "/assets/images/productos/Termoformados/Termoformados8.png"
        ],
        categorias: ["alimentos", "cafe-chocolate", "panaderia"]
    },
    {
        id: "bolsa-plana",
        nombre: "Bolsa Plana",
        descripcionCorta: "Empaque ideal para alimentos preparados.",
        descripcionLarga: "Este empaque está diseñado para conservar la frescura de alimentos preparados. Es resistente, seguro y perfecto para el transporte.",
        precio: "$$$$$$",
        imagenes: [
            "/assets/images/productos/Bolsa_Plana/Plana1.png",
            "/assets/images/productos/Bolsa_Plana/Plana2.png",
            "/assets/images/productos/Bolsa_Plana/Plana3.png",
            "/assets/images/productos/Bolsa_Plana/Plana4.png",
            "/assets/images/productos/Bolsa_Plana/Plana5.png"
        ],
        categorias: ["alimentos", "carnicos", "panaderia", "snacks"]
    },
    {
        id: "bolsa-selle-ventral",
        nombre: "Bolsa Selle Ventral",
        descripcionCorta: "Empaque práctico y reutilizable.",
        descripcionLarga: "Este empaque es perfecto para almacenar alimentos de manera práctica y reutilizable. Fabricado con materiales de alta calidad.",
        precio: "$$$$$$",
        imagenes: [
            "/assets/images/productos/Bolsa_Selle_Ventral/SelleVentral1.png",
            "/assets/images/productos/Bolsa_Selle_Ventral/SelleVentral2.png"
        ],
        categorias: ["alimentos", "cafe-chocolate"]
    },
    {
        id: "flex-up",
        nombre: "Flex-Up",
        descripcionCorta: "Empaque flexible y versátil.",
        descripcionLarga: "El empaque Flex-Up es ideal para una amplia variedad de productos. Su diseño flexible lo hace perfecto para el almacenamiento y transporte.",
        precio: "$$$$$$",
        imagenes: [
            "/assets/images/productos/Flex_Up/FlexUp1.png",
            "/assets/images/productos/Flex_Up/FlexUp2.png",
            "/assets/images/productos/Flex_Up/FlexUp3.png",
            "/assets/images/productos/Flex_Up/FlexUp4.png",
            "/assets/images/productos/Flex_Up/FlexUp5.png"
        ],
        categorias: ["alimentos", "cafe-chocolate", "panaderia"]
    },
    {
        id: "amipak",
        nombre: "Amipak",
        descripcionCorta: "Empaque especializado para cárnicos.",
        descripcionLarga: "El empaque Amipak está diseñado específicamente para carnes frescas, asegurando su conservación y frescura por más tiempo.",
        precio: "$$$$$$",
        imagenes: [
            "/assets/images/productos/Amipak/Amipak1.png",
            "/assets/images/productos/Amipak/Amipak2.png",
            "/assets/images/productos/Amipak/Amipak3.png",
            "/assets/images/productos/Amipak/Amipak4.png",
            "/assets/images/productos/Amipak/Amipak5.png"
        ],
        categorias: ["carnicos"]
    },
    {
        id: "flow-pack-4-selles",
        nombre: "Flow-Pack 4 Selles",
        descripcionCorta: "Empaque sellado para máxima protección.",
        descripcionLarga: "El Flow-Pack 4 Selles ofrece una protección superior para productos delicados, manteniéndolos frescos y seguros.",
        precio: "$$$$$$",
        imagenes: [
            "/assets/images/productos/Flow_Pack_4_Selles/CuatroSelles1.png",
            "/assets/images/productos/Flow_Pack_4_Selles/CuatroSelles2.png",
            "/assets/images/productos/Flow_Pack_4_Selles/CuatroSelles3.png",
            "/assets/images/productos/Flow_Pack_4_Selles/CuatroSelles4.png",
            "/assets/images/productos/Flow_Pack_4_Selles/CuatroSelles5.png"
        ],
        categorias: ["cafe-chocolate", "panaderia", "snacks"]
    },
    {
        id: "flex-up-con-ventana",
        nombre: "Flex-Up con Ventana",
        descripcionCorta: "Empaque con ventana transparente.",
        descripcionLarga: "Este empaque cuenta con una ventana transparente que permite visualizar el contenido, ideal para productos frescos y atractivos.",
        precio: "$$$$$$",
        imagenes: [
            "/assets/images/productos/Flex_Up_con_Ventana/Ventana1.png",
            "/assets/images/productos/Flex_Up_con_Ventana/Ventana2.png",
            "/assets/images/productos/Flex_Up_con_Ventana/Ventana3.png",
            "/assets/images/productos/Flex_Up_con_Ventana/Ventana4.webp"
        ],
        categorias: ["mascotas", "panaderia", "snacks"]
    },
    {
        id: "colageno",
        nombre: "Colágeno",
        descripcionCorta: "Empaque especializado para cárnicos.",
        descripcionLarga: "El empaque de colágeno es ideal para productos cárnicos, ofreciendo una excelente conservación y presentación.",
        precio: "$$$$$$",
        imagenes: [
            "/assets/images/productos/Colageno/Colageno1.png",
            "/assets/images/productos/Colageno/Colageno2.png",
            "/assets/images/productos/Colageno/Colageno3.png",
            "/assets/images/productos/Colageno/Colageno4.png",
            "/assets/images/productos/Colageno/Colageno5.png"
        ],
        categorias: ["carnicos"]
    }
];

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
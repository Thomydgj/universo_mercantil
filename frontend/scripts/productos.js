// Lista única de productos
//
// Plantilla opcional por producto para segmentar imágenes por categoría:
// imagenesPorCategoria: {
//   "cafe-chocolate": [
//     "assets/images/producto/<Producto>/Cafe1.webp",
//     "assets/images/producto/<Producto>/Cafe2.webp"
//   ],
//   "alimentos-preparados": [
//     "assets/images/producto/<Producto>/Alimentos1.webp"
//   ],
//   "panaderia": [
//     "assets/images/producto/<Producto>/Panaderia1.webp"
//   ]
// }
//
// Si una categoría no tiene imágenes definidas, se usa el fallback en "imagenes".
const RUTA_MANIFEST_IMAGENES_NUEVAS = "scripts/producto_manifest.json";
let manifestImagenesNuevas = {};

const promesaManifestImagenesNuevas = fetch(RUTA_MANIFEST_IMAGENES_NUEVAS)
    .then(respuesta => (respuesta.ok ? respuesta.json() : {}))
    .then(data => {
        if (data && typeof data === "object") {
            manifestImagenesNuevas = data;
        }
        return manifestImagenesNuevas;
    })
    .catch(() => {
        manifestImagenesNuevas = {};
        return manifestImagenesNuevas;
    });

function cargarManifestImagenesNuevas() {
    return promesaManifestImagenesNuevas;
}

function obtenerImagenesNuevasDesdeManifest(productoId, categoria) {
    const mapaProducto = manifestImagenesNuevas && typeof manifestImagenesNuevas === "object"
        ? manifestImagenesNuevas[productoId]
        : null;

    if (!mapaProducto || typeof mapaProducto !== "object") {
        return [];
    }

    const imagenesCategoria = mapaProducto[categoria];
    if (Array.isArray(imagenesCategoria) && imagenesCategoria.length) {
        return imagenesCategoria;
    }

    return [];
}

const productos = [
    {
        id: "multibarrera",
        nombre: "Multibarrera",
        descripcionCorta: "Empaque versátil y resistente.",
        descripcionLarga: "El empaque Multibarrera es ideal para una amplia gama de productos, ofreciendo resistencia y versatilidad.",
        precio: "10000",
        imagenes: [
            "assets/images/producto/Multibarrera/Multibarrera1.webp",
            "assets/images/producto/Multibarrera/Multibarrera2.webp",
            "assets/images/producto/Multibarrera/Multibarrera3.webp"
        ],
        categorias: ["carnicos"]
    },
    {
        id: "multiflex",
        nombre: "Multiflex",
        descripcionCorta: "Empaque flexible y duradero.",
        descripcionLarga: "El empaque Multiflex está diseñado para adaptarse a diferentes tipos de productos, proporcionando durabilidad y flexibilidad.",
        precio: "11000",
        imagenes: [
            "assets/images/producto/Multiflex/Multiflex1.webp",
            "assets/images/producto/Multiflex/Multiflex2.webp",
            "assets/images/producto/Multiflex/Multiflex3.webp",
            "assets/images/producto/Multiflex/Multiflex4.webp",
            "assets/images/producto/Multiflex/Multiflex5.webp"
        ],
        categorias: ["carnicos"]
    },
    {
        id: "termoflex",
        nombre: "Termoflex",
        descripcionCorta: "Empaque térmico para máxima protección.",
        descripcionLarga: "El empaque Termoflex ofrece una excelente protección térmica, ideal para productos que requieren mantener su temperatura.",
        precio: "12000",
        imagenes: [
            "assets/images/producto/Termoflex/Termoflex1.webp",
            "assets/images/producto/Termoflex/Termoflex2.webp",
            "assets/images/producto/Termoflex/Termoflex3.webp",
            "assets/images/producto/Termoflex/Termoflex4.webp",
            "assets/images/producto/Termoflex/Termoflex5.webp",
            "assets/images/producto/Termoflex/Termoflex6.webp"
        ],
        categorias: ["carnicos"]
    },
    {
        id: "tripa-natural-cerdo",
        nombre: "Tripa Natural de Cerdo",
        descripcionCorta: "Empaque natural para cárnicos.",
        descripcionLarga: "La tripa natural de cerdo es perfecta para embutidos y productos cárnicos, ofreciendo una presentación auténtica y tradicional.",
        precio: "13000",
        imagenes: [
            "assets/images/producto/Tripa_Natural_Cerdo/Tripa1.webp",
            "assets/images/producto/Tripa_Natural_Cerdo/Tripa2.webp",
            "assets/images/producto/Tripa_Natural_Cerdo/Tripa3.webp",
        ],
        categorias: ["carnicos"]        
    },
    {
        id: "fibrosa",
        nombre: "Fibrosa",
        descripcionCorta: "Empaque resistente para cárnicos.",
        descripcionLarga: "El empaque Fibrosa está diseñado para productos cárnicos, proporcionando resistencia y durabilidad durante el almacenamiento y transporte.",
        precio: "14000",
        imagenes: [
            "assets/images/producto/Fibrosa/Fibrosa1.webp",
            "assets/images/producto/Fibrosa/Fibrosa2.webp",
            "assets/images/producto/Fibrosa/Fibrosa3.webp",
            "assets/images/producto/Fibrosa/Fibrosa4.webp",
            "assets/images/producto/Fibrosa/Fibrosa5.webp"
        ],
        categorias: ["carnicos"]
    },
    {
        id: "celulosa",
        nombre: "Celulosa",
        descripcionCorta: "Empaque biodegradable y sostenible.",
        descripcionLarga: "El empaque de celulosa es una opción ecológica, biodegradable y sostenible, ideal para productos que buscan reducir su impacto ambiental.",
        precio: "15000",
        imagenes: [
            "assets/images/producto/Celulosa/Celulosa1.webp",
            "assets/images/producto/Celulosa/Celulosa2.webp",
            "assets/images/producto/Celulosa/Celulosa3.webp",
            "assets/images/producto/Celulosa/Celulosa4.webp",
            "assets/images/producto/Celulosa/Celulosa5.webp"
        ],
        categorias: ["carnicos"]
    },
    {
        id: "flow-pack-selle-ventral",
        nombre: "Flow-Pack Selle Ventral",
        descripcionCorta: "Empaque sellado para máxima frescura.",
        descripcionLarga: "El Flow-Pack Selle Ventral ofrece un sellado seguro que mantiene la frescura de los productos, ideal para alimentos y snacks.",
        precio: "16000",
        imagenes: [
            "assets/images/producto/Flow_Pack_Selle_Ventral/FPSelleVentral1.webp",
            "assets/images/producto/Flow_Pack_Selle_Ventral/FPSelleVentral2.webp",

        ],
        categorias: ["cafe-chocolate", "panaderia"]
    },
    {
        id: "bolsa-flex-up-con-zipper",
        nombre: "Bolsa Flex-Up con Zipper",
        descripcionCorta: "Empaque reutilizable con cierre hermético.",
        descripcionLarga: "Este empaque cuenta con un zipper que permite un cierre hermético, ideal para conservar la frescura de los productos y facilitar su almacenamiento.",
        precio: "17000",
        imagenes: [
            "assets/images/producto/Bolsa_Flex_Up_Con_Zipper/Zipper1.webp",
            "assets/images/producto/Bolsa_Flex_Up_Con_Zipper/Zipper2.webp",
            "assets/images/producto/Bolsa_Flex_Up_Con_Zipper/Zipper3.webp",
            "assets/images/producto/Bolsa_Flex_Up_Con_Zipper/Zipper4.webp"
        ],
        categorias: ["cafe-chocolate"]
    },
    {
        id: "funda-plastica-multiflex",
        nombre: "Funda Plástica Multiflex",
        descripcionCorta: "Empaque plástico resistente y versátil.",
        descripcionLarga: "La funda plástica Multiflex es ideal para una variedad de productos, ofreciendo resistencia y versatilidad en su uso.",
        precio: "18000",
        imagenes: [
            "assets/images/producto/Funda_Plastica_Multiflex/Multiflex1.webp",
            "assets/images/producto/Funda_Plastica_Multiflex/Multiflex2.webp",
        ],
        categorias: ["mascotas"]
    },
    {
        id: "flex-up-forma",
        nombre: "Flex-Up con Forma",
        descripcionCorta: "Empaque flexible con diseño personalizado.",
        descripcionLarga: "Este empaque Flex-Up con Forma está diseñado para adaptarse a la forma del producto, ofreciendo una presentación atractiva y funcional.",
        precio: "19000",
        imagenes: [
            "assets/images/producto/Flex_Up_con_Forma/Forma1.webp",
            "assets/images/producto/Flex_Up_con_Forma/Forma2.webp",
            "assets/images/producto/Flex_Up_con_Forma/Forma3.webp",
            "assets/images/producto/Flex_Up_con_Forma/Forma4.webp",
        ],
        categorias: ["mascotas", "panaderia", "snacks"]
    },
    {
        id: "termoformados",
        nombre: "Termoformados",
        descripcionCorta: "Empaque termoformado para máxima protección.",
        descripcionLarga: "El empaque termoformado ofrece una protección superior para productos delicados, manteniéndolos frescos y seguros durante su transporte y almacenamiento.",
        precio: "20000",
        imagenesPorCategoria: {
            // "cafe-chocolate": [
            //     "assets/images/producto/Termoformados/Cafe1.webp"
            // ],
            // "alimentos-preparados": [
            //     "assets/images/producto/Termoformados/Alimentos1.webp"
            // ],
            // "panaderia": [
            //     "assets/images/producto/Termoformados/Panaderia1.webp"
            // ]
        },
        imagenes: [
            "assets/images/producto/Termoformados/Termoformados1.webp",
            "assets/images/producto/Termoformados/Termoformados2.webp",
            "assets/images/producto/Termoformados/Termoformados3.webp",
            "assets/images/producto/Termoformados/Termoformados4.webp",
            "assets/images/producto/Termoformados/Termoformados5.webp",
            "assets/images/producto/Termoformados/Termoformados6.webp",
            "assets/images/producto/Termoformados/Termoformados7.webp",
            "assets/images/producto/Termoformados/Termoformados8.webp"
        ],
        categorias: ["alimentos-preparados", "cafe-chocolate", "panaderia"]
    },
    {
        id: "bolsa-plana",
        nombre: "Bolsa Plana",
        descripcionCorta: "Empaque ideal para alimentos preparados.",
        descripcionLarga: "Este empaque está diseñado para conservar la frescura de alimentos preparados. Es resistente, seguro y perfecto para el transporte.",
        precio: "21000",
        imagenes: [
            "assets/images/producto/Bolsa_Plana/Plana1.webp",
            "assets/images/producto/Bolsa_Plana/Plana2.webp",
            "assets/images/producto/Bolsa_Plana/Plana3.webp",
            "assets/images/producto/Bolsa_Plana/Plana4.webp",
            "assets/images/producto/Bolsa_Plana/Plana5.webp"
        ],
        variantes: [
            {
                id: "pequena",
                tamano: "Pequeña",
                nombre: "Bolsa pequeña",
                color: "Transparente",
                precio: "20500",
                descripcionLarga: "Versión compacta para porciones individuales o productos de bajo gramaje.",
                imagenes: [
                    "assets/images/producto/Bolsa_Plana/Plana1.webp",
                    "assets/images/producto/Bolsa_Plana/Plana2.webp"
                ]
            },
            {
                id: "mediana",
                tamano: "Mediana",
                nombre: "Bolsa mediana",
                color: "Blanco perlado",
                precio: "21000",
                descripcionLarga: "Tamaño intermedio recomendado para líneas de rotación frecuente.",
                imagenes: [
                    "assets/images/producto/Bolsa_Plana/Plana3.webp",
                    "assets/images/producto/Bolsa_Plana/Plana4.webp"
                ]
            },
            {
                id: "grande",
                tamano: "Grande",
                nombre: "Bolsa grande",
                color: "Negro mate",
                precio: "21800",
                descripcionLarga: "Mayor capacidad para presentaciones familiares y surtidos de alto volumen.",
                imagenes: [
                    "assets/images/producto/Bolsa_Plana/Plana5.webp",
                    "assets/images/producto/Bolsa_Plana/Plana4.webp"
                ]
            }
        ],
        categorias: ["alimentos-preparados", "carnicos", "panaderia", "snacks"]
    },
    {
        id: "bolsa-selle-ventral",
        nombre: "Bolsa Selle Ventral",
        descripcionCorta: "Empaque práctico y reutilizable.",
        descripcionLarga: "Este empaque es perfecto para almacenar alimentos de manera práctica y reutilizable. Fabricado con materiales de alta calidad.",
        precio: "22000",
        imagenes: [
            "assets/images/producto/Bolsa_Selle_Ventral/SelleVentral1.webp",
            "assets/images/producto/Bolsa_Selle_Ventral/SelleVentral2.webp"
        ],
        categorias: ["alimentos-preparados", "cafe-chocolate"]
    },
    {
        id: "flex-up",
        nombre: "Flex-Up",
        descripcionCorta: "Empaque flexible y versátil.",
        descripcionLarga: "El empaque Flex-Up es ideal para una amplia variedad de productos. Su diseño flexible lo hace perfecto para el almacenamiento y transporte.",
        precio: "23000",
        imagenes: [
            "assets/images/producto/Flex_Up/FlexUp1.webp",
            "assets/images/producto/Flex_Up/FlexUp2.webp",
            "assets/images/producto/Flex_Up/FlexUp3.webp",
            "assets/images/producto/Flex_Up/FlexUp4.webp",
            "assets/images/producto/Flex_Up/FlexUp5.webp"
        ],
        categorias: ["alimentos-preparados", "cafe-chocolate", "panaderia"]
    },
    {
        id: "amipak",
        nombre: "Amipak",
        descripcionCorta: "Empaque especializado para cárnicos.",
        descripcionLarga: "El empaque Amipak está diseñado específicamente para carnes frescas, asegurando su conservación y frescura por más tiempo.",
        precio: "24000",
        imagenes: [
            "assets/images/producto/Amipak/Amipak1.webp",
            "assets/images/producto/Amipak/Amipak2.webp",
            "assets/images/producto/Amipak/Amipak3.webp",
            "assets/images/producto/Amipak/Amipak4.webp",
            "assets/images/producto/Amipak/Amipak5.webp"
        ],
        categorias: ["carnicos"]
    },
    {
        id: "flow-pack-4-selles",
        nombre: "Flow-Pack 4 Selles",
        descripcionCorta: "Empaque sellado para máxima protección.",
        descripcionLarga: "El Flow-Pack 4 Selles ofrece una protección superior para productos delicados, manteniéndolos frescos y seguros.",
        precio: "25000",
        imagenes: [
            "assets/images/producto/Flow_Pack_4_Selles/CuatroSelles1.webp",
            "assets/images/producto/Flow_Pack_4_Selles/CuatroSelles2.webp",
            "assets/images/producto/Flow_Pack_4_Selles/CuatroSelles3.webp",
            "assets/images/producto/Flow_Pack_4_Selles/CuatroSelles4.webp",
            "assets/images/producto/Flow_Pack_4_Selles/CuatroSelles5.webp",
            "assets/images/producto/Flow_Pack_4_Selles/CuatroSelles6.webp",
            "assets/images/producto/Flow_Pack_4_Selles/CuatroSelles7.webp",
            "assets/images/producto/Flow_Pack_4_Selles/CuatroSelles8.webp",
            "assets/images/producto/Flow_Pack_4_Selles/CuatroSelles9.webp",
            "assets/images/producto/Flow_Pack_4_Selles/CuatroSelles10.webp",
            "assets/images/producto/Flow_Pack_4_Selles/CuatroSelles11.webp",
        ],
        categorias: ["cafe-chocolate", "panaderia", "snacks"]
    },
    {
        id: "flex-up-con-ventana",
        nombre: "Flex-Up con Ventana",
        descripcionCorta: "Empaque con ventana transparente.",
        descripcionLarga: "Este empaque cuenta con una ventana transparente que permite visualizar el contenido, ideal para productos frescos y atractivos.",
        precio: "26000",
        imagenes: [
            "assets/images/producto/Flex_Up_con_Ventana/Ventana1.webp",
            "assets/images/producto/Flex_Up_con_Ventana/Ventana2.webp",
            "assets/images/producto/Flex_Up_con_Ventana/Ventana3.webp",
            "assets/images/producto/Flex_Up_con_Ventana/Ventana4.webp"
        ],
        variantes: [
            {
                id: "ventana-frontal",
                tamano: "Mediano",
                nombre: "Ventana frontal",
                color: "Transparente",
                precio: "26000",
                descripcionLarga: "Diseño con ventana frontal para máxima visibilidad del producto en estantería.",
                imagenes: [
                    "assets/images/producto/Flex_Up_con_Ventana/Ventana1.webp",
                    "assets/images/producto/Flex_Up_con_Ventana/Ventana2.webp"
                ]
            },
            {
                id: "ventana-lateral",
                tamano: "Mediano",
                nombre: "Ventana lateral",
                color: "Kraft natural",
                precio: "26800",
                descripcionLarga: "Ventana lateral para propuestas premium con identidad visual diferenciada.",
                imagenes: [
                    "assets/images/producto/Flex_Up_con_Ventana/Ventana3.webp",
                    "assets/images/producto/Flex_Up_con_Ventana/Ventana4.webp"
                ]
            }
        ],
        categorias: ["mascotas", "panaderia", "snacks"]
    },
    {
        id: "colageno",
        nombre: "Colágeno",
        descripcionCorta: "Empaque especializado para cárnicos.",
        descripcionLarga: "El empaque de colágeno es ideal para productos cárnicos, ofreciendo una excelente conservación y presentación.",
        precio: "27000",
        imagenes: [
            "assets/images/producto/Colageno/Colageno1.webp",
            "assets/images/producto/Colageno/Colageno2.webp",
            "assets/images/producto/Colageno/Colageno3.webp",
            "assets/images/producto/Colageno/Colageno4.webp",
            "assets/images/producto/Colageno/Colageno5.webp"
        ],
        categorias: ["carnicos"]
    }
];

const bannersPorCategoria = {
  "cafe-chocolate": {
    desktop: "assets/images/banners/escritorio/cafe_pc.webp",
    mobile: "assets/images/banners/movil/cafe_movil.webp"
  },
  "carnicos": {
    desktop: "assets/images/banners/escritorio/carnicos_pc.webp",
    mobile: "assets/images/banners/movil/carnicos_movil.webp"
  },
  "alimentos-preparados": {
    desktop: "assets/images/banners/escritorio/alimentos_pc.webp",
    mobile: "assets/images/banners/movil/alimentos_movil.webp"
  },
  "panaderia": {
    desktop: "assets/images/banners/escritorio/panaderia_pc.webp",
    mobile: "assets/images/banners/movil/panaderia_movil.webp"
  },
  "snacks": {
    desktop: "assets/images/banners/escritorio/snacks_pc.webp",
    mobile: "assets/images/banners/movil/snacks_movil.webp"
  },
  "mascotas": {
    desktop: "assets/images/banners/escritorio/mascotas_pc.webp",
    mobile: "assets/images/banners/movil/mascotas_movil.webp"
  }
};

function normalizarCategoria(valor) {
    return String(valor || "").trim().toLowerCase();
}

function obtenerImagenesProductoPorCategoria(producto, categoria) {
    const categoriaNormalizada = normalizarCategoria(categoria);

    if (!categoriaNormalizada) {
        return obtenerTodasImagenesProducto(producto);
    }

    if (producto?.id && categoriaNormalizada) {
        const imagenesNuevas = obtenerImagenesNuevasDesdeManifest(producto.id, categoriaNormalizada);
        if (Array.isArray(imagenesNuevas) && imagenesNuevas.length) {
            return imagenesNuevas;
        }
    }

    const mapaPorCategoria = producto && typeof producto === "object"
        ? producto.imagenesPorCategoria
        : null;

    if (categoriaNormalizada && mapaPorCategoria && typeof mapaPorCategoria === "object") {
        const imagenesCategoria = mapaPorCategoria[categoriaNormalizada];
        if (Array.isArray(imagenesCategoria) && imagenesCategoria.length) {
            return imagenesCategoria;
        }
    }

    return obtenerTodasImagenesProducto(producto);
}

function deduplicarImagenes(imagenes) {
    const resultado = [];
    const vistas = new Set();

    imagenes.forEach(src => {
        const ruta = typeof src === "string" ? src.trim() : "";
        if (!ruta || vistas.has(ruta)) {
            return;
        }

        vistas.add(ruta);
        resultado.push(ruta);
    });

    return resultado;
}

function obtenerTodasImagenesProducto(producto) {
    const coleccion = [];
    const categoriasProducto = Array.isArray(producto?.categorias) ? producto.categorias : [];

    const mapaManifest = manifestImagenesNuevas && typeof manifestImagenesNuevas === "object"
        ? manifestImagenesNuevas[producto?.id]
        : null;

    if (mapaManifest && typeof mapaManifest === "object") {
        const categoriasManifest = Object.keys(mapaManifest);
        const categoriasRestantes = categoriasManifest
            .filter(cat => !categoriasProducto.includes(cat))
            .sort();
        const ordenCategorias = [...categoriasProducto, ...categoriasRestantes];

        ordenCategorias.forEach(categoria => {
            const imagenes = mapaManifest[categoria];
            if (Array.isArray(imagenes) && imagenes.length) {
                coleccion.push(...imagenes);
            }
        });
    }

    const mapaPorCategoria = producto && typeof producto === "object"
        ? producto.imagenesPorCategoria
        : null;

    if (mapaPorCategoria && typeof mapaPorCategoria === "object") {
        const categoriasMapa = Object.keys(mapaPorCategoria);
        const categoriasRestantes = categoriasMapa
            .filter(cat => !categoriasProducto.includes(cat))
            .sort();
        const ordenCategorias = [...categoriasProducto, ...categoriasRestantes];

        ordenCategorias.forEach(categoria => {
            const imagenes = mapaPorCategoria[categoria];
            if (Array.isArray(imagenes) && imagenes.length) {
                coleccion.push(...imagenes);
            }
        });
    }

    return deduplicarImagenes(coleccion);
}


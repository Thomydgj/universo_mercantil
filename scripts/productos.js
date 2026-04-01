// Lista única de productos
const productos = [
    {
        id: "multibarrera",
        nombre: "Multibarrera",
        descripcionCorta: "Empaque versátil y resistente.",
        descripcionLarga: "El empaque Multibarrera es ideal para una amplia gama de productos, ofreciendo resistencia y versatilidad.",
        precio: "10000",
        imagenes: [
            "assets/images/productos/Multibarrera/Multibarrera1.png",
            "assets/images/productos/Multibarrera/Multibarrera2.png",
            "assets/images/productos/Multibarrera/Multibarrera3.png"
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
            "assets/images/productos/Multiflex/Multiflex1.png",
            "assets/images/productos/Multiflex/Multiflex2.png",
            "assets/images/productos/Multiflex/Multiflex3.png",
            "assets/images/productos/Multiflex/Multiflex4.png",
            "assets/images/productos/Multiflex/Multiflex5.png"
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
            "assets/images/productos/Termoflex/Termoflex1.png",
            "assets/images/productos/Termoflex/Termoflex2.png",
            "assets/images/productos/Termoflex/Termoflex3.png",
            "assets/images/productos/Termoflex/Termoflex4.png",
            "assets/images/productos/Termoflex/Termoflex5.png",
            "assets/images/productos/Termoflex/Termoflex6.png"
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
            "assets/images/productos/Tripa_Natural_Cerdo/Tripa1.png",
            "assets/images/productos/Tripa_Natural_Cerdo/Tripa2.png",
            "assets/images/productos/Tripa_Natural_Cerdo/Tripa3.png",
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
            "assets/images/productos/Fibrosa/Fibrosa1.png",
            "assets/images/productos/Fibrosa/Fibrosa2.png",
            "assets/images/productos/Fibrosa/Fibrosa3.png",
            "assets/images/productos/Fibrosa/Fibrosa4.png",
            "assets/images/productos/Fibrosa/Fibrosa5.png"
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
            "assets/images/productos/Celulosa/Celulosa1.png",
            "assets/images/productos/Celulosa/Celulosa2.png",
            "assets/images/productos/Celulosa/Celulosa3.png",
            "assets/images/productos/Celulosa/Celulosa4.png",
            "assets/images/productos/Celulosa/Celulosa5.png"
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
            "assets/images/productos/Flow_Pack_Selle_Ventral/FPSelleVentral1.png",
            "assets/images/productos/Flow_Pack_Selle_Ventral/FPSelleVentral2.png",

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
            "assets/images/productos/Bolsa_Flex_Up_Con_Zipper/Zipper1.png",
            "assets/images/productos/Bolsa_Flex_Up_Con_Zipper/Zipper2.png",
            "assets/images/productos/Bolsa_Flex_Up_Con_Zipper/Zipper3.png",
            "assets/images/productos/Bolsa_Flex_Up_Con_Zipper/Zipper4.png"
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
            "assets/images/productos/Funda_Plastica_Multiflex/Multiflex1.png",
            "assets/images/productos/Funda_Plastica_Multiflex/Multiflex2.png",
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
            "assets/images/productos/Flex_Up_con_Forma/Forma1.png",
            "assets/images/productos/Flex_Up_con_Forma/Forma2.png",
            "assets/images/productos/Flex_Up_con_Forma/Forma3.png",
            "assets/images/productos/Flex_Up_con_Forma/Forma4.png",
        ],
        categorias: ["mascotas", "panaderia", "snacks"]
    },
    {
        id: "termoformados",
        nombre: "Termoformados",
        descripcionCorta: "Empaque termoformado para máxima protección.",
        descripcionLarga: "El empaque termoformado ofrece una protección superior para productos delicados, manteniéndolos frescos y seguros durante su transporte y almacenamiento.",
        precio: "20000",
        imagenes: [
            "assets/images/productos/Termoformados/Termoformados1.png",
            "assets/images/productos/Termoformados/Termoformados2.png",
            "assets/images/productos/Termoformados/Termoformados3.png",
            "assets/images/productos/Termoformados/Termoformados4.png",
            "assets/images/productos/Termoformados/Termoformados5.png",
            "assets/images/productos/Termoformados/Termoformados6.png",
            "assets/images/productos/Termoformados/Termoformados7.png",
            "assets/images/productos/Termoformados/Termoformados8.webp"
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
            "assets/images/productos/Bolsa_Plana/Plana1.png",
            "assets/images/productos/Bolsa_Plana/Plana2.png",
            "assets/images/productos/Bolsa_Plana/Plana3.png",
            "assets/images/productos/Bolsa_Plana/Plana4.png",
            "assets/images/productos/Bolsa_Plana/Plana5.png"
        ],
        variantes: [
            {
                id: "pequena",
                nombre: "Bolsa pequena",
                color: "Transparente",
                precio: "20500",
                descripcionLarga: "Version compacta para porciones individuales o productos de bajo gramaje.",
                imagenes: [
                    "assets/images/productos/Bolsa_Plana/Plana1.png",
                    "assets/images/productos/Bolsa_Plana/Plana2.png"
                ]
            },
            {
                id: "mediana",
                nombre: "Bolsa mediana",
                color: "Blanco perlado",
                precio: "21000",
                descripcionLarga: "Tamano intermedio recomendado para lineas de rotacion frecuente.",
                imagenes: [
                    "assets/images/productos/Bolsa_Plana/Plana3.png",
                    "assets/images/productos/Bolsa_Plana/Plana4.png"
                ]
            },
            {
                id: "grande",
                nombre: "Bolsa grande",
                color: "Negro mate",
                precio: "21800",
                descripcionLarga: "Mayor capacidad para presentaciones familiares y surtidos de alto volumen.",
                imagenes: [
                    "assets/images/productos/Bolsa_Plana/Plana5.png",
                    "assets/images/productos/Bolsa_Plana/Plana4.png"
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
            "assets/images/productos/Bolsa_Selle_Ventral/SelleVentral1.png",
            "assets/images/productos/Bolsa_Selle_Ventral/SelleVentral2.png"
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
            "assets/images/productos/Flex_Up/FlexUp1.png",
            "assets/images/productos/Flex_Up/FlexUp2.png",
            "assets/images/productos/Flex_Up/FlexUp3.png",
            "assets/images/productos/Flex_Up/FlexUp4.png",
            "assets/images/productos/Flex_Up/FlexUp5.png"
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
            "assets/images/productos/Amipak/Amipak1.png",
            "assets/images/productos/Amipak/Amipak2.png",
            "assets/images/productos/Amipak/Amipak3.png",
            "assets/images/productos/Amipak/Amipak4.png",
            "assets/images/productos/Amipak/Amipak5.png"
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
            "assets/images/productos/Flow_Pack_4_Selles/CuatroSelles1.png",
            "assets/images/productos/Flow_Pack_4_Selles/CuatroSelles2.png",
            "assets/images/productos/Flow_Pack_4_Selles/CuatroSelles3.png",
            "assets/images/productos/Flow_Pack_4_Selles/CuatroSelles4.png",
            "assets/images/productos/Flow_Pack_4_Selles/CuatroSelles5.png"
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
            "assets/images/productos/Flex_Up_con_Ventana/Ventana1.png",
            "assets/images/productos/Flex_Up_con_Ventana/Ventana2.png",
            "assets/images/productos/Flex_Up_con_Ventana/Ventana3.png",
            "assets/images/productos/Flex_Up_con_Ventana/Ventana4.webp"
        ],
        variantes: [
            {
                id: "ventana-frontal",
                nombre: "Ventana frontal",
                color: "Transparente",
                precio: "26000",
                descripcionLarga: "Diseno con ventana frontal para maxima visibilidad del producto en estanteria.",
                imagenes: [
                    "assets/images/productos/Flex_Up_con_Ventana/Ventana1.png",
                    "assets/images/productos/Flex_Up_con_Ventana/Ventana2.png"
                ]
            },
            {
                id: "ventana-lateral",
                nombre: "Ventana lateral",
                color: "Kraft natural",
                precio: "26800",
                descripcionLarga: "Ventana lateral para propuestas premium con identidad visual diferenciada.",
                imagenes: [
                    "assets/images/productos/Flex_Up_con_Ventana/Ventana3.png",
                    "assets/images/productos/Flex_Up_con_Ventana/Ventana4.webp"
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
            "assets/images/productos/Colageno/Colageno1.png",
            "assets/images/productos/Colageno/Colageno2.png",
            "assets/images/productos/Colageno/Colageno3.png",
            "assets/images/productos/Colageno/Colageno4.png",
            "assets/images/productos/Colageno/Colageno5.png"
        ],
        categorias: ["carnicos"]
    }
];

const bannersPorCategoria = {
  "cafe-chocolate": {
    desktop: "assets/images/banners/escritorio/cafe_pc.jpg",
    mobile: "assets/images/banners/movil/cafe_movil.jpg"
  },
  "carnicos": {
    desktop: "assets/images/banners/escritorio/carnicos_pc.jpg",
    mobile: "assets/images/banners/movil/carnicos_movil.jpg"
  },
  "alimentos-preparados": {
    desktop: "assets/images/banners/escritorio/alimentos_pc.jpg",
    mobile: "assets/images/banners/movil/alimentos_movil.jpg"
  },
  "panaderia": {
    desktop: "assets/images/banners/escritorio/panaderia_pc.jpg",
    mobile: "assets/images/banners/movil/panaderia_movil.jpg"
  },
  "snacks": {
    desktop: "assets/images/banners/escritorio/snacks_pc.jpg",
    mobile: "assets/images/banners/movil/snacks_movil.jpg"
  },
  "mascotas": {
    desktop: "assets/images/banners/escritorio/mascotas_pc.jpg",
    mobile: "assets/images/banners/movil/mascotas_movil.jpg"
  }
};


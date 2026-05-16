// Datos de las categorías
const categorias = [
    { id: "alimentos-preparados", tipo: ["flexibles", "termoformados"], nombre: "Alimentos Preparados", imagen: "assets/images/categorias/alimentos.webp"}, 

    { id: "cafe-chocolate",tipo:["flexibles", "termoformados"], nombre: "Café y Chocolate", imagen: "assets/images/categorias/cafe-chocolate.webp",

     },
    { id: "carnicos", tipo:["flexibles","carnicos"], nombre: "Cárnicos", imagen: "assets/images/categorias/carnicos.webp",
         },

    { id: "mascotas", tipo:["flexibles"], nombre: "Mascotas", imagen: "assets/images/categorias/mascotas.webp" },

    { id: "panaderia", tipo:["flexibles", "termoformados"], nombre:"Panadería y Repostería", imagen: "assets/images/categorias/panaderia.webp" },

    { id: "snacks", tipo:["flexibles", "termoformados"], nombre: "Snacks y Cereales", imagen: "assets/images/categorias/snacks.webp" },  
];

const bannersPorTipo = {
  flexibles: {
    desktop: "assets/images/banners/escritorio/flexibles_pc.webp",
    mobile: "assets/images/banners/movil/flexibles_movil.webp"
  },
  termoformados: {
    desktop: "assets/images/banners/escritorio/termoformados_pc.webp",
    mobile: "assets/images/banners/movil/termoformados_movil.webp"
  }
};


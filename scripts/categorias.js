// Datos de las categorías
const categorias = [
    { id: "alimentos-preparados", tipo: ["flexibles", "termoformados"], nombre: "Alimentos Preparados", imagen: "assets/images/categorias/alimentos.png"}, 

    { id: "cafe-chocolate",tipo:["flexibles", "termoformados"], nombre: "Café y Chocolate", imagen: "assets/images/categorias/cafe-chocolate.png",

     },
    { id: "carnicos", tipo:["flexibles","carnicos"], nombre: "Cárnicos", imagen: "assets/images/categorias/carnicos.png",
         },

    { id: "mascotas", tipo:["flexibles"], nombre: "Mascotas", imagen: "assets/images/categorias/mascotas.png" },

    { id: "panaderia", tipo:["flexibles", "termoformados"], nombre:"Panadería y Repostería", imagen: "assets/images/categorias/panaderia.png" },

    { id: "snacks", tipo:["flexibles", "termoformados"], nombre: "Snacks y Cereales", imagen: "assets/images/categorias/snacks.png" },  
];

const bannersPorTipo = {
  flexibles: {
    desktop: "assets/images/banners/escritorio/flexibles_pc.jpg",
    mobile: "assets/images/banners/movil/flexibles_movil.jpg"
  },
  termoformados: {
    desktop: "assets/images/banners/escritorio/termoformados_pc.jpg",
    mobile: "assets/images/banners/movil/termoformados_movil.jpg"
  }
};


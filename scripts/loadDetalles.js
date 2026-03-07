// Selecciona el contenedor y el template
const container = document.getElementById("container-detalles-producto");
const template = document.getElementById("template-detalle");
const detalleBreadcrumb = document.getElementById("detalle-breadcrumb");
const detalleTitulo = document.getElementById("detalle-titulo");
const detalleSubtitulo = document.getElementById("detalle-subtitulo");
const notify = (message, type) => {
  if (typeof window.showToast === "function") {
    window.showToast(message, type);
    return;
  }
  alert(message);
};

// Obtiene el parámetro "id" de la URL (ejemplo: producto.html?id=amipak1)
const params = new URLSearchParams(window.location.search);
const idSeleccionado = params.get("id");

// Busca el producto en el array productos (definido en productos.js)
const producto = productos.find(p => p.id === idSeleccionado);

const nombresCategorias = {
  "carnicos": "Carnicos",
  "cafe-chocolate": "Cafe y Chocolate",
  "alimentos-preparados": "Alimentos Preparados",
  "panaderia": "Panaderia",
  "snacks": "Snacks",
  "mascotas": "Mascotas"
};

if (producto) {
  // Clona el contenido del template
  const card = template.content.cloneNode(true);

  // Rellena nombre, descripción y precio
  card.querySelector(".nombre-producto").textContent = producto.nombre;
  card.querySelector(".descripcion-larga-producto").textContent = producto.descripcionLarga;
  card.querySelector(".precio-producto").textContent = `$${Number(producto.precio).toLocaleString("es-CO")}`;

  const categoriaPrincipal = producto.categorias && producto.categorias.length
    ? producto.categorias[0]
    : null;

  const categoriaNombre = categoriaPrincipal
    ? (nombresCategorias[categoriaPrincipal] || categoriaPrincipal)
    : "General";

  card.querySelector(".detalle-categoria").textContent = `Categoria: ${categoriaNombre}`;
  card.querySelector(".detalle-referencia").textContent = `Ref: ${producto.id.toUpperCase()}`;

  if (detalleTitulo) {
    detalleTitulo.textContent = producto.nombre;
  }

  if (detalleSubtitulo) {
    detalleSubtitulo.textContent = `Conoce caracteristicas, beneficios y opciones de compra para ${producto.nombre}.`;
  }

  if (detalleBreadcrumb) {
    const rutaCategoria = categoriaPrincipal
      ? `/productos.html?categoria=${categoriaPrincipal}`
      : "/productos.html";
    detalleBreadcrumb.innerHTML = `<a href="/principal.html">Inicio</a> / <a href="/productos.html">Productos</a> / <a href="${rutaCategoria}">${categoriaNombre}</a> / ${producto.nombre}`;
  }

  document.title = `${producto.nombre} - Universo Mercantil`;

  // Renderiza las imágenes en el carrusel
  const track = card.querySelector(".carrusel-fila");
  producto.imagenes.forEach(src => {
    const img = document.createElement("img");
    img.src = src;
    img.alt = producto.nombre;
    img.loading = "lazy";
    track.appendChild(img);
  });

  // Lógica del carrusel
  const slides = Array.from(track.children);
  const prevButton = card.querySelector(".prev");
  const nextButton = card.querySelector(".next");
  let currentIndex = 0;

  if (slides.length <= 1) {
    prevButton.style.display = "none";
    nextButton.style.display = "none";
  }

  function updateCarousel() {
    const width = slides[0].getBoundingClientRect().width;
    track.style.transform = `translateX(-${currentIndex * width}px)`;
  }

  window.addEventListener("resize", updateCarousel);

  nextButton.addEventListener("click", () => {
    if (currentIndex < slides.length - 1) {
      currentIndex++;
      updateCarousel();
    }
  });

  prevButton.addEventListener("click", () => {
    if (currentIndex > 0) {
      currentIndex--;
      updateCarousel();
    }
  });

  // Botones de acción
  const inputCantidad = card.querySelector(".cantidad-producto");
  const btnAgregar = card.querySelector(".btn-agregar");
  const btnComprar = card.querySelector(".btn-comprar");
  const btnWhatsApp = card.querySelector(".btn-whatsapp");

  const textoWhatsApp = encodeURIComponent(
    `Hola, quiero informacion sobre ${producto.nombre} (ref: ${producto.id}).`
  );
  if (btnWhatsApp) {
    btnWhatsApp.href = `https://wa.me/?text=${textoWhatsApp}`;
  }

  // Función reutilizable para agregar al carrito
  function agregarProductoAlCarrito(producto, cantidad) {
    if (!Number.isInteger(cantidad) || cantidad < 1) {
      notify("Ingresa una cantidad valida.", "warning");
      inputCantidad.value = 1;
      return;
    }

    const productoCarrito = {
      id: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      cantidad,
      imagen: producto.imagenes[0] || ""
    };

    let carrito = JSON.parse(localStorage.getItem("carrito")) || [];

    const existe = carrito.find(p => p.id === productoCarrito.id);
    if (existe) {
      existe.cantidad += cantidad;
    } else {
      carrito.push(productoCarrito);
    }

    localStorage.setItem("carrito", JSON.stringify(carrito));
    notify("Producto agregado al carrito", "success");
  }

  // Botón AGREGAR
  btnAgregar.addEventListener("click", () => {
    const cantidad = parseInt(inputCantidad.value, 10);
    agregarProductoAlCarrito(producto, cantidad);
  });

  // Botón COMPRAR
  btnComprar.addEventListener("click", () => {
    const cantidad = parseInt(inputCantidad.value, 10);
    agregarProductoAlCarrito(producto, cantidad);

    // Redirigir al carrito
    window.location.href = "/carrito.html"; // ajusta la ruta según tu proyecto
  });

  // Inserta el card en el contenedor
  container.appendChild(card);
} else {
  container.textContent = "Producto no encontrado.";
  if (detalleTitulo) {
    detalleTitulo.textContent = "Producto no disponible";
  }
  if (detalleSubtitulo) {
    detalleSubtitulo.textContent = "No encontramos el producto solicitado. Explora otras opciones del catalogo.";
  }
}

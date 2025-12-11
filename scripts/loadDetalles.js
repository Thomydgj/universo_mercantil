// Selecciona el contenedor y el template
const container = document.getElementById("container-detalles-producto");
const template = document.getElementById("template-detalle");

// Obtiene el parámetro "id" de la URL (ejemplo: producto.html?id=amipak1)
const params = new URLSearchParams(window.location.search);
const idSeleccionado = params.get("id");

// Busca el producto en el array productos (definido en productos.js)
const producto = productos.find(p => p.id === idSeleccionado);

if (producto) {
  // Clona el contenido del template
  const card = template.content.cloneNode(true);

  // Rellena nombre, descripción y precio
  card.querySelector(".nombre-producto").textContent = producto.nombre;
  card.querySelector(".descripcion-larga-producto").textContent = producto.descripcionLarga;
  card.querySelector(".precio-producto").textContent = `$${producto.precio}`;

  // Renderiza las imágenes en el carrusel
  const track = card.querySelector(".carrusel-fila");
  producto.imagenes.forEach(src => {
    const img = document.createElement("img");
    img.src = src;
    img.alt = producto.nombre;
    track.appendChild(img);
  });

  // Lógica del carrusel
  const slides = Array.from(track.children);
  const prevButton = card.querySelector(".prev");
  const nextButton = card.querySelector(".next");
  let currentIndex = 0;

  function updateCarousel() {
    const width = slides[0].getBoundingClientRect().width;
    track.style.transform = `translateX(-${currentIndex * width}px)`;
  }

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

  // Función reutilizable para agregar al carrito
  function agregarProductoAlCarrito(producto, cantidad) {
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
    alert("Producto agregado al carrito ✅");
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
}

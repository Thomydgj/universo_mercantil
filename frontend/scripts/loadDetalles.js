document.addEventListener("DOMContentLoaded", async () => {
const RUTA_MANIFEST_IMAGENES_SIIGO = "scripts/siigo_imagenes.json";
const RUTA_MANIFEST_DESCRIPCIONES_SIIGO = "scripts/siigo_descripciones.json";
let manifestImagenesSiigo = {};
let manifestImagenesSiigoNormalizado = {};
let manifestDescripcionesSiigo = {};
let manifestDescripcionesSiigoNormalizado = {};

if (typeof cargarManifestImagenesNuevas === "function") {
  await cargarManifestImagenesNuevas();
}

// Selecciona el contenedor y el template
const container = document.getElementById("container-detalles-producto");
const template = document.getElementById("template-detalle");
const detalleBreadcrumb = document.getElementById("detalle-breadcrumb");
const detalleTitulo = document.getElementById("detalle-titulo");
const detalleSubtitulo = document.getElementById("detalle-subtitulo");
const runtimeConfig = window.UNIVERSO_CONFIG || {};
const backendBaseUrl = (runtimeConfig.backendBaseUrl || "http://localhost:8000").replace(/\/$/, "");
const backendApiKey = runtimeConfig.apiKey || "";
const catalogoRealContainer = document.getElementById("catalogo-real-container");
const catalogoRealStatus = document.getElementById("catalogo-real-status");
const catalogoRealPagination = document.getElementById("catalogo-real-pagination");
const catalogoRealFiltros = document.getElementById("catalogo-real-filtros");
const catalogoRealTemplate = document.getElementById("template-siigo-item");
const catalogoItemModal = document.getElementById("catalogo-item-modal");
const catalogoModalClose = document.getElementById("catalogo-modal-close");
const catalogoModalBackdrop = catalogoItemModal ? catalogoItemModal.querySelector("[data-close-catalogo-modal]") : null;
const catalogoModalPrev = document.getElementById("catalogo-modal-prev");
const catalogoModalNext = document.getElementById("catalogo-modal-next");
const catalogoModalImage = document.getElementById("catalogo-modal-image");
const catalogoModalEmpty = document.getElementById("catalogo-modal-empty");
const catalogoModalThumbs = document.getElementById("catalogo-modal-thumbs");
const catalogoModalTitulo = document.getElementById("catalogo-modal-titulo");
const catalogoModalDescripcion = document.getElementById("catalogo-modal-descripcion");
const catalogoModalSku = document.getElementById("catalogo-modal-sku");
const catalogoModalPrecio = document.getElementById("catalogo-modal-precio");
const catalogoModalStock = document.getElementById("catalogo-modal-stock");
const catalogoModalCantidad = document.getElementById("catalogo-modal-cantidad");
const catalogoModalAgregar = document.getElementById("catalogo-modal-agregar");
const catalogoModalComprar = document.getElementById("catalogo-modal-comprar");
const CATALOGO_REAL_ITEMS_POR_PAGINA = 24;
const CATALOGO_REAL_MAX_INTENTOS_CONSULTA = 3;
const CATALOGO_REAL_RETRY_DELAY_MS = 900;
const CATALOGO_REAL_API_PAGE_SIZE = Math.max(20, Math.min(Number(runtimeConfig.siigoCatalogPageSize || 120), 200));
const CATALOGO_REAL_API_MAX_PAGES = Math.max(1, Number(runtimeConfig.siigoCatalogMaxPages || 25));
const CATALOGO_REAL_MAX_ITEMS = Math.max(0, Number(runtimeConfig.siigoCatalogMaxItems || 0));
const CATALOGO_REAL_CACHE_TTL_MS = Math.max(0, Number(runtimeConfig.siigoCatalogCacheTtlMs || 300000));
const CATALOGO_REAL_CACHE_STORAGE_KEY = `universo:siigo:catalogo:${backendBaseUrl || "default"}`;
const FILTROS_CATALOGO_SIIGO = [
  { id: "todos", label: "Todos", categoriasSiigo: [] },
  { id: "carnicos", label: "Cárnicos", categoriasSiigo: ["fundas", "termoencogible"] },
  { id: "termoformados", label: "Termoformados", categoriasSiigo: ["termoformado"] },
  { id: "flexibles", label: "Bolsas flexibles", categoriasSiigo: ["bolsas", "bolsas de cafe"] }
];
const ALIAS_CATEGORIA_SIIGO = {
  "bolsa": "bolsas",
  "bolsas": "bolsas",
  "bolsas de cafe": "bolsas de cafe",
  "bolsas de aditamiento": "bolsas de aditamiento",
  "termoencogible": "termoencogible",
  "termoencogibles": "termoencogible",
  "termo encogible": "termoencogible",
  "termo encogibles": "termoencogible",
  "termoformado": "termoformado",
  "termoformados": "termoformado",
  "funda": "fundas",
  "fundas": "fundas",
  "talsa": "talsa",
  "tecnas": "tecnas",
  "otros": "otros"
};
const estadoCatalogoModal = {
  productoBase: null,
  itemSiigo: null,
  imagenes: [],
  indiceImagen: 0
};
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
const categoriaContexto = params.get("categoria");

// Busca el producto en el array productos (definido en productos.js)
const producto = productos.find(p => p.id === idSeleccionado);

const nombresCategorias = {
  "carnicos": "Cárnicos",
  "cafe-chocolate": "Café y Chocolate",
  "alimentos-preparados": "Alimentos Preparados",
  "panaderia": "Panadería",
  "snacks": "Snacks",
  "mascotas": "Mascotas"
};

const categoriasCatalogo = typeof categorias !== "undefined" && Array.isArray(categorias)
  ? categorias
  : [];

const ventajasPorCategoria = {
  "carnicos": [
    "Alta barrera para conservar frescura y reducir merma.",
    "Materiales resistentes para cadena de frío y transporte.",
    "Presentación limpia para exhibición en vitrina y retail.",
    "Opciones para diferentes calibres y porciones."
  ],
  "cafe-chocolate": [
    "Protección de aroma para conservar perfil sensorial.",
    "Excelente barrera a humedad y oxígeno.",
    "Formatos compatibles con válvula y cierre práctico.",
    "Acabados premium para posicionamiento de marca."
  ],
  "alimentos-preparados": [
    "Empaques funcionales para porciones listas para venta.",
    "Buena resistencia mecánica para operación diaria.",
    "Compatibles con procesos de alistamiento y despacho.",
    "Mejor experiencia de consumo y manipulación."
  ],
  "panaderia": [
    "Mayor visibilidad de producto en punto de venta.",
    "Presentaciones ligeras y fáciles de almacenar.",
    "Cierre práctico para mantener textura y frescura.",
    "Opciones versátiles para diferentes tamaños."
  ],
  "snacks": [
    "Formatos dinámicos para alta rotación comercial.",
    "Protección del producto durante exhibición y transporte.",
    "Soporte para branding con acabados atractivos.",
    "Facilidad de uso para consumo en movimiento."
  ],
  "mascotas": [
    "Estructuras robustas para alimentos de mayor peso.",
    "Mayor seguridad en almacenamiento y manipulación.",
    "Formatos funcionales para hogar y retail especializado.",
    "Buena presencia visual para categorías premium."
  ]
};

const usosPorCategoria = {
  "carnicos": ["Embutidos", "Proteína fresca", "Porcionados", "Canal HORECA", "Retail refrigerado", "Exportación"],
  "cafe-chocolate": ["Café molido", "Café en grano", "Cacao", "Chocolatería", "Ediciones premium", "Canal gourmet"],
  "alimentos-preparados": ["Ready to eat", "Meal prep", "Despachos", "Take away", "Canal institucional", "Dark kitchen"],
  "panaderia": ["Pan tajado", "Repostería", "Galletas", "Línea artesanal", "Canal tradicional", "Retail moderno"],
  "snacks": ["Frutos secos", "Mix crocantes", "Granolas", "Confitería", "Canal impulso", "E-commerce"],
  "mascotas": ["Concentrado", "Snacks pets", "Presentaciones familiares", "Línea veterinaria", "Canal especializado", "Suscripciones"]
};

const ventajasGenerales = [
  "Soluciones versátiles para distintos modelos de negocio.",
  "Acompañamiento técnico para escoger el empaque adecuado.",
  "Enfoque en protección, presentación y eficiencia operativa.",
  "Opciones escalables para crecimiento de portafolio."
];

const usosGenerales = ["Retail", "Canal institucional", "Distribucion", "E-commerce", "Canal tradicional", "HORECA"];

const construirHeadersBackend = () => {
  const headers = { "Content-Type": "application/json" };
  if (backendApiKey) {
    headers["X-Api-Key"] = backendApiKey;
  }
  return headers;
};

const leerCacheCatalogoReal = query => {
  if (normalizarTexto(query) || CATALOGO_REAL_CACHE_TTL_MS <= 0) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(CATALOGO_REAL_CACHE_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const syncedAt = Number(parsed?.syncedAt || 0);
    const items = parsed?.items;
    if (!Number.isFinite(syncedAt) || !Array.isArray(items)) {
      window.localStorage.removeItem(CATALOGO_REAL_CACHE_STORAGE_KEY);
      return null;
    }

    const vigente = (Date.now() - syncedAt) <= CATALOGO_REAL_CACHE_TTL_MS;
    if (!vigente) {
      window.localStorage.removeItem(CATALOGO_REAL_CACHE_STORAGE_KEY);
      return null;
    }

    return items;
  } catch {
    return null;
  }
};

const guardarCacheCatalogoReal = (query, items) => {
  if (normalizarTexto(query) || CATALOGO_REAL_CACHE_TTL_MS <= 0 || !Array.isArray(items)) {
    return;
  }

  try {
    window.localStorage.setItem(
      CATALOGO_REAL_CACHE_STORAGE_KEY,
      JSON.stringify({
        syncedAt: Date.now(),
        items
      })
    );
  } catch {
    // No-op: localStorage quota or disabled storage should not break catalog rendering.
  }
};

const normalizarTexto = valor => String(valor || "").trim();
const normalizarClaveImagenSiigo = valor => String(valor || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
const normalizarDescripcionSiigo = valor => {
  const base = String(valor || "")
    .replace(/\r/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return base;
};

const escaparHtml = valor => String(valor || "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

const esLineaListaDescripcion = linea => /^([✅🔹•]\s*|[-*]\s+)/.test(linea);

const limpiarLineaListaDescripcion = linea => normalizarTexto(linea)
  .replace(/^([✅🔹•]\s*|[-*]\s+)/, "")
  .replace(/[ \t]{2,}/g, " ")
  .trim();

const normalizarTextoComparacion = valor => normalizarTexto(valor)
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9\s]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const esEtiquetaOpcionesDisponibles = linea => /^(opcion|opciones)\s+disponibles?$/.test(
  normalizarTextoComparacion(linea)
);

const construirListaDescripcion = lineas => {
  const items = lineas
    .map(limpiarLineaListaDescripcion)
    .filter(Boolean);

  if (!items.length) return "";

  return `<ul>${items.map(item => `<li>${escaparHtml(item)}</li>`).join("")}</ul>`;
};

const formatearDescripcionModalHtml = descripcion => {
  const texto = normalizarDescripcionSiigo(descripcion);
  if (!texto) return "";

  const partes = [];
  let parrafoActual = [];
  let listaActual = [];
  let modoLista = false;
  let omitiendoOpcionesDisponibles = false;

  const vaciarParrafo = () => {
    if (!parrafoActual.length) return;
    partes.push(`<p>${escaparHtml(parrafoActual.join(" "))}</p>`);
    parrafoActual = [];
  };

  const vaciarLista = () => {
    if (!listaActual.length) return;
    const listaHtml = construirListaDescripcion(listaActual);
    if (listaHtml) {
      partes.push(listaHtml);
    }
    listaActual = [];
  };

  const lineas = texto.split("\n").map(linea => normalizarTexto(linea));

  lineas.forEach(linea => {
    if (!linea) {
      vaciarParrafo();
      vaciarLista();
      modoLista = false;
      omitiendoOpcionesDisponibles = false;
      return;
    }

    const lineaSinMarcador = esLineaListaDescripcion(linea) ? limpiarLineaListaDescripcion(linea) : linea;

    if (esEtiquetaOpcionesDisponibles(lineaSinMarcador)) {
      vaciarParrafo();
      vaciarLista();
      modoLista = false;
      omitiendoOpcionesDisponibles = true;
      return;
    }

    if (omitiendoOpcionesDisponibles) {
      return;
    }

    if (esLineaListaDescripcion(linea)) {
      vaciarParrafo();

      const limpia = limpiarLineaListaDescripcion(linea);
      if (!limpia) return;

      if (limpia.endsWith(":")) {
        vaciarLista();
        partes.push(`<p class="catalogo-modal-descripcion-label">${escaparHtml(limpia)}</p>`);
        modoLista = true;
        return;
      }

      listaActual.push(limpia);
      modoLista = true;
      return;
    }

    if (modoLista) {
      listaActual.push(linea);
      return;
    }

    if (parrafoActual.length) {
      vaciarParrafo();
    }
    parrafoActual.push(linea);
  });

  vaciarParrafo();
  vaciarLista();

  if (!partes.length) {
    return `<p>${escaparHtml(texto)}</p>`;
  }

  return partes.join("");
};

const extraerDescripcionDesdeValor = valor => {
  if (typeof valor === "string") {
    return normalizarDescripcionSiigo(valor);
  }

  if (Array.isArray(valor)) {
    const partes = valor
      .map(extraerDescripcionDesdeValor)
      .filter(Boolean);
    return normalizarDescripcionSiigo(partes.join("\n\n"));
  }

  if (valor && typeof valor === "object") {
    return extraerDescripcionDesdeValor(
      valor.descripcion
      || valor.description
      || valor.texto
      || valor.text
      || valor.body
      || ""
    );
  }

  return "";
};
const formatearNombreTipo = valor => normalizarTexto(valor)
  .split(/[\s-]+/)
  .filter(Boolean)
  .map(parte => parte.charAt(0).toUpperCase() + parte.slice(1))
  .join(" ");
const limpiarNumeroWhatsapp = valor => String(valor || "").replace(/\D/g, "");
const normalizarCategoriaSiigoTexto = valor => normalizarTexto(valor)
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9\s]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const canonicalizarCategoriaSiigo = valor => {
  const clave = normalizarCategoriaSiigoTexto(valor);
  if (!clave) return "";
  return ALIAS_CATEGORIA_SIIGO[clave] || clave;
};

const normalizarCategoriasDesdeValorSiigo = valor => {
  const categorias = [];
  const visitado = new WeakSet();

  const agregarTexto = texto => {
    const valorTexto = normalizarTexto(texto);
    if (!valorTexto) return;

    valorTexto
      .split(/[,;|/]+/)
      .map(parte => canonicalizarCategoriaSiigo(parte))
      .filter(Boolean)
      .forEach(categoria => categorias.push(categoria));
  };

  const recorrer = (entrada, profundidad = 0) => {
    if (profundidad > 4 || entrada == null) return;

    if (typeof entrada === "string") {
      agregarTexto(entrada);
      return;
    }

    if (Array.isArray(entrada)) {
      entrada.forEach(item => recorrer(item, profundidad + 1));
      return;
    }

    if (typeof entrada !== "object") {
      return;
    }

    if (visitado.has(entrada)) {
      return;
    }
    visitado.add(entrada);

    const clavesPreferidas = [
      "categoria",
      "categorias",
      "category",
      "categories",
      "name",
      "nombre",
      "label",
      "value",
      "text",
      "title",
      "descripcion",
      "description"
    ];

    clavesPreferidas.forEach(clave => {
      if (Object.prototype.hasOwnProperty.call(entrada, clave)) {
        recorrer(entrada[clave], profundidad + 1);
      }
    });

    if (!Object.keys(entrada).length) {
      return;
    }

    Object.entries(entrada).forEach(([clave, contenido]) => {
      const claveNormalizada = normalizarCategoriaSiigoTexto(clave);
      if (/(categor|group|grupo|famil|line|clasif|segment|tipo)/.test(claveNormalizada)) {
        recorrer(contenido, profundidad + 1);
      }
    });
  };

  recorrer(valor);
  return Array.from(new Set(categorias));
};

const obtenerCategoriasItemSiigo = itemSiigo => {
  if (!itemSiigo || typeof itemSiigo !== "object") {
    return [];
  }

  const categorias = [
    ...normalizarCategoriasDesdeValorSiigo(itemSiigo.categoria),
    ...normalizarCategoriasDesdeValorSiigo(itemSiigo.categorias),
    ...normalizarCategoriasDesdeValorSiigo(itemSiigo.category),
    ...normalizarCategoriasDesdeValorSiigo(itemSiigo.categories)
  ];

  if (!categorias.length) {
    Object.entries(itemSiigo).forEach(([clave, valor]) => {
      const claveNormalizada = normalizarCategoriaSiigoTexto(clave);
      if (/(categor|group|grupo|famil|line|clasif|segment|tipo)/.test(claveNormalizada)) {
        categorias.push(...normalizarCategoriasDesdeValorSiigo(valor));
      }
    });
  }

  return Array.from(new Set(categorias));
};

const obtenerFiltroCatalogoPorId = filtroId => {
  const clave = normalizarCategoriaSiigoTexto(filtroId);
  return FILTROS_CATALOGO_SIIGO.find(filtro => filtro.id === clave) || FILTROS_CATALOGO_SIIGO[0];
};

const itemPerteneceFiltroSiigo = (itemSiigo, filtroCatalogo) => {
  if (!filtroCatalogo || !Array.isArray(filtroCatalogo.categoriasSiigo) || !filtroCatalogo.categoriasSiigo.length) {
    return true;
  }

  const categoriasItem = obtenerCategoriasItemSiigo(itemSiigo);
  if (!categoriasItem.length) {
    return false;
  }

  return categoriasItem.some(categoria => filtroCatalogo.categoriasSiigo.includes(categoria));
};

const filtrarItemsCatalogoPorFiltro = (itemsSiigo, filtroId) => {
  const filtro = obtenerFiltroCatalogoPorId(filtroId);
  return (Array.isArray(itemsSiigo) ? itemsSiigo : []).filter(item => itemPerteneceFiltroSiigo(item, filtro));
};

const detectarTipoTermoformado = itemSiigo => {
  const nombre = normalizarTextoComparacion(itemSiigo?.nombre);
  if (!nombre) return "otro";
  if (/\btapa\b/.test(nombre)) return "tapa";
  if (/\bbase\b/.test(nombre)) return "base";
  return "otro";
};

const extraerCodigoTermoformado = itemSiigo => {
  const candidatos = [
    String(itemSiigo?.nombre || ""),
    String(itemSiigo?.sku || ""),
    String(itemSiigo?.id || "")
  ];

  for (const candidato of candidatos) {
    const texto = candidato.toUpperCase();
    if (!texto) continue;

    const conGuion = texto.match(/\b([A-Z]{1,6})\s*-\s*(\d{1,4}[A-Z]?)\b/);
    if (conGuion) {
      return `${conGuion[1]}-${conGuion[2]}`;
    }

    const conEspacio = texto.match(/\b([A-Z]{1,6})\s+(\d{1,4}[A-Z]?)\b/);
    if (conEspacio) {
      return `${conEspacio[1]}-${conEspacio[2]}`;
    }

    const compacto = texto.match(/\b([A-Z]{2,6})(\d{1,4}[A-Z]?)\b/);
    if (compacto) {
      return `${compacto[1]}-${compacto[2]}`;
    }
  }

  return "";
};

const ordenarItemsTermoformados = itemsSiigo => {
  const items = Array.isArray(itemsSiigo) ? itemsSiigo : [];
  const grupos = new Map();
  const sueltos = [];

  items.forEach((item, index) => {
    const codigo = extraerCodigoTermoformado(item);
    if (!codigo) {
      sueltos.push({ item, index });
      return;
    }

    if (!grupos.has(codigo)) {
      grupos.set(codigo, {
        firstIndex: index,
        bases: [],
        tapas: [],
        otros: []
      });
    }

    const grupo = grupos.get(codigo);
    grupo.firstIndex = Math.min(grupo.firstIndex, index);

    const tipo = detectarTipoTermoformado(item);
    if (tipo === "base") {
      grupo.bases.push({ item, index });
      return;
    }

    if (tipo === "tapa") {
      grupo.tapas.push({ item, index });
      return;
    }

    grupo.otros.push({ item, index });
  });

  const ordenados = [];
  const gruposOrdenados = Array.from(grupos.values()).sort((a, b) => a.firstIndex - b.firstIndex);

  gruposOrdenados.forEach(grupo => {
    grupo.bases.sort((a, b) => a.index - b.index).forEach(entry => ordenados.push(entry.item));
    grupo.tapas.sort((a, b) => a.index - b.index).forEach(entry => ordenados.push(entry.item));
    grupo.otros.sort((a, b) => a.index - b.index).forEach(entry => ordenados.push(entry.item));
  });

  sueltos.sort((a, b) => a.index - b.index).forEach(entry => ordenados.push(entry.item));
  return ordenados;
};

const ordenarItemsCatalogoPorFiltro = (itemsSiigo, filtroId) => {
  const items = Array.isArray(itemsSiigo) ? [...itemsSiigo] : [];
  const filtro = obtenerFiltroCatalogoPorId(filtroId);
  if (filtro.id !== "termoformados") {
    return items;
  }

  return ordenarItemsTermoformados(items);
};

const limpiarFiltrosCatalogoReal = () => {
  if (!catalogoRealFiltros) return;
  catalogoRealFiltros.hidden = true;
  catalogoRealFiltros.innerHTML = "";
};

const resolverFiltroInicialCatalogo = productoBase => {
  const categoriaIds = Array.isArray(productoBase?.categorias) ? productoBase.categorias : [];
  const tipos = new Set();

  categoriaIds.forEach(categoriaId => {
    const categoriaEncontrada = categoriasCatalogo.find(categoria => categoria?.id === categoriaId);
    const tiposCategoria = Array.isArray(categoriaEncontrada?.tipo) ? categoriaEncontrada.tipo : [];
    tiposCategoria.forEach(tipo => tipos.add(normalizarCategoriaSiigoTexto(tipo)));
  });

  if (tipos.has("carnicos")) return "carnicos";
  if (tipos.has("termoformados") || tipos.has("termoformado")) return "termoformados";
  if (tipos.has("flexibles") || tipos.has("flexible")) return "flexibles";
  return "todos";
};

const renderizarFiltrosCatalogoReal = (filtroActivo, onSelect) => {
  if (!catalogoRealFiltros) return;

  catalogoRealFiltros.hidden = false;
  catalogoRealFiltros.innerHTML = "";

  FILTROS_CATALOGO_SIIGO.forEach(filtro => {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = `catalogo-real-filtro-btn${filtro.id === filtroActivo ? " is-active" : ""}`;
    boton.textContent = filtro.label;
    boton.setAttribute("aria-pressed", filtro.id === filtroActivo ? "true" : "false");
    boton.addEventListener("click", () => onSelect(filtro.id));
    catalogoRealFiltros.appendChild(boton);
  });
};

const normalizarListaImagenes = valor => {
  const rutas = [];
  const agregarRuta = entrada => {
    const ruta = normalizarTexto(entrada);
    if (!ruta) return;
    rutas.push(ruta);
  };

  if (typeof valor === "string") {
    agregarRuta(valor);
  } else if (Array.isArray(valor)) {
    valor.forEach(agregarRuta);
  } else if (valor && typeof valor === "object") {
    agregarRuta(valor.imagen);
    agregarRuta(valor.image);
    agregarRuta(valor.src);
    agregarRuta(valor.url);

    if (Array.isArray(valor.imagenes)) {
      valor.imagenes.forEach(agregarRuta);
    }

    if (Array.isArray(valor.images)) {
      valor.images.forEach(agregarRuta);
    }
  }

  return Array.from(new Set(rutas));
};

const combinarRutasImagenes = (...grupos) => {
  const rutas = [];
  grupos.forEach(grupo => {
    if (Array.isArray(grupo)) {
      grupo.forEach(ruta => {
        if (!normalizarTexto(ruta)) return;
        rutas.push(normalizarTexto(ruta));
      });
    }
  });
  return Array.from(new Set(rutas));
};

const construirLinkWhatsappAsesoria = texto => {
  const numero = limpiarNumeroWhatsapp(runtimeConfig.whatsapp || "573001234567");
  if (!numero) return "";
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
};

const obtenerEstadoComercialItem = itemSiigo => {
  const stockNumerico = Number(itemSiigo?.cantidad);
  const precioNumerico = Number(itemSiigo?.precio);
  const sinStock = Number.isFinite(stockNumerico) && stockNumerico <= 0;
  const sinPrecio = !Number.isFinite(precioNumerico) || precioNumerico < 0;

  return {
    stockNumerico,
    precioNumerico,
    sinStock,
    sinPrecio
  };
};

const obtenerCantidadModalCatalogo = () => {
  if (!catalogoModalCantidad) return 1;
  const cantidad = parseInt(catalogoModalCantidad.value, 10);
  return Number.isInteger(cantidad) && cantidad > 0 ? cantidad : 1;
};

function cargarManifestImagenesSiigo() {
  return fetch(RUTA_MANIFEST_IMAGENES_SIIGO)
    .then(respuesta => (respuesta.ok ? respuesta.json() : {}))
    .then(data => {
      manifestImagenesSiigo = {};
      manifestImagenesSiigoNormalizado = {};

      if (!data || typeof data !== "object") {
        return manifestImagenesSiigo;
      }

      Object.entries(data).forEach(([clave, valor]) => {
        const rutas = normalizarListaImagenes(valor);
        if (!rutas.length) return;

        manifestImagenesSiigo[clave] = combinarRutasImagenes(manifestImagenesSiigo[clave], rutas);
        manifestImagenesSiigo[clave.toLowerCase()] = combinarRutasImagenes(
          manifestImagenesSiigo[clave.toLowerCase()],
          rutas
        );

        const claveNormalizada = normalizarClaveImagenSiigo(clave);
        if (claveNormalizada) {
          manifestImagenesSiigoNormalizado[claveNormalizada] = combinarRutasImagenes(
            manifestImagenesSiigoNormalizado[claveNormalizada],
            rutas
          );
        }
      });

      return manifestImagenesSiigo;
    })
    .catch(() => {
      manifestImagenesSiigo = {};
      manifestImagenesSiigoNormalizado = {};
      return manifestImagenesSiigo;
    });
}

function cargarManifestDescripcionesSiigo() {
  return fetch(RUTA_MANIFEST_DESCRIPCIONES_SIIGO)
    .then(respuesta => (respuesta.ok ? respuesta.json() : {}))
    .then(data => {
      manifestDescripcionesSiigo = {};
      manifestDescripcionesSiigoNormalizado = {};

      if (!data || typeof data !== "object") {
        return manifestDescripcionesSiigo;
      }

      Object.entries(data).forEach(([clave, valor]) => {
        const descripcion = extraerDescripcionDesdeValor(valor);
        if (!descripcion) return;

        manifestDescripcionesSiigo[clave] = descripcion;
        manifestDescripcionesSiigo[clave.toLowerCase()] = descripcion;

        const claveNormalizada = normalizarClaveImagenSiigo(clave);
        if (claveNormalizada) {
          manifestDescripcionesSiigoNormalizado[claveNormalizada] = descripcion;
        }
      });

      return manifestDescripcionesSiigo;
    })
    .catch(() => {
      manifestDescripcionesSiigo = {};
      manifestDescripcionesSiigoNormalizado = {};
      return manifestDescripcionesSiigo;
    });
}

function resolverImagenesSiigo(itemSiigo) {
  const imagenesDirectas = combinarRutasImagenes(
    normalizarListaImagenes(itemSiigo?.imagenes),
    normalizarListaImagenes(itemSiigo?.imagen)
  );
  if (imagenesDirectas.length) {
    return imagenesDirectas;
  }

  const candidatos = [
    normalizarTexto(itemSiigo?.sku),
    normalizarTexto(itemSiigo?.id)
  ].filter(Boolean);

  for (const clave of candidatos) {
    const directas = combinarRutasImagenes(
      normalizarListaImagenes(manifestImagenesSiigo[clave]),
      normalizarListaImagenes(manifestImagenesSiigo[clave.toLowerCase()])
    );
    if (directas.length) {
      return directas;
    }

    const normalizadas = normalizarListaImagenes(
      manifestImagenesSiigoNormalizado[normalizarClaveImagenSiigo(clave)]
    );
    if (normalizadas.length) {
      return normalizadas;
    }
  }

  return [];
}

function resolverImagenSiigo(itemSiigo) {
  const imagenes = resolverImagenesSiigo(itemSiigo);
  return imagenes[0] || "";
}

function resolverDescripcionSiigo(itemSiigo) {
  const directa = extraerDescripcionDesdeValor(
    itemSiigo?.descripcion
    || itemSiigo?.description
    || itemSiigo?.detalle
    || itemSiigo?.body_html
    || ""
  );
  if (directa) {
    return directa;
  }

  const candidatos = [
    normalizarTexto(itemSiigo?.sku),
    normalizarTexto(itemSiigo?.id)
  ].filter(Boolean);

  for (const clave of candidatos) {
    const descripcion = extraerDescripcionDesdeValor(
      manifestDescripcionesSiigo[clave]
      || manifestDescripcionesSiigo[clave.toLowerCase()]
      || manifestDescripcionesSiigoNormalizado[normalizarClaveImagenSiigo(clave)]
      || ""
    );

    if (descripcion) {
      return descripcion;
    }
  }

  return "";
}

function actualizarEstadoCatalogoReal(mensaje, estado = "info") {
  if (!catalogoRealStatus) return;
  const texto = normalizarTexto(mensaje);
  if (!texto) {
    catalogoRealStatus.hidden = true;
    catalogoRealStatus.textContent = "";
    catalogoRealStatus.className = "catalogo-real-status";
    return;
  }

  catalogoRealStatus.hidden = false;
  catalogoRealStatus.textContent = texto;
  catalogoRealStatus.className = `catalogo-real-status is-${estado}`;
}

function limpiarPaginacionCatalogoReal() {
  if (!catalogoRealPagination) return;
  catalogoRealPagination.hidden = true;
  catalogoRealPagination.innerHTML = "";
}

function formatearPrecioCatalogo(valor) {
  const precio = Number(valor);
  if (!Number.isFinite(precio) || precio < 0) {
    return "Precio por confirmar";
  }
  return `$${precio.toLocaleString("es-CO")}`;
}

function construirCartKeySiigo(sku, fallbackId) {
  const base = normalizarTexto(sku) || normalizarTexto(fallbackId) || "sin-sku";
  const normalizado = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `siigo::${normalizado || "sin-sku"}`;
}

function agregarItemSiigoAlCarrito(productoBase, itemSiigo, cantidadSolicitada) {
  if (!Number.isInteger(cantidadSolicitada) || cantidadSolicitada < 1) {
    notify("Ingresa una cantidad válida.", "warning");
    return false;
  }

  const stock = Number(itemSiigo.cantidad);
  if (Number.isFinite(stock) && stock > 0 && cantidadSolicitada > stock) {
    notify(`Solo hay ${stock} unidad${stock === 1 ? "" : "es"} disponible${stock === 1 ? "" : "s"}.`, "warning");
    return false;
  }

  const precio = Number(itemSiigo.precio);
  if (!Number.isFinite(precio) || precio < 0) {
    notify("Esta referencia aún no tiene precio definido.", "warning");
    return false;
  }

  const sku = normalizarTexto(itemSiigo.sku) || normalizarTexto(itemSiigo.id) || normalizarTexto(productoBase.id);
  const cartKey = construirCartKeySiigo(sku, itemSiigo.id || productoBase.id);
  const nombreReferencia = normalizarTexto(itemSiigo.nombre) || `${productoBase.nombre} - referencia comercial`;
  const detalleSku = sku ? `SKU: ${sku}` : "SKU no definido";
  const imagenReferencia = normalizarTexto(itemSiigo.imagen) || resolverImagenSiigo(itemSiigo);

  const productoCarrito = {
    cartKey,
    sku,
    id: productoBase.id,
    nombre: nombreReferencia,
    precio,
    cantidad: cantidadSolicitada,
    imagen: imagenReferencia,
    varianteId: sku || null,
    varianteNombre: detalleSku
  };

  const carrito = JSON.parse(localStorage.getItem("carrito")) || [];
  const existente = carrito.find(item => {
    const key = item.cartKey || (item.varianteId ? `${item.id}::${item.varianteId}` : item.id);
    return key === productoCarrito.cartKey;
  });

  if (existente) {
    existente.cantidad += cantidadSolicitada;
  } else {
    carrito.push(productoCarrito);
  }

  localStorage.setItem("carrito", JSON.stringify(carrito));
  notify("Referencia agregada al carrito", "success");
  return true;
}

function renderizarImagenPrincipalModalCatalogo() {
  if (!catalogoModalImage || !catalogoModalEmpty) return;

  const imagenes = estadoCatalogoModal.imagenes;
  if (!imagenes.length) {
    catalogoModalImage.hidden = true;
    catalogoModalImage.removeAttribute("src");
    catalogoModalEmpty.hidden = false;
    if (catalogoModalPrev) catalogoModalPrev.disabled = true;
    if (catalogoModalNext) catalogoModalNext.disabled = true;
    return;
  }

  const indiceMaximo = imagenes.length - 1;
  const indiceNormalizado = Math.max(0, Math.min(estadoCatalogoModal.indiceImagen, indiceMaximo));
  estadoCatalogoModal.indiceImagen = indiceNormalizado;

  catalogoModalImage.src = imagenes[indiceNormalizado];
  catalogoModalImage.hidden = false;
  catalogoModalEmpty.hidden = true;

  if (catalogoModalPrev) {
    catalogoModalPrev.disabled = imagenes.length <= 1;
  }
  if (catalogoModalNext) {
    catalogoModalNext.disabled = imagenes.length <= 1;
  }
}

function renderizarMiniaturasModalCatalogo() {
  if (!catalogoModalThumbs) return;

  const imagenes = estadoCatalogoModal.imagenes;
  if (imagenes.length <= 1) {
    catalogoModalThumbs.hidden = true;
    catalogoModalThumbs.innerHTML = "";
    return;
  }

  catalogoModalThumbs.hidden = false;
  catalogoModalThumbs.innerHTML = "";

  imagenes.forEach((ruta, indice) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `catalogo-modal-thumb${indice === estadoCatalogoModal.indiceImagen ? " is-active" : ""}`;
    btn.setAttribute("aria-label", `Ver imagen ${indice + 1}`);

    const img = document.createElement("img");
    img.src = ruta;
    img.alt = `Miniatura ${indice + 1}`;
    img.loading = "lazy";

    btn.appendChild(img);
    btn.addEventListener("click", () => {
      estadoCatalogoModal.indiceImagen = indice;
      renderizarImagenPrincipalModalCatalogo();
      renderizarMiniaturasModalCatalogo();
    });

    catalogoModalThumbs.appendChild(btn);
  });
}

function renderizarModalCatalogo() {
  const itemSiigo = estadoCatalogoModal.itemSiigo;
  if (!itemSiigo) return;

  const nombre = normalizarTexto(itemSiigo.nombre) || "Referencia comercial";
  const skuValor = normalizarTexto(itemSiigo.sku) || "Sin referencia";
  const estadoComercial = obtenerEstadoComercialItem(itemSiigo);

  if (catalogoModalTitulo) {
    catalogoModalTitulo.textContent = nombre;
  }

  if (catalogoModalDescripcion) {
    const descripcion = extraerDescripcionDesdeValor(itemSiigo.descripcion);
    if (descripcion) {
      catalogoModalDescripcion.innerHTML = formatearDescripcionModalHtml(descripcion);
      catalogoModalDescripcion.hidden = false;
    } else {
      catalogoModalDescripcion.hidden = true;
      catalogoModalDescripcion.innerHTML = "";
    }
  }

  if (catalogoModalSku) {
    catalogoModalSku.textContent = `SKU: ${skuValor}`;
  }

  if (catalogoModalPrecio) {
    catalogoModalPrecio.textContent = formatearPrecioCatalogo(itemSiigo.precio);
  }

  if (catalogoModalStock) {
    if (!Number.isFinite(estadoComercial.stockNumerico)) {
      catalogoModalStock.textContent = "Inventario por confirmar";
      catalogoModalStock.classList.remove("sin-stock");
    } else if (estadoComercial.sinStock) {
      catalogoModalStock.textContent = "Sin inventario";
      catalogoModalStock.classList.add("sin-stock");
    } else {
      catalogoModalStock.textContent = `${estadoComercial.stockNumerico} disponible${estadoComercial.stockNumerico === 1 ? "" : "s"}`;
      catalogoModalStock.classList.remove("sin-stock");
    }
  }

  if (catalogoModalCantidad) {
    catalogoModalCantidad.value = "1";
    if (Number.isFinite(estadoComercial.stockNumerico) && estadoComercial.stockNumerico > 0) {
      catalogoModalCantidad.max = String(estadoComercial.stockNumerico);
    } else {
      catalogoModalCantidad.removeAttribute("max");
    }
  }

  const bloquearCompra = estadoComercial.sinStock || estadoComercial.sinPrecio;
  if (catalogoModalAgregar) {
    catalogoModalAgregar.disabled = bloquearCompra;
  }

  if (catalogoModalComprar) {
    catalogoModalComprar.disabled = bloquearCompra;
  }

  renderizarImagenPrincipalModalCatalogo();
  renderizarMiniaturasModalCatalogo();
}

function abrirModalCatalogo(productoBase, itemSiigo) {
  if (!catalogoItemModal || !itemSiigo) return;

  const imagenes = resolverImagenesSiigo(itemSiigo);
  const descripcion = resolverDescripcionSiigo(itemSiigo);
  const itemConImagenes = {
    ...itemSiigo,
    imagenes,
    descripcion,
    imagen: imagenes[0] || normalizarTexto(itemSiigo.imagen)
  };

  estadoCatalogoModal.productoBase = productoBase;
  estadoCatalogoModal.itemSiigo = itemConImagenes;
  estadoCatalogoModal.imagenes = imagenes;
  estadoCatalogoModal.indiceImagen = 0;

  renderizarModalCatalogo();
  catalogoItemModal.hidden = false;
  catalogoItemModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("catalogo-modal-open");
}

function cerrarModalCatalogo() {
  if (!catalogoItemModal) return;

  catalogoItemModal.hidden = true;
  catalogoItemModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("catalogo-modal-open");
}

function moverGaleriaModalCatalogo(paso) {
  const total = estadoCatalogoModal.imagenes.length;
  if (total <= 1) return;

  estadoCatalogoModal.indiceImagen = (estadoCatalogoModal.indiceImagen + paso + total) % total;
  renderizarImagenPrincipalModalCatalogo();
  renderizarMiniaturasModalCatalogo();
}

function inicializarEventosModalCatalogo() {
  if (catalogoModalClose) {
    catalogoModalClose.addEventListener("click", cerrarModalCatalogo);
  }

  if (catalogoModalBackdrop) {
    catalogoModalBackdrop.addEventListener("click", cerrarModalCatalogo);
  }

  if (catalogoModalPrev) {
    catalogoModalPrev.addEventListener("click", () => moverGaleriaModalCatalogo(-1));
  }

  if (catalogoModalNext) {
    catalogoModalNext.addEventListener("click", () => moverGaleriaModalCatalogo(1));
  }

  if (catalogoModalAgregar) {
    catalogoModalAgregar.addEventListener("click", () => {
      if (!estadoCatalogoModal.productoBase || !estadoCatalogoModal.itemSiigo) return;
      const cantidad = obtenerCantidadModalCatalogo();
      const agregado = agregarItemSiigoAlCarrito(estadoCatalogoModal.productoBase, estadoCatalogoModal.itemSiigo, cantidad);
      if (agregado && catalogoModalCantidad) {
        catalogoModalCantidad.value = "1";
      }
    });
  }

  if (catalogoModalComprar) {
    catalogoModalComprar.addEventListener("click", () => {
      if (!estadoCatalogoModal.productoBase || !estadoCatalogoModal.itemSiigo) return;
      const cantidad = obtenerCantidadModalCatalogo();
      const agregado = agregarItemSiigoAlCarrito(estadoCatalogoModal.productoBase, estadoCatalogoModal.itemSiigo, cantidad);
      if (!agregado) return;
      window.location.href = "carrito.html";
    });
  }

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && catalogoItemModal && !catalogoItemModal.hidden) {
      cerrarModalCatalogo();
    }
  });
}

inicializarEventosModalCatalogo();

function crearTarjetaCatalogoReal(productoBase, itemSiigo) {
  if (!catalogoRealTemplate) {
    return null;
  }

  const fragment = catalogoRealTemplate.content.cloneNode(true);
  const cardRoot = fragment.querySelector(".siigo-item-card");
  const media = fragment.querySelector(".siigo-item-image");
  const nombre = fragment.querySelector(".siigo-item-nombre");
  const sku = fragment.querySelector(".siigo-item-sku");
  const precio = fragment.querySelector(".siigo-item-precio");
  const stock = fragment.querySelector(".siigo-item-stock");
  const inputCantidad = fragment.querySelector(".siigo-item-cantidad");
  const btnAgregar = fragment.querySelector(".siigo-item-agregar");
  const btnDetalle = fragment.querySelector(".siigo-item-detalle");

  const imagenes = resolverImagenesSiigo(itemSiigo);
  const imagenUrl = imagenes[0] || "";
  itemSiigo.imagenes = imagenes;
  itemSiigo.imagen = imagenUrl;
  if (media) {
    if (imagenUrl) {
      const img = document.createElement("img");
      img.src = imagenUrl;
      img.alt = normalizarTexto(itemSiigo.nombre) || "Imagen de producto";
      img.loading = "lazy";
      media.innerHTML = "";
      media.appendChild(img);
    } else {
      media.textContent = "Imagen pendiente";
    }
  }

  if (btnDetalle) {
    btnDetalle.addEventListener("click", event => {
      event.stopPropagation();
      abrirModalCatalogo(productoBase, itemSiigo);
    });
  }

  if (cardRoot) {
    cardRoot.classList.add("is-clickable");
    cardRoot.addEventListener("click", event => {
      if (event.target.closest(".siigo-item-actions")) return;
      abrirModalCatalogo(productoBase, itemSiigo);
    });
  }

  if (nombre) {
    nombre.textContent = normalizarTexto(itemSiigo.nombre) || "Producto";
  }

  if (sku) {
    const skuValor = normalizarTexto(itemSiigo.sku) || "Sin referencia";
    sku.textContent = `SKU: ${skuValor}`;
  }

  if (precio) {
    precio.textContent = formatearPrecioCatalogo(itemSiigo.precio);
  }

  const stockNumerico = Number(itemSiigo.cantidad);
  const precioNumerico = Number(itemSiigo.precio);
  const sinStock = Number.isFinite(stockNumerico) && stockNumerico <= 0;
  const sinPrecio = !Number.isFinite(precioNumerico) || precioNumerico < 0;

  if (stock) {
    if (!Number.isFinite(stockNumerico)) {
      stock.textContent = "Inventario por confirmar";
      stock.classList.remove("sin-stock");
    } else if (sinStock) {
      stock.textContent = "Sin inventario";
      stock.classList.add("sin-stock");
    } else {
      stock.textContent = `${stockNumerico} disponible${stockNumerico === 1 ? "" : "s"}`;
      stock.classList.remove("sin-stock");
    }
  }

  if (inputCantidad) {
    inputCantidad.value = "1";
    if (!Number.isFinite(stockNumerico) || stockNumerico <= 0) {
      inputCantidad.removeAttribute("max");
    } else {
      inputCantidad.max = String(stockNumerico);
    }
  }

  if (btnAgregar && inputCantidad) {
    btnAgregar.disabled = sinStock || sinPrecio;
    btnAgregar.addEventListener("click", () => {
      const cantidad = parseInt(inputCantidad.value, 10);
      const agregado = agregarItemSiigoAlCarrito(productoBase, itemSiigo, cantidad);
      if (agregado) {
        inputCantidad.value = "1";
      }
    });
  }

  return fragment;
}

function obtenerPaginasVisibles(totalPaginas, paginaActiva) {
  if (totalPaginas <= 7) {
    return Array.from({ length: totalPaginas }, (_, index) => index + 1);
  }

  const paginas = [1];
  const inicio = Math.max(2, paginaActiva - 1);
  const fin = Math.min(totalPaginas - 1, paginaActiva + 1);

  if (inicio > 2) {
    paginas.push("...");
  }

  for (let pagina = inicio; pagina <= fin; pagina++) {
    paginas.push(pagina);
  }

  if (fin < totalPaginas - 1) {
    paginas.push("...");
  }

  paginas.push(totalPaginas);
  return paginas;
}

function renderizarControlesPaginacion(totalPaginas, paginaActiva, onChangePage) {
  if (!catalogoRealPagination) return;

  if (totalPaginas <= 1) {
    limpiarPaginacionCatalogoReal();
    return;
  }

  catalogoRealPagination.hidden = false;
  catalogoRealPagination.innerHTML = "";

  const crearBoton = (texto, pagina, disabled = false, activa = false, claseExtra = "") => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = texto;
    btn.className = `catalogo-real-page-btn${activa ? " is-active" : ""}${claseExtra ? ` ${claseExtra}` : ""}`;
    btn.disabled = disabled;
    if (!disabled) {
      btn.addEventListener("click", () => onChangePage(pagina));
    }
    return btn;
  };

  catalogoRealPagination.appendChild(
    crearBoton("Anterior", paginaActiva - 1, paginaActiva <= 1, false, "is-nav")
  );

  const paginasVisibles = obtenerPaginasVisibles(totalPaginas, paginaActiva);
  paginasVisibles.forEach(pagina => {
    if (pagina === "...") {
      const dots = document.createElement("span");
      dots.className = "catalogo-real-page-dots";
      dots.textContent = "...";
      catalogoRealPagination.appendChild(dots);
      return;
    }

    catalogoRealPagination.appendChild(
      crearBoton(String(pagina), pagina, false, pagina === paginaActiva)
    );
  });

  catalogoRealPagination.appendChild(
    crearBoton("Siguiente", paginaActiva + 1, paginaActiva >= totalPaginas, false, "is-nav")
  );

  const resumen = document.createElement("span");
  resumen.className = "catalogo-real-page-summary";
  resumen.textContent = `Pagina ${paginaActiva} de ${totalPaginas}`;
  catalogoRealPagination.appendChild(resumen);
}

function renderizarCatalogoRealPaginado(productoBase, itemsSiigo, opciones = {}) {
  const limpiarEstado = opciones.limpiarEstado !== false;
  const totalItems = Array.isArray(itemsSiigo) ? itemsSiigo.length : 0;
  const totalPaginas = Math.max(1, Math.ceil(totalItems / CATALOGO_REAL_ITEMS_POR_PAGINA));
  let paginaActiva = 1;

  const pintarPagina = () => {
    const inicio = (paginaActiva - 1) * CATALOGO_REAL_ITEMS_POR_PAGINA;
    const fin = inicio + CATALOGO_REAL_ITEMS_POR_PAGINA;
    const itemsPagina = itemsSiigo.slice(inicio, fin);

    catalogoRealContainer.innerHTML = "";
    itemsPagina.forEach(item => {
      const card = crearTarjetaCatalogoReal(productoBase, item);
      if (card) {
        catalogoRealContainer.appendChild(card);
      }
    });

    renderizarControlesPaginacion(totalPaginas, paginaActiva, paginaNueva => {
      const paginaNormalizada = Math.max(1, Math.min(totalPaginas, paginaNueva));
      if (paginaNormalizada === paginaActiva) return;

      paginaActiva = paginaNormalizada;
      pintarPagina();
      catalogoRealContainer.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    if (limpiarEstado) {
      actualizarEstadoCatalogoReal("");
    }
  };

  pintarPagina();
}

async function consultarCatalogoRealSiigo(query, opciones = {}) {
  const cache = leerCacheCatalogoReal(query);
  if (Array.isArray(cache)) {
    return cache;
  }

  const onProgress = typeof opciones.onProgress === "function" ? opciones.onProgress : null;
  const q = normalizarTexto(query);
  const esEstadoReintentable = status => [408, 425, 429, 500, 502, 503, 504].includes(status);
  const esperar = ms => new Promise(resolve => setTimeout(resolve, ms));

  const consultarPagina = async pagina => {
    const params = new URLSearchParams({
      page: String(pagina),
      page_size: String(CATALOGO_REAL_API_PAGE_SIZE),
      fetch_all: "false"
    });
    if (q) {
      params.set("q", q);
    }

    let ultimoError = null;
    for (let intento = 1; intento <= CATALOGO_REAL_MAX_INTENTOS_CONSULTA; intento += 1) {
      try {
        const response = await fetch(`${backendBaseUrl}/catalog/siigo?${params.toString()}`, {
          method: "GET",
          headers: construirHeadersBackend()
        });

        const payloadText = await response.text();
        let payload = {};
        try {
          payload = payloadText ? JSON.parse(payloadText) : {};
        } catch {
          payload = {};
        }

        if (!response.ok || !payload.ok) {
          const error = new Error(payload.message || `Error HTTP ${response.status}`);
          error.status = response.status;
          throw error;
        }

        return payload;
      } catch (error) {
        ultimoError = error;
        const status = Number(error?.status || 0);
        const reintentable = !status || esEstadoReintentable(status);
        const ultimoIntento = intento >= CATALOGO_REAL_MAX_INTENTOS_CONSULTA;

        if (!reintentable || ultimoIntento) {
          break;
        }

        await esperar(CATALOGO_REAL_RETRY_DELAY_MS * intento);
      }
    }

    throw ultimoError || new Error("No se pudo consultar el catálogo comercial.");
  };

  const acumulado = [];
  const vistos = new Set();

  for (let pagina = 1; pagina <= CATALOGO_REAL_API_MAX_PAGES; pagina += 1) {
    if (onProgress) {
      onProgress(pagina);
    }

    const payload = await consultarPagina(pagina);
    const items = Array.isArray(payload.items) ? payload.items : [];
    const pageSizeRespuesta = Math.max(1, Number(payload.page_size || CATALOGO_REAL_API_PAGE_SIZE));
    const paginaRespuesta = Math.max(1, Number(payload.page || pagina));
    const totalRespuesta = Number(payload.total);

    items.forEach(item => {
      const clave = [
        normalizarTexto(item?.id).toLowerCase(),
        normalizarTexto(item?.sku).toLowerCase(),
        normalizarTexto(item?.nombre).toLowerCase()
      ].join("|");

      if (vistos.has(clave)) {
        return;
      }

      vistos.add(clave);
      acumulado.push(item);
    });

    if (CATALOGO_REAL_MAX_ITEMS > 0 && acumulado.length >= CATALOGO_REAL_MAX_ITEMS) {
      break;
    }

    const alcanzoTotal = Number.isFinite(totalRespuesta) && totalRespuesta >= 0
      ? (paginaRespuesta * pageSizeRespuesta) >= totalRespuesta
      : false;
    const ultimaPaginaPorTamano = items.length < pageSizeRespuesta;

    if (alcanzoTotal || ultimaPaginaPorTamano || !items.length) {
      break;
    }
  }

  const resultado = CATALOGO_REAL_MAX_ITEMS > 0
    ? acumulado.slice(0, CATALOGO_REAL_MAX_ITEMS)
    : acumulado;
  guardarCacheCatalogoReal(query, resultado);
  return resultado;
}

async function cargarCatalogoRealSiigo(productoBase) {
  if (!catalogoRealContainer || !catalogoRealTemplate) {
    return;
  }

  if (!backendBaseUrl) {
    actualizarEstadoCatalogoReal("No se encontró configuración de backend para consultar el catálogo.", "warning");
    limpiarPaginacionCatalogoReal();
    limpiarFiltrosCatalogoReal();
    return;
  }

  actualizarEstadoCatalogoReal("Consultando catálogo comercial...", "loading");
  catalogoRealContainer.innerHTML = "";
  limpiarPaginacionCatalogoReal();
  limpiarFiltrosCatalogoReal();

  try {
    await Promise.all([
      cargarManifestImagenesSiigo(),
      cargarManifestDescripcionesSiigo()
    ]);
    const itemsSiigo = await consultarCatalogoRealSiigo("", {
      onProgress: pagina => {
        actualizarEstadoCatalogoReal(`Consultando catálogo comercial (página ${pagina})...`, "loading");
      }
    });

    if (!itemsSiigo.length) {
      actualizarEstadoCatalogoReal("No encontramos referencias en este momento.", "warning");
      catalogoRealContainer.innerHTML = "<p class='catalogo-real-empty'>Aún no hay referencias disponibles. Cuando exista inventario activo aparecerá aquí con SKU, precio y cantidad.</p>";
      limpiarPaginacionCatalogoReal();
      limpiarFiltrosCatalogoReal();
      return;
    }

    let filtroActivo = resolverFiltroInicialCatalogo(productoBase);
    const aplicarFiltro = filtroId => {
      filtroActivo = obtenerFiltroCatalogoPorId(filtroId).id;
      renderizarFiltrosCatalogoReal(filtroActivo, aplicarFiltro);

      const filtroActual = obtenerFiltroCatalogoPorId(filtroActivo);
      const itemsFiltrados = filtrarItemsCatalogoPorFiltro(itemsSiigo, filtroActivo);
      const itemsOrdenados = ordenarItemsCatalogoPorFiltro(itemsFiltrados, filtroActivo);

      if (!itemsOrdenados.length) {
        const mensajeVacio = filtroActual.id === "todos"
          ? "No encontramos referencias en este momento."
          : `No encontramos referencias para ${filtroActual.label.toLowerCase()} en este momento.`;

        actualizarEstadoCatalogoReal(mensajeVacio, "warning");
        catalogoRealContainer.innerHTML = "<p class='catalogo-real-empty'>No hay referencias disponibles para este filtro en este momento.</p>";
        limpiarPaginacionCatalogoReal();
        return;
      }

      const total = itemsOrdenados.length;
      const plural = total === 1 ? "" : "s";
      const mensaje = filtroActual.id === "todos"
        ? `${total} referencia${plural} disponible${plural}.`
        : `${total} referencia${plural} en ${filtroActual.label}.`;

      actualizarEstadoCatalogoReal(mensaje, "success");
      renderizarCatalogoRealPaginado(productoBase, itemsOrdenados, { limpiarEstado: false });
    };

    aplicarFiltro(filtroActivo);
  } catch (error) {
    console.error("Error cargando catálogo comercial:", error);
    actualizarEstadoCatalogoReal("No se pudo cargar el catálogo comercial en este momento.", "error");
    catalogoRealContainer.innerHTML = "<p class='catalogo-real-empty'>Ocurrió un problema consultando el catálogo. Verifica credenciales, permisos y conectividad del backend.</p>";
    limpiarPaginacionCatalogoReal();
    limpiarFiltrosCatalogoReal();
  }
}

if (producto) {
  const card = template.content.cloneNode(true);

  const categoriasProducto = Array.isArray(producto.categorias) ? producto.categorias : [];
  const categoriaValida = categoriaContexto && categoriasProducto.includes(categoriaContexto);
  const categoriaPrincipal = categoriaValida ? categoriaContexto : (categoriasProducto[0] || null);

  const categoriaDefinida = categoriaPrincipal
    ? categoriasCatalogo.find(item => item && item.id === categoriaPrincipal)
    : null;

  const categoriaNombre = categoriaDefinida?.nombre || (categoriaPrincipal
    ? (nombresCategorias[categoriaPrincipal] || categoriaPrincipal)
    : "Línea general");

  const tiposCategoria = Array.isArray(categoriaDefinida?.tipo)
    ? categoriaDefinida.tipo
    : [];
  const tiposCategoriaTexto = tiposCategoria
    .map(formatearNombreTipo)
    .filter(Boolean)
    .join(", ");

  const categoriaEditorial = categoriaPrincipal || "general";
  const nombreNodo = card.querySelector(".nombre-producto");
  const descripcionNodo = card.querySelector(".descripcion-larga-producto");
  const categoriaNodo = card.querySelector(".detalle-categoria");
  const lineaNodo = card.querySelector(".detalle-linea");
  const ventajasNodo = card.querySelector(".detalle-ventajas-lista");
  const usosNodo = card.querySelector(".detalle-usos-lista");
  const btnWhatsappAsesoria = card.querySelector(".btn-detalle-whatsapp");

  if (nombreNodo) {
    nombreNodo.textContent = producto.nombre;
  }

  if (descripcionNodo) {
    const descripcionBase = normalizarTexto(producto.descripcionLarga) || `Solución de empaque para ${producto.nombre}.`;
    descripcionNodo.textContent = descripcionBase;
  }

  if (btnWhatsappAsesoria) {
    const mensajeAsesoria = `Hola, quiero asesoría para ${producto.nombre}.`;
    const whatsappHref = construirLinkWhatsappAsesoria(mensajeAsesoria);

    if (whatsappHref) {
      btnWhatsappAsesoria.href = whatsappHref;
    } else {
      btnWhatsappAsesoria.hidden = true;
    }
  }

  if (categoriaNodo) {
    categoriaNodo.textContent = `Tipo: ${tiposCategoriaTexto || categoriaNombre}`;
  }

  if (lineaNodo) {
    lineaNodo.textContent = `Línea: ${categoriaNombre}`;
  }

  if (detalleTitulo) {
    detalleTitulo.textContent = producto.nombre;
  }

  if (detalleSubtitulo) {
    detalleSubtitulo.textContent = "";
  }

  if (detalleBreadcrumb) {
    const rutaCategoria = categoriaPrincipal
      ? `productos.html?categoria=${categoriaPrincipal}`
      : "productos.html";
    detalleBreadcrumb.innerHTML = `<a href="index.html">Inicio</a> / <a href="productos.html">Productos</a> / <a href="${rutaCategoria}">${categoriaNombre}</a> / ${producto.nombre}`;
  }

  document.title = `${producto.nombre} - Universo Mercantil`;

  const ventajas = ventajasPorCategoria[categoriaEditorial] || ventajasGenerales;
  if (ventajasNodo) {
    ventajasNodo.innerHTML = "";
    ventajas.forEach(ventaja => {
      const li = document.createElement("li");
      li.textContent = ventaja;
      ventajasNodo.appendChild(li);
    });
  }

  const usos = usosPorCategoria[categoriaEditorial] || usosGenerales;
  if (usosNodo) {
    usosNodo.innerHTML = "";
    usos.forEach(uso => {
      const chip = document.createElement("span");
      chip.className = "detalle-uso-chip";
      chip.textContent = uso;
      usosNodo.appendChild(chip);
    });
  }

  const track = card.querySelector(".carrusel-fila");
  const prevButton = card.querySelector(".prev");
  const nextButton = card.querySelector(".next");
  let slides = [];
  let currentIndex = 0;

  function obtenerImagenesActivas() {
    if (categoriaValida && typeof obtenerImagenesProductoPorCategoria === "function") {
      const imagenesPorCategoria = obtenerImagenesProductoPorCategoria(producto, categoriaContexto);
      if (Array.isArray(imagenesPorCategoria) && imagenesPorCategoria.length) {
        return imagenesPorCategoria;
      }
    }

    if (typeof obtenerTodasImagenesProducto === "function") {
      const imagenesConsolidadas = obtenerTodasImagenesProducto(producto);
      if (Array.isArray(imagenesConsolidadas) && imagenesConsolidadas.length) {
        return imagenesConsolidadas;
      }
    }

    if (Array.isArray(producto.imagenes) && producto.imagenes.length) {
      return producto.imagenes;
    }

    return [];
  }

  function renderizarCarousel(imagenes, nombreMostrar) {
    if (!track) return;

    track.innerHTML = "";

    imagenes.forEach(src => {
      const img = document.createElement("img");
      img.src = src;
      img.alt = nombreMostrar;
      img.loading = "lazy";
      track.appendChild(img);
    });

    slides = Array.from(track.children);
    currentIndex = 0;

    if (!prevButton || !nextButton) {
      return;
    }

    if (slides.length <= 1) {
      prevButton.style.display = "none";
      nextButton.style.display = "none";
    } else {
      prevButton.style.display = "inline-flex";
      nextButton.style.display = "inline-flex";
    }

    updateCarousel();
  }

  function updateCarousel() {
    if (!track || !slides.length) {
      if (track) {
        track.style.transform = "translateX(0)";
      }
      return;
    }
    const width = slides[0].getBoundingClientRect().width;
    track.style.transform = `translateX(-${currentIndex * width}px)`;
  }

  window.addEventListener("resize", updateCarousel);

  if (nextButton) {
    nextButton.addEventListener("click", () => {
      if (currentIndex < slides.length - 1) {
        currentIndex++;
        updateCarousel();
      }
    });
  }

  if (prevButton) {
    prevButton.addEventListener("click", () => {
      if (currentIndex > 0) {
        currentIndex--;
        updateCarousel();
      }
    });
  }

  renderizarCarousel(obtenerImagenesActivas(), producto.nombre);

  container.appendChild(card);
  await cargarCatalogoRealSiigo(producto);
} else {
  container.textContent = "Producto no encontrado.";
  if (catalogoRealContainer) {
    catalogoRealContainer.innerHTML = "";
  }
  actualizarEstadoCatalogoReal("No hay producto base para consultar referencias.", "warning");
  if (detalleTitulo) {
    detalleTitulo.textContent = "Producto no disponible";
  }
  if (detalleSubtitulo) {
    detalleSubtitulo.textContent = "No encontramos el producto solicitado. Explora otras opciones del catálogo.";
  }
}
});


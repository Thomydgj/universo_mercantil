// Configuración runtime para producción.
// Ajusta estos valores según el entorno en Plesk.
const hostname = window.location.hostname;
const isLocalPreview = hostname === "localhost" || hostname === "127.0.0.1";

window.UNIVERSO_CONFIG = {
  backendBaseUrl: isLocalPreview ? "http://127.0.0.1:8000" : "https://api.tudominio.com",
  apiKey: "",
  whatsapp: "573001234567",
  phoneDisplay: "+57 300 123 4567",
  phoneDial: "+573001234567"
};

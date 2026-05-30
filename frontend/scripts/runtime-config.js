// Configuración runtime para producción.
// Ajusta estos valores según el entorno en Plesk.
const hostname = window.location.hostname;
const isLocalPreview = hostname === "localhost" || hostname === "127.0.0.1";

window.UNIVERSO_CONFIG = {
  backendBaseUrl: isLocalPreview ? "http://127.0.0.1:8000" : "https://universo-mercantil-backend.onrender.com",
  apiKey: "9Bdtmj9sBanSZ2yGEUBwF6NZDZqMxQn3gQKjwI7+b29088G+",
  whatsapp: "573152316175",
  phoneDisplay: "+57 315 231 6175",
  phoneDial: "+573152316175"
};

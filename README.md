# Universo Mercantil

E-commerce estático (HTML/CSS/JS) con backend Flask para links de pago Wompi, registro de pedidos y notificaciones.

## Estructura del Proyecto

- `frontend/`: sitio estático completo (páginas, scripts, estilos, assets).
- `backend/`: API Flask, persistencia y lógica de pagos.
- `backend/sql/`: esquema inicial de PostgreSQL.
- `backend/requirements.txt`: dependencias Python para despliegue en Plesk.

## Requisitos

- Python 3.11+
- Credenciales Wompi
- Credenciales SMTP
- PostgreSQL (opcional, recomendado para producción)

## Configuración Local

1. Crear entorno virtual e instalar dependencias:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r backend/requirements.txt
```

2. Configurar variables de entorno:

- Copiar `backend/.env.example` como `backend/.env`
- Completar valores reales de Wompi, SMTP y correos destino
- Para activar base de datos, completar `DATABASE_URL`
- Para catálogo en tiempo real desde Siigo, completar `SIIGO_USERNAME` y `SIIGO_ACCESS_KEY`

3. Ejecutar backend:

```bash
python backend/app.py
```

4. Servir frontend estático:

```bash
cd frontend
python -m http.server 5500
```

## Configuración Runtime del Frontend

El frontend usa `window.UNIVERSO_CONFIG` desde `frontend/scripts/runtime-config.js`.

Debes ajustar mínimo:

- `backendBaseUrl`
- `apiKey` (si usas `BACKEND_API_KEY`)
- `whatsapp`
- `phoneDisplay`
- `phoneDial`

## Endpoints Backend

- `POST /checkout`
- `POST /order/create-for-payment`
- `POST /webhook`
- `GET /checkout/resultado`
- `GET /health`
- `GET /catalog/siigo`

## Catálogo desde Siigo

Endpoint:

- `GET /catalog/siigo`

Parámetros opcionales:

- `q`: texto para filtrar por nombre o SKU
- `page`: página de resultados (default `1`)
- `page_size`: cantidad por página (default `50`, max `200`)
- `fetch_all`: cuando es `true`, recorre todas las páginas del inventario desde `page` (default según `SIIGO_FETCH_ALL_DEFAULT`, recomendado `true`)
- `max_pages`: límite de páginas a recorrer cuando `fetch_all=true` (default `SIIGO_MAX_PAGES`)
- `hide_without_image`: cuando es `true`, excluye referencias sin imagen (usa `imagen` del payload y/o `frontend/scripts/siigo_imagenes.json`). Default según `SIIGO_HIDE_ITEMS_WITHOUT_IMAGE_DEFAULT`

Variables de entorno relacionadas:

- `SIIGO_API_BASE_URL` (default `https://api.siigo.com`)
- `SIIGO_PRODUCTS_PATH` (default `/v1/products`)
- `SIIGO_USERNAME`
- `SIIGO_ACCESS_KEY`
- `SIIGO_PARTNER_ID` (opcional)
- `SIIGO_REQUEST_TIMEOUT_SECONDS`
- `SIIGO_TOKEN_SAFETY_SECONDS`
- `SIIGO_MAX_PAGES` (default `200`)
- `SIIGO_FETCH_ALL_DEFAULT` (default `true`)
- `SIIGO_HIDE_ITEMS_WITHOUT_IMAGE_DEFAULT` (default `true`)
- `SIIGO_IMAGE_MANIFEST_PATH` (default `../frontend/scripts/siigo_imagenes.json`)

Sincronización de inventario al confirmar pago (`APPROVED`):

- Cuando Wompi confirma una transacción aprobada, el backend intenta descontar cantidades en Siigo por cada item del pedido.
- El proceso es idempotente por pedido: una vez marcado como sincronizado, no vuelve a descontar aunque lleguen webhook y redirect.
- Al actualizar inventario, se invalida la caché de catálogo para reflejar cambios en la siguiente consulta.

Variables adicionales:

- `SIIGO_SYNC_INVENTORY_ON_APPROVED` (default `true`)
- `SIIGO_INVENTORY_UPDATE_METHOD` (default `PATCH`, soporta `PATCH` o `PUT`)
- `SIIGO_INVENTORY_UPDATE_PATH_TEMPLATE` (default `/v1/products/{product_id}`)

## Imágenes para catálogo Siigo (frontend)

Para mostrar imágenes por producto del catálogo Siigo en `detalles.html`, usa el archivo:

- `frontend/scripts/siigo_imagenes.json`
- `frontend/scripts/siigo_descripciones.json`

Formato esperado (clave por `SKU` o por `id` de Siigo):

```json
{
	"C27580": "assets/images/siigo/C27580.webp",
	"89cb488a-66b3-407f-a22e-d827616ad9cf": "assets/images/siigo/D13592.webp"
}
```

Recomendación:

- Guarda los archivos en `frontend/assets/images/siigo/`
- Usa rutas relativas desde `frontend/` como en el ejemplo
- Mantén actualizado `siigo_descripciones.json` para mostrar la descripción en el modal de detalle por SKU

## Base de Datos (PostgreSQL)

Cuando `DATABASE_URL` esta configurado, el backend usa:

- `orders`
- `order_items`
- `payment_events`

SQL inicial: `backend/sql/001_init_postgres.sql`.

Migración desde JSON:

```bash
python backend/migrate_json_to_db.py
```

## Optimización de Imágenes

Dry run:

```bash
python frontend/scripts/optimize_images.py --root frontend/assets/images --dry-run --verbose
```

Aplicar cambios:

```bash
python frontend/scripts/optimize_images.py --root frontend/assets/images --verbose
```

## Despliegue en Plesk

Revisa `despliegue.md` para el paso a paso completo.

## Despliegue rápido en Render (Blueprint)

Este repositorio ya incluye `render.yaml` en la raiz.

1. Sube cambios a tu repo remoto (GitHub/GitLab).
2. En Render: `New +` -> `Blueprint`.
3. Selecciona el repositorio y rama.
4. Render creara:
- Web Service `universo-mercantil-backend`
- PostgreSQL `universo-mercantil-db`
5. Completa las variables marcadas como `sync: false` (Wompi, Siigo, SMTP, CORS, URLs).

Verificaciones despues del deploy:

1. `GET /health` responde `ok: true`.
2. `BACKEND_BASE_URL` coincide con la URL publica del servicio Render.
3. `ALLOWED_ORIGINS` incluye los dominios reales del frontend con esquema (`https://...`).
4. En Wompi, la URL de eventos apunta a `https://TU-BACKEND-RENDER/webhook`.

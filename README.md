# Universo Mercantil

E-commerce estatico (HTML/CSS/JS) con backend Flask para links de pago Wompi, registro de pedidos y notificaciones.

## Estructura del Proyecto

- `frontend/`: sitio estatico completo (paginas, scripts, estilos, assets).
- `backend/`: API Flask, persistencia y logica de pagos.
- `backend/sql/`: esquema inicial de PostgreSQL.
- `backend/requirements.txt`: dependencias Python para despliegue en Plesk.

## Requisitos

- Python 3.11+
- Credenciales Wompi
- Credenciales SMTP
- PostgreSQL (opcional, recomendado para produccion)

## Configuracion Local

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
- Para catalogo en tiempo real desde Siigo, completar `SIIGO_USERNAME` y `SIIGO_ACCESS_KEY`

3. Ejecutar backend:

```bash
python backend/app.py
```

4. Servir frontend estatico:

```bash
cd frontend
python -m http.server 5500
```

## Configuracion Runtime del Frontend

El frontend usa `window.UNIVERSO_CONFIG` desde `frontend/scripts/runtime-config.js`.

Debes ajustar minimo:

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

## Catalogo desde Siigo

Endpoint:

- `GET /catalog/siigo`

Parametros opcionales:

- `q`: texto para filtrar por nombre o SKU
- `page`: pagina de resultados (default `1`)
- `page_size`: cantidad por pagina (default `50`, max `200`)
- `fetch_all`: cuando es `true`, recorre todas las paginas del inventario desde `page` (default segun `SIIGO_FETCH_ALL_DEFAULT`, recomendado `true`)
- `max_pages`: limite de paginas a recorrer cuando `fetch_all=true` (default `SIIGO_MAX_PAGES`)
- `hide_without_image`: cuando es `true`, excluye referencias sin imagen (usa `imagen` del payload y/o `frontend/scripts/siigo_imagenes.json`). Default segun `SIIGO_HIDE_ITEMS_WITHOUT_IMAGE_DEFAULT`

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

## Imagenes para catalogo Siigo (frontend)

Para mostrar imagenes por producto del catalogo Siigo en `detalles.html`, usa el archivo:

- `frontend/scripts/siigo_imagenes.json`
- `frontend/scripts/siigo_descripciones.json`

Formato esperado (clave por `SKU` o por `id` de Siigo):

```json
{
	"C27580": "assets/images/siigo/C27580.webp",
	"89cb488a-66b3-407f-a22e-d827616ad9cf": "assets/images/siigo/D13592.webp"
}
```

Recomendacion:

- Guarda los archivos en `frontend/assets/images/siigo/`
- Usa rutas relativas desde `frontend/` como en el ejemplo
- Mantén actualizado `siigo_descripciones.json` para mostrar la descripcion en el modal de detalle por SKU

## Base de Datos (PostgreSQL)

Cuando `DATABASE_URL` esta configurado, el backend usa:

- `orders`
- `order_items`
- `payment_events`

SQL inicial: `backend/sql/001_init_postgres.sql`.

Migracion desde JSON:

```bash
python backend/migrate_json_to_db.py
```

## Optimizacion de Imagenes

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

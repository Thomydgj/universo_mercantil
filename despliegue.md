# Despliegue

Este proyecto queda separado en dos partes:

- `frontend/` para archivos estáticos
- `backend/` para API Flask

## Opción recomendada: Backend en Render

Usa Render para el backend y conserva el frontend donde prefieras (Plesk o Render Static Site).

### 1) Preparar repositorio

Este repo ya incluye:

- `render.yaml` con servicio web para backend Flask
- `backend/runtime.txt` fijando Python 3.11.9
- `gunicorn` en `backend/requirements.txt`

No necesitas crear archivos adicionales para Render: el Blueprint queda listo con `render.yaml`.

### 2) Crear servicio en Render

1. En Render, selecciona **New +** > **Blueprint**.
2. Conecta el repositorio y rama principal.
3. Verifica que detecte el servicio `universo-mercantil-backend`.
4. Crea el servicio y espera el primer deploy.

### 3) Configurar variables de entorno (obligatorio)

En Render > Service > Environment, crea estas variables:

- `WOMPI_PUBLIC_KEY`
- `WOMPI_PRIVATE_KEY`
- `WOMPI_INTEGRITY_SECRET`
- `WOMPI_WEBHOOK_SECRET`
- `WOMPI_URL`
- `SIIGO_USERNAME`
- `SIIGO_ACCESS_KEY`
- `SIIGO_API_BASE_URL`
- `SIIGO_PRODUCTS_PATH`
- `SIIGO_PARTNER_ID` (si aplica)
- `SIIGO_REQUEST_TIMEOUT_SECONDS`
- `SIIGO_TOKEN_SAFETY_SECONDS`
- `SIIGO_CATALOG_CACHE_TTL_SECONDS`
- `SIIGO_HIDE_ITEMS_WITHOUT_IMAGE_DEFAULT`
- `SIIGO_IMAGE_MANIFEST_PATH`
- `SIIGO_SYNC_INVENTORY_ON_APPROVED`
- `SIIGO_INVENTORY_UPDATE_METHOD`
- `SIIGO_INVENTORY_UPDATE_PATH_TEMPLATE`
- `DATABASE_URL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_FROM`
- `FACTURACION_EMAIL_TO`
- `FACTURACION_EMAIL_CC`
- `COMPANY_NAME`
- `EMAIL_LOGO_URL`
- `SUPPORT_EMAIL`
- `BACKEND_API_KEY` (recomendado)
- `ALLOWED_ORIGINS`
- `BACKEND_BASE_URL`
- `FRONTEND_BASE_URL`
- `LOG_LEVEL`
- `FLASK_DEBUG=false`

Usa `backend/.env.example` como checklist de referencia.

Notas importantes:

- `BACKEND_BASE_URL` debe quedar con la URL publica de Render, por ejemplo: `https://universo-mercantil-backend.onrender.com`
- `ALLOWED_ORIGINS` debe incluir tus dominios frontend reales con `https://`
- `DATABASE_URL` se completa automaticamente desde la base PostgreSQL creada por `render.yaml`

### 4) Conectar frontend con backend Render

En `frontend/scripts/runtime-config.js` configura:

- `backendBaseUrl` con URL pública de Render (ej: `https://tu-api.onrender.com`)
- `apiKey` con el mismo valor de `BACKEND_API_KEY` (si lo activas)

Si el frontend está en Plesk, publica después los cambios en `httpdocs`.

### 5) Actualizar seguridad de orígenes

En `ALLOWED_ORIGINS` agrega dominios reales del frontend, por ejemplo:

`https://www.tudominio.com,https://tudominio.com`

### 6) Configurar webhook de Wompi

En Wompi, apunta el webhook a:

`https://tu-api.onrender.com/webhook`

### 7) Validaciones post-despliegue

1. `GET /health` debe responder `ok: true`.
2. `GET /catalog/siigo` debe responder sin 503.
3. Probar checkout sandbox completo con redirección a `resultado.html`.
4. Confirmar llegada de correo de facturación.

## Opción alternativa: Backend en Plesk

## 1) Frontend (sitio público)

1. En Plesk, abre el dominio principal y entra a `httpdocs`.
2. Sube el contenido de la carpeta `frontend/` (no la carpeta, sino su contenido).
3. Verifica que `index.html` quede en `httpdocs/index.html`.
4. Edita `httpdocs/scripts/runtime-config.js` con valores de producción:

```js
window.UNIVERSO_CONFIG = {
  backendBaseUrl: "https://api.tudominio.com",
  apiKey: "",
  whatsapp: "573001234567",
  phoneDisplay: "+57 300 123 4567",
  phoneDial: "+573001234567"
};
```

## 2) Backend (Python Flask)

Recomendación: usar subdominio API, por ejemplo `api.tudominio.com`.

1. Crea el subdominio en Plesk.
2. Entra a `Python` para ese subdominio.
3. Define:
- `Application root`: carpeta `backend` del proyecto subido
- `Startup file`: `passenger_wsgi.py`
- `Application entry point`: `application`
4. Instala dependencias:

```bash
pip install -r requirements.txt
```

5. Crea `backend/.env` tomando como base `backend/.env.example` y configura:
- `WOMPI_*`
- `SMTP_*`
- `FACTURACION_EMAIL_*`
- `DATABASE_URL` (si usas PostgreSQL)
- `ALLOWED_ORIGINS` con dominios reales
- `BACKEND_BASE_URL=https://api.tudominio.com`
- `FRONTEND_BASE_URL=https://www.tudominio.com`

6. Reinicia la aplicación Python desde Plesk.

## 3) Base de datos (opcional pero recomendado)

1. Crea la base PostgreSQL desde Plesk.
2. Ejecuta el script `backend/sql/001_init_postgres.sql`.
3. Configura `DATABASE_URL`.
4. (Opcional) Migra pedidos históricos:

```bash
python migrate_json_to_db.py
```

## 4) Validaciones finales

1. Abre `https://www.tudominio.com`.
2. Valida navegación entre páginas y carga de imágenes.
3. Ejecuta un checkout de prueba (sandbox) y confirma que redirige a `resultado.html`.
4. Verifica que `GET /health` responda en el subdominio API.
5. Revisa logs de webhook y correo de facturación.

## 5) Actualización de versiones

En cada cambio:

1. Sube frontend actualizado a `httpdocs`.
2. Sube backend actualizado al root de la app Python.
3. Si cambian dependencias, ejecuta de nuevo `pip install -r requirements.txt`.
4. Reinicia la app Python.

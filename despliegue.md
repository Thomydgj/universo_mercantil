# Despliegue en Plesk

Este proyecto queda separado en dos partes:

- `frontend/` para archivos estaticos
- `backend/` para API Flask

## 1) Frontend (sitio publico)

1. En Plesk, abre el dominio principal y entra a `httpdocs`.
2. Sube el contenido de la carpeta `frontend/` (no la carpeta, sino su contenido).
3. Verifica que `index.html` quede en `httpdocs/index.html`.
4. Edita `httpdocs/scripts/runtime-config.js` con valores de produccion:

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

Recomendacion: usar subdominio API, por ejemplo `api.tudominio.com`.

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

6. Reinicia la aplicacion Python desde Plesk.

## 3) Base de datos (opcional pero recomendado)

1. Crea la base PostgreSQL desde Plesk.
2. Ejecuta el script `backend/sql/001_init_postgres.sql`.
3. Configura `DATABASE_URL`.
4. (Opcional) Migra pedidos historicos:

```bash
python migrate_json_to_db.py
```

## 4) Validaciones finales

1. Abre `https://www.tudominio.com`.
2. Valida navegacion entre paginas y carga de imagenes.
3. Ejecuta un checkout de prueba (sandbox) y confirma que redirige a `resultado.html`.
4. Verifica que `GET /health` responda en el subdominio API.
5. Revisa logs de webhook y correo de facturacion.

## 5) Actualizacion de versiones

En cada cambio:

1. Sube frontend actualizado a `httpdocs`.
2. Sube backend actualizado al root de la app Python.
3. Si cambian dependencias, ejecuta de nuevo `pip install -r requirements.txt`.
4. Reinicia la app Python.

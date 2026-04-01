# Universo Mercantil

E-commerce estatico (HTML/CSS/JS) con backend Flask para generar links de pago Wompi, registrar pedidos y notificar facturacion.

## Arquitectura

- Frontend: paginas estaticas y scripts vanilla en `scripts/`.
- Backend: API Flask en `backend/app.py`.
- Persistencia: PostgreSQL cuando `DATABASE_URL` esta definido; fallback a JSON local (`backend/orders_store.json`) si no esta definido.
- Pago: Wompi Payment Links + webhook + reconciliacion por redirect.

## Requisitos

- Python 3.11+
- Dependencias en `requirements.txt`
- Credenciales Wompi sandbox/produccion
- Credenciales SMTP para notificacion

## Configuracion Local

1. Crear entorno virtual e instalar dependencias:

```bash
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
```

2. Configurar variables de entorno:

- Copiar `backend/.env.example` como `backend/.env`
- Completar valores reales de Wompi, SMTP y correos destino
- Para activar base de datos, completar `DATABASE_URL`

3. Ejecutar backend:

```bash
python backend/app.py
```

4. Servir frontend estatico (ejemplo simple):

```bash
python -m http.server 5500
```

## Variables de Entorno

Variables principales usadas por `backend/app.py`:

- `WOMPI_PUBLIC_KEY`
- `WOMPI_PRIVATE_KEY`
- `WOMPI_INTEGRITY_SECRET`
- `WOMPI_URL`
- `BACKEND_BASE_URL`
- `DATABASE_URL`
- `ALLOWED_ORIGINS`
- `FLASK_DEBUG`
- `PORT`
- `LOG_LEVEL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_FROM`
- `FACTURACION_EMAIL_TO`
- `FACTURACION_EMAIL_CC`

## Configuracion Frontend (Runtime)

El frontend soporta configuracion opcional en tiempo de ejecucion mediante `window.UNIVERSO_CONFIG`.

Ejemplo:

```html
<script>
	window.UNIVERSO_CONFIG = {
		backendBaseUrl: "https://api.tudominio.com",
		whatsapp: "573001234567",
		phoneDisplay: "+57 300 123 4567",
		phoneDial: "+573001234567"
	};
</script>
```

Si no se define, se usan valores por defecto para entorno local.

## Endpoints Backend

- `POST /checkout`: crea payment link en Wompi.
- `POST /order/create-for-payment`: crea pedido en estado `pending_payment` para pago directo.
- `POST /webhook`: procesa eventos de Wompi.
- `GET /checkout/resultado`: reconciliacion al volver del checkout.

## Base de Datos (PostgreSQL)

Cuando `DATABASE_URL` esta configurado, el backend guarda automaticamente en base de datos:

- `orders`: cabecera de pedido y estado transaccional
- `order_items`: detalle de productos por pedido
- `payment_events`: eventos de pago/webhook para auditoria

SQL inicial disponible en `backend/sql/001_init_postgres.sql`.

### Migrar pedidos existentes de JSON a PostgreSQL

Con `DATABASE_URL` configurado en `backend/.env`:

```bash
python backend/migrate_json_to_db.py
```

El script toma datos de `backend/orders_store.json` y los inserta en las tablas nuevas.

## Checklist de Produccion

- `FLASK_DEBUG=false`
- `ALLOWED_ORIGINS` restringido a dominios reales
- llaves Wompi de produccion (no sandbox)
- `backend/.env` fuera del control de versiones
- HTTPS activo en frontend y backend
- monitoreo de logs de webhook y notificaciones

## Playbook de Secretos (Obligatorio)

Si algun secreto fue expuesto en git o chat, ejecutar inmediatamente:

1. Rotar credenciales en origen:
- regenerar `WOMPI_PRIVATE_KEY`
- regenerar `WOMPI_INTEGRITY_SECRET`
- cambiar `SMTP_PASSWORD` (App Password)
- validar nuevos destinos de facturacion

2. Actualizar `backend/.env` con secretos nuevos.

3. Confirmar que `backend/.env` este ignorado por git.

4. Limpiar historial git para remover secretos antiguos si ya fueron commiteados.

Ejemplo con `git filter-repo`:

```bash
pip install git-filter-repo
git filter-repo --path backend/.env --invert-paths
git push --force --all
git push --force --tags
```

Despues de reescribir historial, todos los colaboradores deben reclonar o hacer hard reset controlado.

## Riesgos Residuales

- Si no se configura `DATABASE_URL`, el backend seguira usando JSON local.
- Para produccion, usar PostgreSQL con backups y monitoreo.

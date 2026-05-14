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

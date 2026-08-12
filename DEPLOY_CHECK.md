Checklist para desplegar y verificar el checkout

1) Confirmar variables de entorno en Render

- En el servicio backend (Render) asegúrate de que `ALLOWED_ORIGINS` contenga los orígenes del frontend: ejemplo:
  https://www.universomercantilsas.com,https://universomercantilsas.com

- Verifica también `BACKEND_BASE_URL` y `FRONTEND_BASE_URL` si están configuradas.

2) Redeploy

- Después de actualizar `render.yaml` o las variables en el panel de Render, redeploya el servicio.

3) Verificar preflight (OPTIONS) con curl

Reemplaza `<BACKEND_URL>` por tu dominio (sin ruta final). Ejemplo: `universo-mercantil-backend.onrender.com`

```bash
curl -i -X OPTIONS 'https://<BACKEND_URL>/checkout' \
  -H 'Origin: https://www.universomercantilsas.com' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: content-type, x-api-key, x-idempotency-key'
```

Respuesta esperada: cabeceras que incluyan `Access-Control-Allow-Origin: https://www.universomercantilsas.com` y `Access-Control-Allow-Headers` con `x-api-key` y `x-idempotency-key`.

4) Verificar logs

- Abre los logs del servicio en Render y busca la línea que contiene `Preflight /checkout origin=`; revisa `allowed=True`.

5) Prueba de integración desde el frontend

- Abre la página de producción y realiza un intento de pago con la consola de desarrollador abierta (Network). Verifica que la petición `OPTIONS /checkout` responda con 200 y las cabeceras CORS correctas, y que luego la `POST /checkout` complete sin error de CORS.

6) Si sigue fallando

- Revisa que el `Origin` exacto (incluyendo esquema y subdominio) esté en `ALLOWED_ORIGINS`.
- Como alternativa temporal, puedes permitir todos los orígenes en Render estableciendo `ALLOWED_ORIGINS` a `*` (no recomendado en producción).

7) Comandos útiles para logs en Render (CLI)

- Listar deploys y ver logs: usa la interfaz web de Render o la CLI (`render`), por ejemplo:

```bash
render services list
render logs show <service-name>
```

(la CLI requiere autenticación configurada).
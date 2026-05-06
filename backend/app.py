import hashlib
import hmac
import json
import logging
import os
import re
import smtplib
import time
import uuid
from datetime import datetime, timezone
from email.message import EmailMessage
from pathlib import Path

import requests
from flask import Flask, request, jsonify
from dotenv import load_dotenv
from flask_cors import CORS

load_dotenv()

try:
    from .db_store import (
        DB_ENABLED,
        db_find_order_by_payment_link_id,
        db_get_order,
        db_record_payment_event,
        db_upsert_order,
        explain_storage_mode,
        init_database,
    )
except ImportError:
    from db_store import (
        DB_ENABLED,
        db_find_order_by_payment_link_id,
        db_get_order,
        db_record_payment_event,
        db_upsert_order,
        explain_storage_mode,
        init_database,
    )

app = Flask(__name__)
logger = logging.getLogger(__name__)
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO").upper())

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

# Variables de entorno
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:5500,http://127.0.0.1:5500,http://localhost:8000"
    ).split(",")
    if origin.strip()
]

# Configuración de CORS restringida por entorno
CORS(app, resources={r"/*": {"origins": ALLOWED_ORIGINS}})

WOMPI_PUBLIC_KEY = os.getenv("WOMPI_PUBLIC_KEY")
WOMPI_PRIVATE_KEY = os.getenv("WOMPI_PRIVATE_KEY")
WOMPI_INTEGRITY_SECRET = os.getenv("WOMPI_INTEGRITY_SECRET")
WOMPI_WEBHOOK_SECRET = os.getenv("WOMPI_WEBHOOK_SECRET") or WOMPI_INTEGRITY_SECRET
WOMPI_URL = os.getenv("WOMPI_URL", "https://sandbox.wompi.co/v1")
BASE_URL = os.getenv("BACKEND_BASE_URL") or os.getenv("NGROK_BASE_URL") or "http://localhost:8000"
FRONTEND_BASE_URL = (os.getenv("FRONTEND_BASE_URL") or "http://localhost:5500").rstrip("/")
SALES_WHATSAPP_NUMBER = (os.getenv("SALES_WHATSAPP_NUMBER") or "").strip()
BACKEND_API_KEY = os.getenv("BACKEND_API_KEY", "").strip()
MIN_ORDER_AMOUNT_IN_CENTS = int(os.getenv("MIN_ORDER_AMOUNT_IN_CENTS", "50000"))
MAX_ORDER_AMOUNT_IN_CENTS = int(os.getenv("MAX_ORDER_AMOUNT_IN_CENTS", "10000000000"))
RATE_LIMIT_WINDOW_SECONDS = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))
RATE_LIMIT_MAX_REQUESTS = int(os.getenv("RATE_LIMIT_MAX_REQUESTS", "50"))

SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USER or "no-reply@universomercantil.com")
FACTURACION_EMAIL_TO = os.getenv("FACTURACION_EMAIL_TO")
FACTURACION_EMAIL_CC = os.getenv("FACTURACION_EMAIL_CC", "")

STORE_PATH = Path(__file__).resolve().parent / "orders_store.json"
_request_window: dict[str, list[float]] = {}

if DB_ENABLED:
    init_database()
logger.info("Modo de persistencia activo: %s", explain_storage_mode())


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def make_error(message: str, status_code: int = 400):
    return jsonify({"ok": False, "message": message}), status_code


def parse_int(value, default=0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def generate_reference() -> str:
    return f"orden_{int(time.time())}_{uuid.uuid4().hex[:8]}"


def validate_email(value: str) -> bool:
    return bool(EMAIL_RE.match((value or "").strip()))


def request_rate_limited(scope: str) -> bool:
    now = time.time()
    remote_addr = request.headers.get("X-Forwarded-For", request.remote_addr or "unknown").split(",")[0].strip()
    key = f"{scope}:{remote_addr}"
    window = _request_window.get(key, [])
    window = [entry for entry in window if (now - entry) < RATE_LIMIT_WINDOW_SECONDS]

    if len(window) >= RATE_LIMIT_MAX_REQUESTS:
        _request_window[key] = window
        return True

    window.append(now)
    _request_window[key] = window
    return False


def is_allowed_origin() -> bool:
    if not ALLOWED_ORIGINS:
        return True

    origin = (request.headers.get("Origin") or "").strip()
    if origin in ALLOWED_ORIGINS:
        return True

    referer = (request.headers.get("Referer") or "").strip()
    return any(referer.startswith(f"{allowed}/") or referer == allowed for allowed in ALLOWED_ORIGINS)


def verify_api_key() -> bool:
    if not BACKEND_API_KEY:
        return True

    provided = (request.headers.get("X-Api-Key") or "").strip()
    return bool(provided) and hmac.compare_digest(provided, BACKEND_API_KEY)


def extract_signature_from_headers() -> str:
    candidates = [
        request.headers.get("X-Wompi-Signature"),
        request.headers.get("X-Event-Checksum"),
        request.headers.get("X-Signature"),
    ]
    raw = next((value for value in candidates if value), "")
    if not raw:
        return ""
    if "=" in raw:
        raw = raw.split("=", 1)[1]
    return raw.strip().lower()


def verify_webhook_signature(raw_payload: bytes) -> bool:
    if not WOMPI_WEBHOOK_SECRET:
        logger.error("WOMPI_WEBHOOK_SECRET no configurado")
        return False

    received_signature = extract_signature_from_headers()
    if not received_signature:
        return False

    expected_signature = hmac.new(
        WOMPI_WEBHOOK_SECRET.encode("utf-8"),
        raw_payload,
        hashlib.sha256,
    ).hexdigest().lower()
    return hmac.compare_digest(expected_signature, received_signature)


def validate_order_payload(data: dict, *, is_direct_payment: bool) -> tuple[dict | None, str | None]:
    if not isinstance(data, dict):
        return None, "Payload invalido"

    customer_email = (data.get("customer_email") or "").strip()
    if not validate_email(customer_email):
        return None, "Email invalido"

    raw_items = data.get("items") or []
    if not isinstance(raw_items, list) or not raw_items:
        return None, "El pedido debe incluir al menos un producto"

    normalized_items = []
    items_total = 0
    for item in raw_items:
        if not isinstance(item, dict):
            return None, "Formato de item invalido"

        quantity = parse_int(item.get("cantidad"), 0)
        price = parse_int(item.get("precio"), -1)
        if quantity < 1 or price < 0:
            return None, "Cantidad o precio invalido"

        subtotal = quantity * price
        items_total += subtotal

        normalized_items.append({
            "id": item.get("id"),
            "sku": item.get("sku"),
            "nombre": item.get("nombre") or "Producto",
            "variante_id": item.get("variante_id"),
            "variante_nombre": item.get("variante_nombre"),
            "cantidad": quantity,
            "precio": price,
            "subtotal": subtotal,
        })

    shipping_cost = max(0, parse_int(data.get("shipping_cost"), 0))
    delivery_type = (data.get("delivery_type") or "shipping").lower()
    if delivery_type not in {"shipping", "pickup"}:
        return None, "Tipo de entrega invalido"

    if delivery_type == "pickup":
        shipping_cost = 0

    payment_method = ("direct" if is_direct_payment else (data.get("payment_method") or "wompi")).lower()
    if payment_method not in {"wompi", "direct"}:
        return None, "Metodo de pago invalido"

    subtotal = items_total
    amount_in_cents = (subtotal + shipping_cost) * 100
    if amount_in_cents < MIN_ORDER_AMOUNT_IN_CENTS:
        return None, "El valor total del pedido no alcanza el minimo permitido"
    if amount_in_cents > MAX_ORDER_AMOUNT_IN_CENTS:
        return None, "El valor total del pedido excede el maximo permitido"

    shipping_address = data.get("shipping_address") if isinstance(data.get("shipping_address"), dict) else {}
    if delivery_type == "pickup":
        shipping_address = {}

    buyer = data.get("buyer") if isinstance(data.get("buyer"), dict) else {}

    normalized = {
        "reference": generate_reference(),
        "amount_in_cents": amount_in_cents,
        "currency": (data.get("currency") or "COP").upper(),
        "customer_email": customer_email,
        "name": data.get("name") or "Compra en carrito",
        "description": data.get("description") or f"Compra de {len(normalized_items)} productos",
        "buyer": buyer,
        "shipping_address": shipping_address,
        "items": normalized_items,
        "subtotal": subtotal,
        "shipping_cost": shipping_cost,
        "shipping_zone": data.get("shipping_zone") or "Zona Nacional",
        "delivery_type": delivery_type,
        "payment_method": payment_method,
        "pickup_message": data.get("pickup_message") or "",
    }
    return normalized, None


def build_checkout_result_ui(sync: dict | None) -> dict:
    sync_status = (sync or {}).get("status") or "unknown"
    reason = (sync or {}).get("reason") or ""

    tone = "info"
    title = "Estamos procesando tu pago"
    subtitle = "Tu proceso de checkout fue recibido. Te sugerimos verificar el estado de tu pedido en unos segundos."

    if sync_status == "ok":
        tone = "success"
        title = "Pago confirmado"
        subtitle = "Tu pago fue validado correctamente y tu pedido esta en proceso."
    elif sync_status == "error":
        tone = "error"
        title = "No se pudo confirmar el pago"
        subtitle = "Hubo un problema procesando la confirmacion. Intenta nuevamente o contactanos."
    elif sync_status == "ignored" and "DECLINED" in reason:
        tone = "error"
        title = "Pago rechazado"
        subtitle = "La pasarela reporto que el pago fue rechazado. Puedes intentarlo de nuevo con otro metodo."
    elif sync_status == "ignored":
        tone = "warning"
        title = "Pago en revision"
        subtitle = "Aun no tenemos una aprobacion final del pago."

    detail = (sync or {}).get("message") or reason or "Sin detalle adicional"

    return {
        "tone": tone,
        "title": title,
        "subtitle": subtitle,
        "sync_status": sync_status,
        "detail": detail,
    }


def load_order_store() -> dict:
    if not STORE_PATH.exists():
        return {"orders": {}}
    try:
        with STORE_PATH.open("r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, dict) and isinstance(data.get("orders"), dict):
                return data
    except Exception as exc:
        logger.warning("No se pudo leer %s: %s", STORE_PATH.name, exc)
    return {"orders": {}}


def save_order_store(store: dict) -> None:
    with STORE_PATH.open("w", encoding="utf-8") as f:
        json.dump(store, f, ensure_ascii=False, indent=2)


def upsert_order(reference: str, patch: dict) -> dict:
    if DB_ENABLED:
        return db_upsert_order(reference, patch)

    store = load_order_store()
    orders = store.setdefault("orders", {})
    current = orders.get(reference, {"reference": reference, "created_at": now_iso()})
    current.update(patch)
    current["updated_at"] = now_iso()
    orders[reference] = current
    save_order_store(store)
    return current


def get_order(reference: str) -> dict | None:
    if DB_ENABLED:
        return db_get_order(reference)

    return load_order_store().get("orders", {}).get(reference)


def find_order_by_payment_link_id(payment_link_id: str) -> tuple[str, dict] | None:
    if DB_ENABLED:
        return db_find_order_by_payment_link_id(payment_link_id)

    if not payment_link_id:
        return None

    orders = load_order_store().get("orders", {})
    for reference, order in orders.items():
        if (order or {}).get("payment_link_id") == payment_link_id:
            return reference, order
    return None


def consultar_transaccion_wompi(transaction_id: str) -> dict:
    headers = {
        "Authorization": f"Bearer {WOMPI_PRIVATE_KEY}",
        "Content-Type": "application/json"
    }
    try:
        resp = requests.get(f"{WOMPI_URL}/transactions/{transaction_id}", headers=headers, timeout=20)
        payload = resp.json()
    except Exception as exc:
        logger.error("Error consultando transaccion %s: %s", transaction_id, exc)
        return {}

    if resp.status_code >= 400:
        logger.error("Error Wompi transaccion %s: %s", transaction_id, payload)
        return {}

    return payload.get("data", {})


def procesar_transaccion_confirmada(transaction_id: str, source: str = "webhook") -> tuple[dict, int]:
    if not transaction_id:
        return {"status": "ignored", "reason": "transaction_id_not_found"}, 200

    tx = consultar_transaccion_wompi(transaction_id)
    tx_status = (tx.get("status") or "").upper()
    reference = tx.get("reference")
    payment_link_id = tx.get("payment_link_id")

    db_record_payment_event(reference or "sin_referencia", source, transaction_id, tx_status or "UNKNOWN", tx)

    if not reference:
        return {"status": "ignored", "reason": "reference_not_found"}, 200

    matched_reference = reference
    order = get_order(reference)

    if not order and payment_link_id:
        matched = find_order_by_payment_link_id(payment_link_id)
        if matched:
            matched_reference, order = matched

    if not order:
        order = {"reference": matched_reference, "items": []}

    upsert_order(matched_reference, {
        "transaction_id": transaction_id,
        "transaction_status": tx_status,
        "wompi_reference": reference,
        "payment_link_id": payment_link_id,
        "last_sync_source": source,
        "webhook_received_at": now_iso() if source == "webhook" else order.get("webhook_received_at"),
        "redirect_sync_at": now_iso() if source == "redirect" else order.get("redirect_sync_at"),
    })

    if tx_status != "APPROVED":
        return {"status": "ignored", "reason": f"transaction_status_{tx_status or 'unknown'}"}, 200

    if order.get("email_notified"):
        return {"status": "ok", "message": "already_notified"}, 200

    sent, detail = enviar_correo_facturacion(order, tx)

    upsert_order(matched_reference, {
        "email_notified": bool(sent),
        "email_notified_at": now_iso() if sent else None,
        "email_error": None if sent else detail,
        "status": "approved_notified" if sent else "approved_pending_notification",
    })

    if not sent:
        logger.error("Error correo facturacion (%s): %s", matched_reference, detail)
        return {"status": "error", "message": "email_not_sent"}, 500

    return {"status": "ok", "message": "email_sent"}, 200


def build_email_content(order: dict, transaction: dict) -> tuple[str, str]:
    reference = order.get("reference", "sin_referencia")
    amount_in_cents = int(order.get("amount_in_cents") or (transaction or {}).get("amount_in_cents") or 0)
    amount = amount_in_cents / 100
    currency = order.get("currency", (transaction or {}).get("currency") or "COP")
    payment_method = (order.get("payment_method") or (transaction or {}).get("payment_method_type") or "N/A").upper()
    delivery_type = (order.get("delivery_type") or "shipping").lower()
    shipping_cost = int(order.get("shipping_cost") or 0)
    shipping_zone = order.get("shipping_zone") or "N/A"

    tx_customer = (transaction or {}).get("customer_data") or {}
    tx_billing = (transaction or {}).get("billing_data") or {}
    tx_full_name = (tx_customer.get("full_name") or "").strip().split()
    tx_first_name = tx_full_name[0] if tx_full_name else ""
    tx_last_name = " ".join(tx_full_name[1:]) if len(tx_full_name) > 1 else ""

    buyer = order.get("buyer") or {
        "nombre": tx_first_name,
        "apellidos": tx_last_name,
        "numero_documento": tx_billing.get("legal_id") or "",
        "telefono": tx_customer.get("phone_number") or "",
        "email": (transaction or {}).get("customer_email") or "",
    }
    shipping = order.get("shipping_address") or ((transaction or {}).get("shipping_address") or {})
    items = order.get("items") or []

    tx_id = (transaction or {}).get("id", "N/A")
    tx_status = (transaction or {}).get("status") or (order.get("status") or "N/A")

    lines = [
        f"Nueva compra verificada por Wompi ({tx_status}).",
        "",
        "=== Resumen de pago ===",
        f"Referencia: {reference}",
        f"Transaccion Wompi: {tx_id}",
        f"Metodo: {payment_method}",
        f"Tipo de entrega: {'Recoger en tienda' if delivery_type == 'pickup' else 'Enviar a domicilio'}",
        f"Zona de envio: {shipping_zone}",
        f"Costo de envio: {shipping_cost:,.0f} {currency}".replace(",", "."),
        f"Total: {amount:,.0f} {currency}".replace(",", "."),
        "",
        "=== Datos del comprador ===",
        f"Nombre: {buyer.get('nombre', '')} {buyer.get('apellidos', '')}".strip() or "Nombre: N/A",
        f"No. Documento: {buyer.get('numero_documento') or tx_billing.get('legal_id') or 'N/A'}",
        f"Telefono: {buyer.get('telefono', 'N/A')}",
        f"Email: {buyer.get('email', order.get('customer_email', 'N/A'))}",
        "",
    ]

    if delivery_type == "pickup":
        lines.extend([
            "=== Entrega en tienda ===",
            order.get("pickup_message") or "Tu pedido estara disponible para entrega en tienda en 5 horas habiles.",
            ""
        ])
    else:
        lines.extend([
            "=== Direccion de envio ===",
            f"Departamento: {shipping.get('departamento', 'N/A')}",
            f"Ciudad: {shipping.get('ciudad', 'N/A')}",
            f"Direccion: {shipping.get('direccion', 'N/A')}",
            f"Detalle: {shipping.get('detalle_direccion', 'N/A') or 'N/A'}",
            ""
        ])

    lines.extend([
        "=== Productos comprados ===",
    ])

    if not items:
        lines.append("(Sin detalle de productos en payload)")
    else:
        for idx, item in enumerate(items, start=1):
            nombre = item.get("nombre", "Producto")
            cantidad = item.get("cantidad", 1)
            precio = int(item.get("precio") or 0)
            subtotal = int(item.get("subtotal") or precio * cantidad)
            lines.append(
                f"{idx}. {nombre} | Cantidad: {cantidad} | Precio: {precio:,.0f} | Subtotal: {subtotal:,.0f}".replace(",", ".")
            )

    subject = f"[Facturacion] Compra aprobada {reference}"
    body = "\n".join(lines)
    return subject, body


def enviar_correo_facturacion(order: dict, transaction: dict) -> tuple[bool, str]:
    if not FACTURACION_EMAIL_TO:
        return False, "FACTURACION_EMAIL_TO no esta configurado"

    if not SMTP_HOST or not SMTP_USER or not SMTP_PASSWORD:
        return False, "Configura SMTP_HOST, SMTP_USER y SMTP_PASSWORD"

    subject, body = build_email_content(order, transaction)

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = SMTP_FROM
    msg["To"] = FACTURACION_EMAIL_TO
    if FACTURACION_EMAIL_CC.strip():
        msg["Cc"] = FACTURACION_EMAIL_CC
    msg.set_content(body)

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=30) as smtp:
            smtp.starttls()
            smtp.login(SMTP_USER, SMTP_PASSWORD)
            smtp.send_message(msg)
        return True, "Correo enviado"
    except Exception as exc:
        return False, str(exc)


def generar_firma(reference, amount_in_cents, currency, integrity_secret):
    cadena = f"{reference}{amount_in_cents}{currency}{integrity_secret or ''}"
    return hashlib.sha256(cadena.encode()).hexdigest()


@app.after_request
def add_security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' https:"
    return response


@app.route("/health", methods=["GET"])
def healthcheck():
    return jsonify({
        "ok": True,
        "service": "universo-mercantil-backend",
        "storage_mode": explain_storage_mode(),
        "timestamp": now_iso(),
    }), 200


@app.route("/checkout", methods=["POST", "OPTIONS"])
def checkout():
    if request.method == "OPTIONS":
        # Respuesta al preflight
        return ("", 200)

    if request_rate_limited("checkout"):
        return make_error("Demasiadas solicitudes. Intenta nuevamente en unos segundos.", 429)

    if not is_allowed_origin():
        return make_error("Origen no permitido", 403)

    if not verify_api_key():
        return make_error("Acceso no autorizado", 401)

    data = request.get_json(force=True)

    normalized_payload, validation_error = validate_order_payload(data, is_direct_payment=False)
    if validation_error:
        return make_error(validation_error, 400)

    reference = normalized_payload["reference"]
    amount_in_cents = normalized_payload["amount_in_cents"]
    currency = normalized_payload["currency"]
    customer_email = normalized_payload["customer_email"]
    name = normalized_payload["name"]
    description = normalized_payload["description"]
    buyer = normalized_payload["buyer"]
    shipping_address = normalized_payload["shipping_address"]
    items = normalized_payload["items"]
    subtotal = normalized_payload["subtotal"]
    shipping_cost = normalized_payload["shipping_cost"]
    shipping_zone = normalized_payload["shipping_zone"]
    delivery_type = normalized_payload["delivery_type"]
    payment_method = normalized_payload["payment_method"]
    pickup_message = normalized_payload["pickup_message"]

    signature = generar_firma(reference, amount_in_cents, currency, WOMPI_INTEGRITY_SECRET)

    payload = {
        "amount_in_cents": amount_in_cents,
        "currency": currency,
        "reference": reference,
        "customer_email": customer_email,
        "redirect_url": f"{FRONTEND_BASE_URL}/resultado.html",
        "name": name,
        "description": description,
        "collect_shipping": False,
        "single_use": True,
        "signature": {
            "checksum": signature,
            "fields": ["reference", "amount_in_cents", "currency"]
        }
    }

    headers = {
        "Authorization": f"Bearer {WOMPI_PRIVATE_KEY}",
        "Content-Type": "application/json"
    }

    response = requests.post(f"{WOMPI_URL}/payment_links", json=payload, headers=headers, timeout=25)
    try:
        wompi_payload = response.json()
    except ValueError:
        logger.error("Respuesta no JSON recibida desde Wompi (status=%s)", response.status_code)
        return make_error("No fue posible iniciar el pago en este momento", 502)

    wompi_data = wompi_payload.get("data") or {}
    payment_link_id = wompi_data.get("id")
    link = wompi_data.get("url") or wompi_data.get("permalink")
    if not link and payment_link_id:
        link = f"https://checkout.wompi.co/l/{payment_link_id}"

    if response.status_code < 400 and payment_link_id:
        upsert_order(reference, {
            "amount_in_cents": amount_in_cents,
            "currency": currency,
            "customer_email": customer_email,
            "name": name,
            "description": description,
            "subtotal": subtotal,
            "shipping_cost": shipping_cost,
            "shipping_zone": shipping_zone,
            "delivery_type": delivery_type,
            "payment_method": payment_method,
            "pickup_message": pickup_message,
            "buyer": buyer,
            "shipping_address": shipping_address,
            "items": items,
            "payment_link_id": payment_link_id,
            "payment_link_url": link,
            "status": "payment_link_created",
            "email_notified": False,
        })

    if link:
        return jsonify({"checkout_url": link}), 201

    logger.error("Error creando payment link en Wompi (status=%s)", response.status_code)
    return make_error("No fue posible iniciar el pago en este momento", 502)


@app.route("/order/create-for-payment", methods=["POST", "OPTIONS"])
def create_order_for_direct_payment():
    if request.method == "OPTIONS":
        return ("", 200)

    if request_rate_limited("direct-payment"):
        return make_error("Demasiadas solicitudes. Intenta nuevamente en unos segundos.", 429)

    if not is_allowed_origin():
        return make_error("Origen no permitido", 403)

    if not verify_api_key():
        return make_error("Acceso no autorizado", 401)

    data = request.get_json(force=True)
    normalized_payload, validation_error = validate_order_payload(data, is_direct_payment=True)
    if validation_error:
        return make_error(validation_error, 400)

    reference = normalized_payload["reference"]
    amount_in_cents = normalized_payload["amount_in_cents"]
    currency = normalized_payload["currency"]
    customer_email = normalized_payload["customer_email"]
    items = normalized_payload["items"]
    buyer = normalized_payload["buyer"]
    shipping_address = normalized_payload["shipping_address"]
    delivery_type = normalized_payload["delivery_type"]
    payment_method = "direct"
    shipping_cost = normalized_payload["shipping_cost"]
    shipping_zone = normalized_payload["shipping_zone"]

    upsert_order(reference, {
        "amount_in_cents": amount_in_cents,
        "currency": currency,
        "customer_email": customer_email,
        "name": normalized_payload["name"],
        "description": normalized_payload["description"],
        "subtotal": normalized_payload["subtotal"],
        "shipping_cost": shipping_cost,
        "shipping_zone": shipping_zone,
        "delivery_type": delivery_type,
        "payment_method": payment_method,
        "pickup_message": normalized_payload["pickup_message"],
        "buyer": buyer,
        "shipping_address": shipping_address,
        "items": items,
        "status": "pending_payment",
        "email_notified": False,
    })

    return jsonify({
        "ok": True,
        "reference": reference,
        "status": "pending_payment"
    }), 201


@app.route("/checkout/resultado", methods=["GET", "OPTIONS"])
def resultado():
    if request.method == "OPTIONS":
        return ("", 200)

    if request_rate_limited("checkout-resultado"):
        return make_error("Demasiadas solicitudes", 429)

    params = request.args.to_dict()
    tx_id = params.get("id") or params.get("transaction_id") or params.get("transaction-id")
    reconcile = None
    if tx_id:
        reconcile, _ = procesar_transaccion_confirmada(tx_id, source="redirect")

    return jsonify({
        "ok": True,
        "message": "Resultado de checkout procesado",
        "transaction_id": tx_id,
        "sync": reconcile,
        "ui": build_checkout_result_ui(reconcile)
    }), 200


@app.route("/webhook", methods=["POST", "OPTIONS"])
def webhook():
    if request.method == "OPTIONS":
        return ("", 200)

    if request_rate_limited("webhook"):
        return make_error("Demasiadas solicitudes", 429)

    raw_payload = request.get_data(cache=True)
    if not verify_webhook_signature(raw_payload):
        logger.warning("Intento de webhook con firma invalida")
        return make_error("Firma de webhook invalida", 401)

    evento = request.get_json(silent=True) or {}
    if not isinstance(evento, dict):
        return make_error("Payload invalido", 400)

    logger.info("Webhook recibido")

    tx_from_event = (evento.get("data") or {}).get("transaction") or {}
    tx_id = tx_from_event.get("id") or (evento.get("data") or {}).get("id")
    result, status_code = procesar_transaccion_confirmada(tx_id, source="webhook")
    return jsonify(result), status_code


if __name__ == "__main__":
    debug_mode = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    port = int(os.getenv("PORT", "8000"))
    app.run(host="0.0.0.0", port=port, debug=debug_mode)

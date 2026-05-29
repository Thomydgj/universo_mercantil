import hashlib
import hmac
import html
import json
import logging
import math
import os
import re
import smtplib
import time
import uuid
from datetime import datetime, timezone
from email.message import EmailMessage
from pathlib import Path
from urllib.parse import quote, urlparse

import requests
from flask import Flask, request, jsonify
from dotenv import load_dotenv
from flask_cors import CORS


def _env_int(name: str, default: int, minimum: int = 1) -> int:
    raw = os.getenv(name)
    if raw is None:
        return default

    try:
        parsed = int(raw)
    except (TypeError, ValueError):
        return default

    return parsed if parsed >= minimum else default


def _split_csv(raw_value: str | None) -> list[str]:
    return [entry.strip() for entry in str(raw_value or "").split(",") if entry.strip()]


def _normalize_origin(value: str) -> str:
    raw = str(value or "").strip().rstrip("/")
    if not raw:
        return ""

    parse_target = raw if "://" in raw else f"https://{raw}"
    parsed = urlparse(parse_target)
    host = (parsed.hostname or "").strip().lower()
    if not host:
        return ""

    scheme = (parsed.scheme or "https").strip().lower()
    if scheme not in {"http", "https"}:
        return ""

    port = parsed.port
    if port and not ((scheme == "http" and port == 80) or (scheme == "https" and port == 443)):
        return f"{scheme}://{host}:{port}"

    return f"{scheme}://{host}"


def _expand_allowed_origins(raw_value: str) -> list[str]:
    normalized: list[str] = []
    for entry in _split_csv(raw_value):
        if "://" in entry:
            candidate = _normalize_origin(entry)
            if candidate:
                normalized.append(candidate)
            continue

        host = entry.strip().strip("/")
        if not host:
            continue
        normalized.extend(filter(None, [_normalize_origin(f"https://{host}"), _normalize_origin(f"http://{host}")]))

    seen: set[str] = set()
    unique = []
    for origin in normalized:
        if origin in seen:
            continue
        seen.add(origin)
        unique.append(origin)
    return unique

BACKEND_DIR = Path(__file__).resolve().parent
ENV_PATH = BACKEND_DIR / ".env"
ENV_EXAMPLE_PATH = BACKEND_DIR / ".env.example"

if ENV_PATH.exists():
    load_dotenv(ENV_PATH)
elif ENV_EXAMPLE_PATH.exists():
    load_dotenv(ENV_EXAMPLE_PATH)
else:
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
ALLOWED_ORIGINS = _expand_allowed_origins(
    os.getenv("ALLOWED_ORIGINS", "http://localhost:5500,http://127.0.0.1:5500,http://localhost:8000")
)

MAX_REQUEST_BODY_BYTES = _env_int("MAX_REQUEST_BODY_BYTES", 262144, 1024)

# Configuración de CORS restringida por entorno
CORS(app, resources={r"/*": {"origins": ALLOWED_ORIGINS}})
app.config["MAX_CONTENT_LENGTH"] = MAX_REQUEST_BODY_BYTES

WOMPI_PUBLIC_KEY = os.getenv("WOMPI_PUBLIC_KEY")
WOMPI_PRIVATE_KEY = os.getenv("WOMPI_PRIVATE_KEY")
WOMPI_INTEGRITY_SECRET = os.getenv("WOMPI_INTEGRITY_SECRET")
WOMPI_WEBHOOK_SECRET = os.getenv("WOMPI_WEBHOOK_SECRET") or WOMPI_INTEGRITY_SECRET
WOMPI_URL = os.getenv("WOMPI_URL", "https://sandbox.wompi.co/v1")
BASE_URL = os.getenv("BACKEND_BASE_URL") or os.getenv("NGROK_BASE_URL") or "http://localhost:8000"
FRONTEND_BASE_URL = (os.getenv("FRONTEND_BASE_URL") or "http://localhost:5500").rstrip("/")
SALES_WHATSAPP_NUMBER = (os.getenv("SALES_WHATSAPP_NUMBER") or "").strip()
BACKEND_API_KEY = os.getenv("BACKEND_API_KEY", "").strip()
BACKEND_API_KEYS = [
    key
    for key in dict.fromkeys(_split_csv(os.getenv("BACKEND_API_KEYS")) + ([BACKEND_API_KEY] if BACKEND_API_KEY else []))
    if key
]
MIN_ORDER_AMOUNT_IN_CENTS = int(os.getenv("MIN_ORDER_AMOUNT_IN_CENTS", "50000"))
MAX_ORDER_AMOUNT_IN_CENTS = int(os.getenv("MAX_ORDER_AMOUNT_IN_CENTS", "10000000000"))
RATE_LIMIT_WINDOW_SECONDS = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))
RATE_LIMIT_MAX_REQUESTS = int(os.getenv("RATE_LIMIT_MAX_REQUESTS", "50"))
RATE_LIMIT_CATALOG_WINDOW_SECONDS = _env_int("RATE_LIMIT_CATALOG_WINDOW_SECONDS", RATE_LIMIT_WINDOW_SECONDS)
RATE_LIMIT_CATALOG_MAX_REQUESTS = _env_int("RATE_LIMIT_CATALOG_MAX_REQUESTS", RATE_LIMIT_MAX_REQUESTS)
RATE_LIMIT_CHECKOUT_WINDOW_SECONDS = _env_int("RATE_LIMIT_CHECKOUT_WINDOW_SECONDS", RATE_LIMIT_WINDOW_SECONDS)
RATE_LIMIT_CHECKOUT_MAX_REQUESTS = _env_int("RATE_LIMIT_CHECKOUT_MAX_REQUESTS", RATE_LIMIT_MAX_REQUESTS)
RATE_LIMIT_DIRECT_PAYMENT_WINDOW_SECONDS = _env_int("RATE_LIMIT_DIRECT_PAYMENT_WINDOW_SECONDS", RATE_LIMIT_WINDOW_SECONDS)
RATE_LIMIT_DIRECT_PAYMENT_MAX_REQUESTS = _env_int("RATE_LIMIT_DIRECT_PAYMENT_MAX_REQUESTS", RATE_LIMIT_MAX_REQUESTS)
RATE_LIMIT_RESULT_WINDOW_SECONDS = _env_int("RATE_LIMIT_RESULT_WINDOW_SECONDS", RATE_LIMIT_WINDOW_SECONDS)
RATE_LIMIT_RESULT_MAX_REQUESTS = _env_int("RATE_LIMIT_RESULT_MAX_REQUESTS", RATE_LIMIT_MAX_REQUESTS)
RATE_LIMIT_WEBHOOK_WINDOW_SECONDS = _env_int("RATE_LIMIT_WEBHOOK_WINDOW_SECONDS", RATE_LIMIT_WINDOW_SECONDS)
RATE_LIMIT_WEBHOOK_MAX_REQUESTS = _env_int("RATE_LIMIT_WEBHOOK_MAX_REQUESTS", RATE_LIMIT_MAX_REQUESTS)
IDEMPOTENCY_WINDOW_SECONDS = _env_int("IDEMPOTENCY_WINDOW_SECONDS", 900, 30)
IDEMPOTENCY_KEY_MIN_LENGTH = _env_int("IDEMPOTENCY_KEY_MIN_LENGTH", 16, 8)
IDEMPOTENCY_KEY_MAX_LENGTH = _env_int("IDEMPOTENCY_KEY_MAX_LENGTH", 128, IDEMPOTENCY_KEY_MIN_LENGTH)
MAX_IDEMPOTENCY_CACHE_ENTRIES = _env_int("MAX_IDEMPOTENCY_CACHE_ENTRIES", 5000, 100)
IDEMPOTENCY_ENFORCED_SCOPES = {
    value.strip().lower()
    for value in _split_csv(os.getenv("IDEMPOTENCY_ENFORCED_SCOPES", "checkout,direct-payment"))
    if value.strip()
}

SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USER or "no-reply@universomercantil.com")
FACTURACION_EMAIL_TO = os.getenv("FACTURACION_EMAIL_TO")
FACTURACION_EMAIL_CC = os.getenv("FACTURACION_EMAIL_CC", "")
COMPANY_NAME = os.getenv("COMPANY_NAME", "Universo Mercantil")
EMAIL_LOGO_URL = (os.getenv("EMAIL_LOGO_URL") or "").strip()
SUPPORT_EMAIL = (os.getenv("SUPPORT_EMAIL") or SMTP_FROM or "").strip()
AGREED_SHIPPING_ZONE = "Envío a convenir con el cliente"
AGREED_SHIPPING_MESSAGE = "Nos contactaremos contigo para convenir el envío según tus necesidades específicas."

SIIGO_API_BASE_URL = (os.getenv("SIIGO_API_BASE_URL") or "https://api.siigo.com").rstrip("/")
SIIGO_PRODUCTS_PATH = (os.getenv("SIIGO_PRODUCTS_PATH") or "/v1/products").strip()
SIIGO_USERNAME = (os.getenv("SIIGO_USERNAME") or os.getenv("SIIGO_API_USER") or "").strip()
SIIGO_ACCESS_KEY = (os.getenv("SIIGO_ACCESS_KEY") or "").strip()
SIIGO_PARTNER_ID = (os.getenv("SIIGO_PARTNER_ID") or "").strip()
SIIGO_REQUEST_TIMEOUT_SECONDS = float(os.getenv("SIIGO_REQUEST_TIMEOUT_SECONDS", "20"))
SIIGO_TOKEN_SAFETY_SECONDS = int(os.getenv("SIIGO_TOKEN_SAFETY_SECONDS", "60"))
SIIGO_MAX_PAGES = max(1, int(os.getenv("SIIGO_MAX_PAGES", "200")))
SIIGO_CATALOG_CACHE_TTL_SECONDS = max(0, int(os.getenv("SIIGO_CATALOG_CACHE_TTL_SECONDS", "300")))
SIIGO_FETCH_ALL_DEFAULT = (os.getenv("SIIGO_FETCH_ALL_DEFAULT", "true") or "true").strip().lower() in {
    "1", "true", "yes", "y", "on"
}
SIIGO_HIDE_ITEMS_WITHOUT_IMAGE_DEFAULT = (
    os.getenv("SIIGO_HIDE_ITEMS_WITHOUT_IMAGE_DEFAULT", "true") or "true"
).strip().lower() in {
    "1", "true", "yes", "y", "on"
}
SIIGO_SYNC_INVENTORY_ON_APPROVED = (
    os.getenv("SIIGO_SYNC_INVENTORY_ON_APPROVED", "true") or "true"
).strip().lower() in {"1", "true", "yes", "y", "on"}
_siigo_inventory_update_path_default = (SIIGO_PRODUCTS_PATH or "/v1/products").rstrip("/")
SIIGO_INVENTORY_UPDATE_PATH_TEMPLATE = (
    os.getenv("SIIGO_INVENTORY_UPDATE_PATH_TEMPLATE")
    or f"{_siigo_inventory_update_path_default}/{{product_id}}"
).strip()
SIIGO_INVENTORY_UPDATE_METHOD = (os.getenv("SIIGO_INVENTORY_UPDATE_METHOD", "PATCH") or "PATCH").strip().upper()
if SIIGO_INVENTORY_UPDATE_METHOD not in {"PATCH", "PUT"}:
    SIIGO_INVENTORY_UPDATE_METHOD = "PATCH"
_siigo_manifest_path_raw = (os.getenv("SIIGO_IMAGE_MANIFEST_PATH") or "../frontend/scripts/siigo_imagenes.json").strip()
SIIGO_IMAGE_MANIFEST_PATH = Path(_siigo_manifest_path_raw).expanduser()
if not SIIGO_IMAGE_MANIFEST_PATH.is_absolute():
    SIIGO_IMAGE_MANIFEST_PATH = (BACKEND_DIR / SIIGO_IMAGE_MANIFEST_PATH).resolve()

STORE_PATH = Path(__file__).resolve().parent / "orders_store.json"
_request_window: dict[str, list[float]] = {}
_siigo_token_cache: dict[str, float | str] = {"token": "", "expires_at": 0.0}
_siigo_image_index_cache: dict[str, object] = {
    "path": "",
    "mtime": -1.0,
    "index": None,
}
_siigo_catalog_cache: dict[tuple[int, int, bool, int], dict[str, object]] = {}
_idempotency_cache: dict[str, dict[str, object]] = {}
IDEMPOTENCY_KEY_PATTERN = re.compile(r"^[A-Za-z0-9._:-]+$")

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


def parse_bool(value, default=False) -> bool:
    if value is None:
        return default

    if isinstance(value, bool):
        return value

    raw = str(value).strip().lower()
    if raw in {"1", "true", "yes", "y", "on"}:
        return True
    if raw in {"0", "false", "no", "n", "off"}:
        return False

    return default


def parse_float(value, default=None) -> float | None:
    if value is None or isinstance(value, bool):
        return default

    if isinstance(value, (int, float)):
        return float(value)

    if isinstance(value, str):
        cleaned = re.sub(r"[^\d,.-]", "", value.strip())
        if not cleaned:
            return default

        if "," in cleaned and "." in cleaned:
            if cleaned.rfind(",") > cleaned.rfind("."):
                cleaned = cleaned.replace(".", "").replace(",", ".")
            else:
                cleaned = cleaned.replace(",", "")
        elif "," in cleaned:
            cleaned = cleaned.replace(",", ".")

        try:
            return float(cleaned)
        except ValueError:
            return default

    return default


def generate_reference() -> str:
    return f"orden_{int(time.time())}_{uuid.uuid4().hex[:8]}"


def validate_email(value: str) -> bool:
    return bool(EMAIL_RE.match((value or "").strip()))


def format_currency(amount: int | float, currency: str = "COP") -> str:
    return f"{amount:,.0f} {currency}".replace(",", ".")


def escape_html(value) -> str:
    return html.escape(str(value or ""), quote=True)


def normalize_public_url(raw_value: str) -> str:
    value = (raw_value or "").strip()
    if not value:
        return ""

    if value.startswith(("http://", "https://")):
        return value

    if value.startswith("//"):
        return f"https:{value}"

    if value.startswith("/"):
        return f"{FRONTEND_BASE_URL}{value}"

    return f"{FRONTEND_BASE_URL}/{value}"


def compact_address(shipping: dict) -> str:
    if not shipping:
        return "N/A"

    parts = [
        shipping.get("direccion"),
        shipping.get("detalle_direccion"),
        shipping.get("ciudad"),
        shipping.get("departamento"),
    ]
    cleaned = [str(part).strip() for part in parts if str(part or "").strip()]
    return ", ".join(cleaned) if cleaned else "N/A"


def request_rate_limited(scope: str) -> bool:
    scope_limits = {
        "catalog-siigo": (RATE_LIMIT_CATALOG_WINDOW_SECONDS, RATE_LIMIT_CATALOG_MAX_REQUESTS),
        "checkout": (RATE_LIMIT_CHECKOUT_WINDOW_SECONDS, RATE_LIMIT_CHECKOUT_MAX_REQUESTS),
        "direct-payment": (RATE_LIMIT_DIRECT_PAYMENT_WINDOW_SECONDS, RATE_LIMIT_DIRECT_PAYMENT_MAX_REQUESTS),
        "checkout-resultado": (RATE_LIMIT_RESULT_WINDOW_SECONDS, RATE_LIMIT_RESULT_MAX_REQUESTS),
        "webhook": (RATE_LIMIT_WEBHOOK_WINDOW_SECONDS, RATE_LIMIT_WEBHOOK_MAX_REQUESTS),
    }
    window_seconds, max_requests = scope_limits.get(scope, (RATE_LIMIT_WINDOW_SECONDS, RATE_LIMIT_MAX_REQUESTS))

    now = time.time()
    remote_addr = request.headers.get("X-Forwarded-For", request.remote_addr or "unknown").split(",")[0].strip()
    key = f"{scope}:{remote_addr}"
    window = _request_window.get(key, [])
    window = [entry for entry in window if (now - entry) < window_seconds]

    if len(window) >= max_requests:
        _request_window[key] = window
        return True

    window.append(now)
    _request_window[key] = window
    return False


def is_allowed_origin() -> bool:
    if not ALLOWED_ORIGINS:
        return True

    origin = _normalize_origin(request.headers.get("Origin") or "")
    if origin and origin in ALLOWED_ORIGINS:
        return True

    referer = (request.headers.get("Referer") or "").strip()
    referer_origin = ""
    if referer:
        parsed_referer = urlparse(referer)
        referer_origin = _normalize_origin(f"{parsed_referer.scheme}://{parsed_referer.netloc}")

    return bool(referer_origin and referer_origin in ALLOWED_ORIGINS)


def verify_api_key() -> bool:
    if not BACKEND_API_KEYS:
        return True

    provided = (request.headers.get("X-Api-Key") or "").strip()
    if not provided:
        return False

    return any(hmac.compare_digest(provided, valid_key) for valid_key in BACKEND_API_KEYS)


def _idempotency_remote_addr() -> str:
    return request.headers.get("X-Forwarded-For", request.remote_addr or "unknown").split(",")[0].strip() or "unknown"


def _cleanup_idempotency_cache(now_ts: float) -> None:
    expired_keys = [
        cache_key
        for cache_key, payload in _idempotency_cache.items()
        if float(payload.get("expires_at") or 0.0) <= now_ts
    ]
    for cache_key in expired_keys:
        _idempotency_cache.pop(cache_key, None)

    overflow = len(_idempotency_cache) - MAX_IDEMPOTENCY_CACHE_ENTRIES
    if overflow <= 0:
        return

    sorted_keys = sorted(
        _idempotency_cache.items(),
        key=lambda item: float(item[1].get("expires_at") or 0.0),
    )
    for cache_key, _ in sorted_keys[:overflow]:
        _idempotency_cache.pop(cache_key, None)


def enforce_idempotency(scope: str) -> tuple[dict | None, tuple | object | None]:
    normalized_scope = str(scope or "").strip().lower()
    if normalized_scope not in IDEMPOTENCY_ENFORCED_SCOPES:
        return None, None

    key = (request.headers.get("X-Idempotency-Key") or request.headers.get("Idempotency-Key") or "").strip()
    if not key:
        return None, make_error("Falta cabecera X-Idempotency-Key", 400)

    if not (IDEMPOTENCY_KEY_MIN_LENGTH <= len(key) <= IDEMPOTENCY_KEY_MAX_LENGTH):
        return None, make_error("Idempotency-Key inválida", 400)

    if not IDEMPOTENCY_KEY_PATTERN.match(key):
        return None, make_error("Idempotency-Key inválida", 400)

    request_hash = hashlib.sha256(request.get_data(cache=True) or b"").hexdigest()
    now_ts = time.time()
    _cleanup_idempotency_cache(now_ts)
    cache_key = f"{normalized_scope}:{_idempotency_remote_addr()}:{key}"

    cached = _idempotency_cache.get(cache_key)
    if isinstance(cached, dict) and float(cached.get("expires_at") or 0.0) > now_ts:
        if str(cached.get("request_hash") or "") != request_hash:
            return None, make_error("La llave de idempotencia ya fue usada con otro payload", 409)

        cached_status = parse_int(cached.get("status_code"), 0)
        cached_response = cached.get("response")
        if cached_status > 0 and isinstance(cached_response, dict):
            replay_response = jsonify(cached_response)
            replay_response.status_code = cached_status
            replay_response.headers["X-Idempotency-Replayed"] = "true"
            return None, replay_response

        return None, make_error("Solicitud duplicada en proceso. Intenta nuevamente en unos segundos.", 409)

    return {
        "cache_key": cache_key,
        "request_hash": request_hash,
    }, None


def store_idempotency_response(context: dict | None, response_payload: dict, status_code: int) -> None:
    if not isinstance(context, dict):
        return

    cache_key = str(context.get("cache_key") or "").strip()
    request_hash = str(context.get("request_hash") or "").strip()
    if not cache_key or not request_hash:
        return

    _idempotency_cache[cache_key] = {
        "expires_at": time.time() + IDEMPOTENCY_WINDOW_SECONDS,
        "request_hash": request_hash,
        "status_code": int(status_code),
        "response": response_payload if isinstance(response_payload, dict) else {},
    }


def siigo_is_configured() -> bool:
    return bool(SIIGO_USERNAME and SIIGO_ACCESS_KEY)


def siigo_build_url(path: str) -> str:
    raw_path = (path or "").strip()
    if raw_path.startswith(("http://", "https://")):
        return raw_path

    if not raw_path.startswith("/"):
        raw_path = f"/{raw_path}" if raw_path else "/"

    return f"{SIIGO_API_BASE_URL}{raw_path}"


def siigo_extract_token(payload: dict) -> tuple[str, int]:
    data = payload.get("data") if isinstance(payload.get("data"), dict) else payload
    token = str((data or {}).get("access_token") or (data or {}).get("token") or "").strip()
    expires_in = parse_int((data or {}).get("expires_in") or (data or {}).get("expires") or 3600, 3600)

    if expires_in <= 0:
        expires_in = 3600

    return token, expires_in


def siigo_fetch_token(*, force_refresh: bool = False) -> str:
    now = time.time()
    cached_token = str(_siigo_token_cache.get("token") or "").strip()
    cached_expiry = float(_siigo_token_cache.get("expires_at") or 0)

    if cached_token and not force_refresh and now < cached_expiry:
        return cached_token

    if not siigo_is_configured():
        raise RuntimeError("siigo_not_configured")

    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    if SIIGO_PARTNER_ID:
        headers["Partner-Id"] = SIIGO_PARTNER_ID

    payload = {
        "username": SIIGO_USERNAME,
        "access_key": SIIGO_ACCESS_KEY,
    }

    try:
        response = requests.post(
            siigo_build_url("/auth"),
            json=payload,
            headers=headers,
            timeout=SIIGO_REQUEST_TIMEOUT_SECONDS,
        )
    except requests.RequestException as exc:
        logger.error("Error de red autenticando con Siigo: %s", exc)
        raise RuntimeError("siigo_auth_request_failed") from exc

    try:
        response_payload = response.json() if response.text else {}
    except ValueError:
        response_payload = {}

    if response.status_code >= 400:
        logger.error("Error autenticando con Siigo (status=%s): %s", response.status_code, response_payload)
        raise RuntimeError("siigo_auth_failed")

    token, expires_in = siigo_extract_token(response_payload)
    if not token:
        logger.error("Siigo no devolvio token de acceso. Payload: %s", response_payload)
        raise RuntimeError("siigo_auth_failed")

    refresh_after = max(60, expires_in - SIIGO_TOKEN_SAFETY_SECONDS)
    _siigo_token_cache["token"] = token
    _siigo_token_cache["expires_at"] = now + refresh_after
    return token


def siigo_extract_items(payload) -> list[dict]:
    if isinstance(payload, list):
        return [entry for entry in payload if isinstance(entry, dict)]

    if not isinstance(payload, dict):
        return []

    for key in ("results", "items", "data", "products"):
        value = payload.get(key)
        if isinstance(value, list):
            return [entry for entry in value if isinstance(entry, dict)]
        if isinstance(value, dict):
            nested = siigo_extract_items(value)
            if nested or key in {"results", "items", "products"}:
                return nested

    for value in payload.values():
        if isinstance(value, list) and value and all(isinstance(entry, dict) for entry in value):
            return value

    return []


def siigo_find_first_number(node, keys: set[str]) -> float | None:
    if isinstance(node, dict):
        for key, value in node.items():
            if key.lower() in keys:
                number = parse_float(value, None)
                if number is not None:
                    return number

        for value in node.values():
            nested = siigo_find_first_number(value, keys)
            if nested is not None:
                return nested

    if isinstance(node, list):
        for item in node:
            nested = siigo_find_first_number(item, keys)
            if nested is not None:
                return nested

    return None


def siigo_extract_price(product: dict) -> int | None:
    direct_price = siigo_find_first_number(
        {
            "price": product.get("price"),
            "unit_price": product.get("unit_price"),
            "sale_price": product.get("sale_price"),
            "selling_price": product.get("selling_price"),
        },
        {"price", "unit_price", "sale_price", "selling_price"},
    )

    if direct_price is not None:
        return max(0, int(round(direct_price)))

    prices_source = {
        "prices": product.get("prices"),
        "price_list": product.get("price_list"),
        "price_lists": product.get("price_lists"),
        "price_data": product.get("price_data"),
    }
    nested_price = siigo_find_first_number(prices_source, {"price", "value", "amount", "unit_price"})
    if nested_price is None:
        return None

    return max(0, int(round(nested_price)))


def siigo_extract_stock(product: dict) -> int:
    direct_stock = siigo_find_first_number(
        {
            "available_quantity": product.get("available_quantity"),
            "quantity_available": product.get("quantity_available"),
            "stock": product.get("stock"),
            "quantity": product.get("quantity"),
            "balance": product.get("balance"),
        },
        {"available_quantity", "quantity_available", "stock", "quantity", "balance"},
    )

    if direct_stock is not None:
        return max(0, int(round(direct_stock)))

    nested_stock = siigo_find_first_number(
        {
            "inventory": product.get("inventory"),
            "inventories": product.get("inventories"),
            "stock_control": product.get("stock_control"),
            "warehouses": product.get("warehouses"),
        },
        {"available_quantity", "quantity_available", "stock", "quantity", "balance"},
    )
    if nested_stock is None:
        return 0

    return max(0, int(round(nested_stock)))


SIIGO_CATEGORY_KEY_TERMS = {
    "categor",
    "group",
    "grupo",
    "famil",
    "line",
    "linea",
    "clasif",
    "segment",
}


def siigo_is_category_key(key: str) -> bool:
    normalized = str(key or "").strip().lower()
    return bool(normalized) and any(term in normalized for term in SIIGO_CATEGORY_KEY_TERMS)


def siigo_extract_text_values(node, depth: int = 0) -> list[str]:
    if depth > 4:
        return []

    values: list[str] = []

    def push_text(raw_value) -> None:
        text = re.sub(r"\s+", " ", str(raw_value or "")).strip()
        if not text:
            return
        lowered = text.lower()
        if lowered in {"none", "null", "true", "false"}:
            return
        if not re.search(r"[a-záéíóúüñ]", lowered):
            return
        values.append(text)

    if isinstance(node, str):
        push_text(node)
        return values

    if isinstance(node, (int, float, bool)):
        return values

    if isinstance(node, list):
        for item in node:
            values.extend(siigo_extract_text_values(item, depth + 1))
        return values

    if isinstance(node, dict):
        preferred_keys = ("name", "nombre", "label", "value", "text", "title", "description", "descripcion")
        for key in preferred_keys:
            if key in node:
                values.extend(siigo_extract_text_values(node.get(key), depth + 1))

        if not values:
            for key, value in node.items():
                if str(key).lower() in {"id", "code", "codigo", "uuid"}:
                    continue
                values.extend(siigo_extract_text_values(value, depth + 1))

    return values


def siigo_extract_categories(product: dict) -> list[str]:
    if not isinstance(product, dict):
        return []

    categories: list[str] = []
    seen: set[str] = set()

    def push_category(raw_value) -> None:
        for text in siigo_extract_text_values(raw_value):
            normalized = re.sub(r"\s+", " ", text).strip()
            if not normalized:
                continue
            key = normalized.lower()
            if key in seen:
                continue
            seen.add(key)
            categories.append(normalized)

    direct_keys = (
        "category",
        "categories",
        "product_category",
        "product_categories",
        "category_name",
        "group",
        "groups",
        "grupo",
        "grupos",
        "family",
        "familia",
        "line",
        "linea",
        "classification",
        "clasificacion",
    )

    for key in direct_keys:
        if key in product:
            push_category(product.get(key))

    container_keys = ("metadata", "meta", "custom_fields", "custom_data", "additional_fields", "attributes", "fields")
    for container_key in container_keys:
        container = product.get(container_key)
        if isinstance(container, dict):
            for key, value in container.items():
                if siigo_is_category_key(key):
                    push_category(value)
        elif isinstance(container, list):
            for entry in container:
                if not isinstance(entry, dict):
                    continue

                key_hint = (
                    entry.get("name")
                    or entry.get("key")
                    or entry.get("label")
                    or entry.get("field")
                    or ""
                )
                if siigo_is_category_key(str(key_hint)):
                    push_category(entry.get("value") or entry.get("values") or entry)

    def scan_category_keys(node, depth: int = 0) -> None:
        if depth > 3:
            return

        if isinstance(node, dict):
            for key, value in node.items():
                if siigo_is_category_key(key):
                    push_category(value)

                if isinstance(value, (dict, list)):
                    scan_category_keys(value, depth + 1)

        elif isinstance(node, list):
            for entry in node[:20]:
                scan_category_keys(entry, depth + 1)

    scan_category_keys(product)
    return categories


def siigo_normalize_sku_key(value: object) -> str:
    return str(value or "").strip().upper()


def siigo_compact_sku_key(value: object) -> str:
    return re.sub(r"[^A-Z0-9]", "", siigo_normalize_sku_key(value))


def siigo_manifest_value_has_image(value) -> bool:
    if isinstance(value, str):
        return bool(value.strip())

    if isinstance(value, list):
        return any(siigo_manifest_value_has_image(entry) for entry in value)

    if isinstance(value, dict):
        priority_keys = ("imagen", "image", "src", "url", "imagenes", "images")
        for key in priority_keys:
            if key in value and siigo_manifest_value_has_image(value.get(key)):
                return True
        return any(siigo_manifest_value_has_image(entry) for entry in value.values())

    return False


def siigo_empty_image_index() -> dict[str, object]:
    return {
        "has_entries": False,
        "by_sku": set(),
        "by_compact_sku": set(),
    }


def siigo_build_image_index(payload) -> dict[str, object]:
    image_index = siigo_empty_image_index()
    by_sku: set[str] = set()
    by_compact_sku: set[str] = set()

    if not isinstance(payload, dict):
        image_index["by_sku"] = by_sku
        image_index["by_compact_sku"] = by_compact_sku
        return image_index

    for sku_raw, value in payload.items():
        sku = siigo_normalize_sku_key(sku_raw)
        if not sku or not siigo_manifest_value_has_image(value):
            continue

        by_sku.add(sku)
        compact = siigo_compact_sku_key(sku)
        if compact:
            by_compact_sku.add(compact)

    image_index["has_entries"] = bool(by_sku)
    image_index["by_sku"] = by_sku
    image_index["by_compact_sku"] = by_compact_sku
    return image_index


def siigo_get_image_index() -> dict[str, object]:
    manifest_path = SIIGO_IMAGE_MANIFEST_PATH
    default_index = siigo_empty_image_index()

    if not manifest_path.exists():
        return default_index

    try:
        stat = manifest_path.stat()
    except OSError:
        return default_index

    cache_path = str(_siigo_image_index_cache.get("path") or "")
    cache_mtime = float(_siigo_image_index_cache.get("mtime") or -1.0)
    cache_index = _siigo_image_index_cache.get("index")

    if cache_path == str(manifest_path) and cache_mtime == stat.st_mtime and isinstance(cache_index, dict):
        return cache_index

    try:
        payload = json.loads(manifest_path.read_text(encoding="utf-8"))
    except Exception as exc:  # noqa: BLE001
        logger.warning("No se pudo cargar manifest de imágenes Siigo (%s): %s", manifest_path, exc)
        _siigo_image_index_cache["path"] = str(manifest_path)
        _siigo_image_index_cache["mtime"] = stat.st_mtime
        _siigo_image_index_cache["index"] = default_index
        return default_index

    image_index = siigo_build_image_index(payload)
    _siigo_image_index_cache["path"] = str(manifest_path)
    _siigo_image_index_cache["mtime"] = stat.st_mtime
    _siigo_image_index_cache["index"] = image_index
    return image_index


def siigo_item_has_direct_image(item: dict) -> bool:
    return bool(str(item.get("imagen") or "").strip())


def siigo_item_has_image(item: dict, image_index: dict[str, object] | None = None) -> bool:
    if siigo_item_has_direct_image(item):
        return True

    if not isinstance(image_index, dict):
        return False

    sku = siigo_normalize_sku_key(item.get("sku") or item.get("id"))
    if not sku:
        return False

    by_sku = image_index.get("by_sku")
    if isinstance(by_sku, set) and sku in by_sku:
        return True

    by_compact_sku = image_index.get("by_compact_sku")
    compact = siigo_compact_sku_key(sku)
    return bool(compact and isinstance(by_compact_sku, set) and compact in by_compact_sku)


def siigo_normalize_product(product: dict) -> dict | None:
    if not isinstance(product, dict):
        return None

    sku = str(
        product.get("code")
        or product.get("reference")
        or product.get("sku")
        or product.get("internal_code")
        or product.get("id")
        or ""
    ).strip()
    nombre = str(product.get("name") or product.get("description") or "").strip()

    if not sku and not nombre:
        return None

    fallback_id = re.sub(r"[^a-zA-Z0-9]+", "-", (sku or nombre).lower()).strip("-") or "siigo-item"
    categorias = siigo_extract_categories(product)
    categoria = categorias[0] if categorias else ""

    return {
        "id": str(product.get("id") or fallback_id),
        "sku": sku,
        "nombre": nombre or sku or "Producto Siigo",
        "precio": siigo_extract_price(product),
        "cantidad": siigo_extract_stock(product),
        "categoria": categoria,
        "categorias": categorias,
        "imagen": "",
    }


def siigo_matches_query(item: dict, query: str) -> bool:
    normalized_query = (query or "").strip().lower()
    if not normalized_query:
        return True

    haystack = f"{item.get('nombre', '')} {item.get('sku', '')} {item.get('categoria', '')}".lower()
    terms = [term for term in normalized_query.split() if term]
    return all(term in haystack for term in terms)


def siigo_extract_pagination(payload: dict, fallback_page: int, fallback_page_size: int, items_count: int) -> dict:
    pagination = payload.get("pagination") if isinstance(payload.get("pagination"), dict) else {}

    page = parse_int(
        pagination.get("page", payload.get("page", payload.get("current_page", fallback_page))),
        fallback_page,
    )
    if page < 1:
        page = fallback_page

    effective_page_size = parse_int(
        pagination.get("page_size", payload.get("page_size", payload.get("per_page", fallback_page_size))),
        fallback_page_size,
    )
    if effective_page_size < 1:
        effective_page_size = fallback_page_size

    total_results = parse_int(
        pagination.get("total_results", payload.get("total_results", payload.get("total", payload.get("count", -1)))),
        -1,
    )

    total_pages = parse_int(
        pagination.get("total_pages", payload.get("total_pages", payload.get("pages", -1))),
        -1,
    )
    if total_pages < 0 and total_results >= 0 and effective_page_size > 0:
        total_pages = max(1, math.ceil(total_results / effective_page_size))

    next_page = parse_int(
        pagination.get("next_page", payload.get("next_page", pagination.get("next", payload.get("next", -1)))),
        -1,
    )

    raw_has_next = pagination.get("has_next", payload.get("has_next"))
    has_next = raw_has_next if isinstance(raw_has_next, bool) else None

    if has_next is None:
        if next_page > page:
            has_next = True
        elif total_pages >= 0:
            has_next = page < total_pages
        elif total_results >= 0 and effective_page_size > 0:
            has_next = (page * effective_page_size) < total_results
        else:
            has_next = items_count >= effective_page_size

    return {
        "page": page,
        "page_size": effective_page_size,
        "total_results": total_results,
        "total_pages": total_pages,
        "next_page": next_page,
        "has_next": bool(has_next),
    }


def siigo_deduplicate_items(items: list[dict]) -> list[dict]:
    unique = []
    seen: set[tuple[str, str, str]] = set()

    for item in items:
        if not isinstance(item, dict):
            continue

        key = (
            str(item.get("id") or "").strip().lower(),
            str(item.get("sku") or "").strip().lower(),
            str(item.get("nombre") or "").strip().lower(),
        )
        if key in seen:
            continue

        seen.add(key)
        unique.append(item)

    return unique


def siigo_fetch_catalog_page(page: int, page_size: int) -> tuple[list[dict], dict]:
    token = siigo_fetch_token()

    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
    }
    if SIIGO_PARTNER_ID:
        headers["Partner-Id"] = SIIGO_PARTNER_ID

    params = {
        "page": max(1, page),
        "page_size": max(1, min(page_size, 200)),
    }
    url = siigo_build_url(SIIGO_PRODUCTS_PATH or "/v1/products")

    response = None
    response_payload = {}

    for attempt in range(2):
        try:
            response = requests.get(url, headers=headers, params=params, timeout=SIIGO_REQUEST_TIMEOUT_SECONDS)
        except requests.RequestException as exc:
            logger.error("Error de red consultando catálogo de Siigo: %s", exc)
            raise RuntimeError("siigo_products_request_failed") from exc

        try:
            response_payload = response.json() if response.text else {}
        except ValueError:
            response_payload = {}

        if response.status_code in {401, 403} and attempt == 0:
            token = siigo_fetch_token(force_refresh=True)
            headers["Authorization"] = f"Bearer {token}"
            continue

        break

    if not response or response.status_code >= 400:
        status = response.status_code if response else "sin_respuesta"
        logger.error("Error consultando catálogo Siigo (status=%s): %s", status, response_payload)
        raise RuntimeError("siigo_products_request_failed")

    raw_items = siigo_extract_items(response_payload)
    normalized_items = []
    for raw_item in raw_items:
        mapped = siigo_normalize_product(raw_item)
        if mapped:
            normalized_items.append(mapped)

    return normalized_items, response_payload


def siigo_fetch_catalog(page: int, page_size: int, *, fetch_all: bool = False, max_pages: int | None = None) -> tuple[list[dict], dict]:
    start_page = max(1, parse_int(page, 1))
    safe_page_size = max(1, min(parse_int(page_size, 50), 200))
    safe_max_pages = max(1, parse_int(max_pages, SIIGO_MAX_PAGES))

    if not fetch_all:
        return siigo_fetch_catalog_page(start_page, safe_page_size)

    aggregated_items = []
    last_payload = {}
    visited_pages: set[int] = set()
    current_page = start_page

    while len(visited_pages) < safe_max_pages:
        if current_page in visited_pages:
            logger.warning("Se detectó bucle en paginación de Siigo (página %s)", current_page)
            break

        visited_pages.add(current_page)
        page_items, payload = siigo_fetch_catalog_page(current_page, safe_page_size)
        aggregated_items.extend(page_items)
        last_payload = payload if isinstance(payload, dict) else {}

        page_info = siigo_extract_pagination(last_payload, current_page, safe_page_size, len(page_items))
        if not page_info["has_next"]:
            break

        next_page = page_info["next_page"]
        current_page = next_page if next_page > page_info["page"] else (page_info["page"] + 1)

    if len(visited_pages) >= safe_max_pages:
        logger.warning("Se alcanzó el límite máximo de páginas al consultar Siigo (%s)", safe_max_pages)

    deduplicated = siigo_deduplicate_items(aggregated_items)
    page_info = siigo_extract_pagination(last_payload, current_page, safe_page_size, 0)
    total_results = page_info["total_results"]

    synthetic_payload = dict(last_payload)
    synthetic_payload["pagination"] = {
        "page": start_page,
        "page_size": safe_page_size,
        "total_results": total_results if total_results >= 0 else len(deduplicated),
        "fetched_pages": len(visited_pages),
        "fetch_all": True,
    }

    return deduplicated, synthetic_payload


def siigo_fetch_catalog_cached(
    page: int,
    page_size: int,
    *,
    fetch_all: bool = False,
    max_pages: int | None = None,
) -> tuple[list[dict], dict, bool]:
    safe_page = max(1, parse_int(page, 1))
    safe_page_size = max(1, min(parse_int(page_size, 50), 200))
    safe_max_pages = max(1, min(parse_int(max_pages, SIIGO_MAX_PAGES), SIIGO_MAX_PAGES))
    cache_key = (safe_page, safe_page_size, bool(fetch_all), safe_max_pages)

    if SIIGO_CATALOG_CACHE_TTL_SECONDS > 0:
        now_ts = time.time()
        cached = _siigo_catalog_cache.get(cache_key)
        if isinstance(cached, dict):
            expires_at = float(cached.get("expires_at") or 0.0)
            if expires_at > now_ts:
                cached_items = cached.get("items")
                cached_payload = cached.get("payload")
                if isinstance(cached_items, list) and isinstance(cached_payload, dict):
                    return list(cached_items), dict(cached_payload), True

    items, payload = siigo_fetch_catalog(
        safe_page,
        safe_page_size,
        fetch_all=bool(fetch_all),
        max_pages=safe_max_pages,
    )

    if SIIGO_CATALOG_CACHE_TTL_SECONDS > 0:
        _siigo_catalog_cache[cache_key] = {
            "expires_at": time.time() + SIIGO_CATALOG_CACHE_TTL_SECONDS,
            "items": list(items),
            "payload": dict(payload) if isinstance(payload, dict) else {},
        }

    return items, payload, False


def siigo_clear_catalog_cache() -> None:
    _siigo_catalog_cache.clear()


def siigo_build_inventory_update_path(product_id: str) -> str:
    product_id_raw = str(product_id or "").strip()
    encoded_id = quote(product_id_raw, safe="")
    template = (SIIGO_INVENTORY_UPDATE_PATH_TEMPLATE or "").strip()

    if not template:
        base_path = (SIIGO_PRODUCTS_PATH or "/v1/products").rstrip("/")
        return f"{base_path}/{encoded_id}"

    if "{product_id}" in template:
        return template.format(product_id=encoded_id, raw_product_id=product_id_raw)

    return f"{template.rstrip('/')}/{encoded_id}"


def siigo_request_json(method: str, path: str, *, json_payload: dict | None = None) -> tuple[int, dict]:
    method_name = (method or "GET").strip().upper() or "GET"
    token = siigo_fetch_token()

    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
    }
    if json_payload is not None:
        headers["Content-Type"] = "application/json"
    if SIIGO_PARTNER_ID:
        headers["Partner-Id"] = SIIGO_PARTNER_ID

    response = None
    response_payload = {}
    for attempt in range(2):
        try:
            response = requests.request(
                method_name,
                siigo_build_url(path),
                headers=headers,
                json=json_payload,
                timeout=SIIGO_REQUEST_TIMEOUT_SECONDS,
            )
        except requests.RequestException as exc:
            logger.error("Error de red en Siigo (%s %s): %s", method_name, path, exc)
            raise RuntimeError("siigo_request_failed") from exc

        try:
            response_payload = response.json() if response.text else {}
        except ValueError:
            response_payload = {}

        if response.status_code in {401, 403} and attempt == 0:
            token = siigo_fetch_token(force_refresh=True)
            headers["Authorization"] = f"Bearer {token}"
            continue

        break

    status_code = response.status_code if response is not None else 502
    return status_code, response_payload if isinstance(response_payload, dict) else {}


def siigo_extract_product_payload(payload: dict) -> dict | None:
    if not isinstance(payload, dict):
        return None

    data = payload.get("data")
    if isinstance(data, dict):
        return data
    if isinstance(data, list):
        for entry in data:
            if isinstance(entry, dict):
                return entry

    for key in ("product", "item", "result"):
        value = payload.get(key)
        if isinstance(value, dict):
            return value

    # Some Siigo endpoints return the product object at the root level.
    if any(key in payload for key in ("id", "code", "name", "available_quantity", "warehouses")):
        return payload

    return None


def siigo_fetch_product_by_id(product_id: str) -> tuple[dict | None, str | None]:
    product_id_raw = str(product_id or "").strip()
    if not product_id_raw:
        return None, "missing_product_id"

    base_path = (SIIGO_PRODUCTS_PATH or "/v1/products").rstrip("/")
    path = f"{base_path}/{quote(product_id_raw, safe='')}"

    try:
        status_code, payload = siigo_request_json("GET", path)
    except RuntimeError as exc:
        return None, str(exc)

    if status_code >= 400:
        logger.error("Error consultando producto Siigo %s (status=%s): %s", product_id_raw, status_code, payload)
        return None, f"status_{status_code}"

    product = siigo_extract_product_payload(payload)
    if not isinstance(product, dict):
        return None, "product_payload_invalid"

    return product, None


def siigo_update_product_stock(product_id: str, new_stock: int) -> tuple[bool, str]:
    product_id_raw = str(product_id or "").strip()
    if not product_id_raw:
        return False, "missing_product_id"

    path = siigo_build_inventory_update_path(product_id_raw)
    target_stock = max(0, parse_int(new_stock, 0))

    payload_options = [
        {"available_quantity": target_stock},
        {"quantity_available": target_stock},
        {"stock": target_stock},
        {"quantity": target_stock},
        {"inventory": {"available_quantity": target_stock}},
        {"stock_control": {"stock": target_stock}},
    ]

    method_candidates: list[str] = []
    for candidate in [SIIGO_INVENTORY_UPDATE_METHOD, "PATCH", "PUT"]:
        normalized = (candidate or "").strip().upper()
        if normalized and normalized not in method_candidates:
            method_candidates.append(normalized)

    last_error = "siigo_inventory_update_failed"
    for method_name in method_candidates:
        for payload in payload_options:
            try:
                status_code, response_payload = siigo_request_json(method_name, path, json_payload=payload)
            except RuntimeError as exc:
                last_error = str(exc)
                continue

            if status_code < 400:
                return True, ""

            if status_code == 404:
                return False, "product_not_found"

            last_error = f"status_{status_code}"
            logger.warning(
                "No se pudo actualizar inventario en Siigo (producto=%s, método=%s, status=%s): %s",
                product_id_raw,
                method_name,
                status_code,
                response_payload,
            )

    return False, last_error


def siigo_sync_inventory_for_order(reference: str, order: dict) -> dict:
    result = {
        "ok": False,
        "reference": reference,
        "updated_items": 0,
        "skipped_items": 0,
        "failed_items": 0,
        "details": [],
        "synced_at": now_iso(),
    }

    if not SIIGO_SYNC_INVENTORY_ON_APPROVED:
        result["ok"] = True
        result["skipped"] = True
        result["reason"] = "inventory_sync_disabled"
        return result

    if not siigo_is_configured():
        result["reason"] = "siigo_not_configured"
        return result

    raw_items = order.get("items") if isinstance(order, dict) else []
    if not isinstance(raw_items, list) or not raw_items:
        result["ok"] = True
        result["skipped"] = True
        result["reason"] = "order_without_items"
        return result

    details: list[dict] = []
    for item in raw_items:
        if not isinstance(item, dict):
            continue

        quantity = max(0, parse_int(item.get("cantidad"), 0))
        if quantity <= 0:
            result["skipped_items"] += 1
            continue

        product_id = str(item.get("id") or "").strip()
        sku = str(item.get("sku") or "").strip()
        product_label = str(item.get("nombre") or sku or product_id or "Producto").strip()

        if not product_id:
            result["failed_items"] += 1
            details.append({
                "product": product_label,
                "sku": sku,
                "quantity": quantity,
                "status": "failed",
                "reason": "missing_product_id",
            })
            continue

        current_product, fetch_error = siigo_fetch_product_by_id(product_id)
        if fetch_error or not current_product:
            result["failed_items"] += 1
            details.append({
                "product": product_label,
                "product_id": product_id,
                "sku": sku,
                "quantity": quantity,
                "status": "failed",
                "reason": fetch_error or "product_fetch_failed",
            })
            continue

        current_stock = siigo_extract_stock(current_product)
        target_stock = max(0, current_stock - quantity)

        if target_stock == current_stock:
            result["skipped_items"] += 1
            details.append({
                "product": product_label,
                "product_id": product_id,
                "sku": sku,
                "quantity": quantity,
                "status": "skipped",
                "reason": "stock_unchanged",
                "stock_before": current_stock,
                "stock_after": target_stock,
            })
            continue

        updated, update_error = siigo_update_product_stock(product_id, target_stock)
        if not updated:
            result["failed_items"] += 1
            details.append({
                "product": product_label,
                "product_id": product_id,
                "sku": sku,
                "quantity": quantity,
                "status": "failed",
                "reason": update_error or "stock_update_failed",
                "stock_before": current_stock,
                "stock_after": target_stock,
            })
            continue

        result["updated_items"] += 1
        details.append({
            "product": product_label,
            "product_id": product_id,
            "sku": sku,
            "quantity": quantity,
            "status": "updated",
            "stock_before": current_stock,
            "stock_after": target_stock,
        })

    result["details"] = details[:50]
    result["ok"] = result["failed_items"] == 0

    if result["updated_items"] > 0:
        siigo_clear_catalog_cache()
        result["cache_invalidated"] = True

    if not result["ok"] and "reason" not in result:
        result["reason"] = "inventory_sync_partial_failure"

    return result


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
        return None, "Payload inválido"

    customer_email = (data.get("customer_email") or "").strip()
    if not validate_email(customer_email):
        return None, "Email inválido"

    raw_items = data.get("items") or []
    if not isinstance(raw_items, list) or not raw_items:
        return None, "El pedido debe incluir al menos un producto"

    normalized_items = []
    items_total = 0
    for item in raw_items:
        if not isinstance(item, dict):
            return None, "Formato de item inválido"

        quantity = parse_int(item.get("cantidad"), 0)
        price = parse_int(item.get("precio"), -1)
        if quantity < 1 or price < 0:
            return None, "Cantidad o precio inválido"

        subtotal = quantity * price
        items_total += subtotal
        image_value = (item.get("imagen") or item.get("imagen_url") or "").strip()
        product_url_value = (item.get("product_url") or item.get("url") or "").strip()

        normalized_items.append({
            "id": item.get("id"),
            "sku": item.get("sku"),
            "nombre": item.get("nombre") or "Producto",
            "variante_id": item.get("variante_id"),
            "variante_nombre": item.get("variante_nombre"),
            "cantidad": quantity,
            "precio": price,
            "subtotal": subtotal,
            "imagen": image_value,
            "product_url": product_url_value,
        })

    shipping_cost = 0
    delivery_type = (data.get("delivery_type") or "shipping").lower()
    if delivery_type not in {"shipping", "pickup"}:
        return None, "Tipo de entrega inválido"

    payment_method = ("direct" if is_direct_payment else (data.get("payment_method") or "wompi")).lower()
    if payment_method not in {"wompi", "direct"}:
        return None, "Método de pago inválido"

    subtotal = items_total
    amount_in_cents = (subtotal + shipping_cost) * 100
    if amount_in_cents < MIN_ORDER_AMOUNT_IN_CENTS:
        return None, "El valor total del pedido no alcanza el mínimo permitido"
    if amount_in_cents > MAX_ORDER_AMOUNT_IN_CENTS:
        return None, "El valor total del pedido excede el máximo permitido"

    shipping_address = data.get("shipping_address") if isinstance(data.get("shipping_address"), dict) else {}
    shipping_zone = "Recoger en tienda" if delivery_type == "pickup" else AGREED_SHIPPING_ZONE
    shipping_message = ""
    if delivery_type == "shipping":
        shipping_message = (data.get("shipping_message") or AGREED_SHIPPING_MESSAGE).strip() or AGREED_SHIPPING_MESSAGE
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
        "shipping_zone": shipping_zone,
        "shipping_message": shipping_message,
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
        subtitle = "Tu pago fue validado correctamente y tu pedido está en proceso."
    elif sync_status == "error":
        tone = "error"
        title = "No se pudo confirmar el pago"
        subtitle = "Hubo un problema procesando la confirmación. Intenta nuevamente o contáctanos."
    elif sync_status == "ignored" and "DECLINED" in reason:
        tone = "error"
        title = "Pago rechazado"
        subtitle = "La pasarela reportó que el pago fue rechazado. Puedes intentarlo de nuevo con otro método."
    elif sync_status == "ignored":
        tone = "warning"
        title = "Pago en revisión"
        subtitle = "Aún no tenemos una aprobación final del pago."

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
        logger.error("Error consultando transacción %s: %s", transaction_id, exc)
        return {}

    if resp.status_code >= 400:
        logger.error("Error Wompi transacción %s: %s", transaction_id, payload)
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

    inventory_sync = {
        "ok": bool(order.get("inventory_synced")),
        "status": "already_synced" if order.get("inventory_synced") else "pending",
        "reference": matched_reference,
    }

    if not order.get("inventory_synced"):
        inventory_sync = siigo_sync_inventory_for_order(matched_reference, order)
        sync_ok = bool(inventory_sync.get("ok"))

        upsert_order(matched_reference, {
            "inventory_synced": sync_ok,
            "inventory_synced_at": now_iso() if sync_ok else None,
            "inventory_sync_error": None if sync_ok else (inventory_sync.get("reason") or "inventory_sync_failed"),
            "inventory_sync_report": inventory_sync,
            "status": "approved_inventory_synced" if sync_ok else "approved_inventory_pending_sync",
        })

        if not sync_ok:
            logger.warning("No se pudo sincronizar inventario Siigo para %s: %s", matched_reference, inventory_sync)

    if order.get("email_notified"):
        return {"status": "ok", "message": "already_notified", "inventory_sync": inventory_sync}, 200

    sent, detail = enviar_correos_compra_aprobada(order, tx)

    upsert_order(matched_reference, {
        "email_notified": bool(sent),
        "email_notified_at": now_iso() if sent else None,
        "email_error": None if sent else detail,
        "status": "approved_notified" if sent else "approved_pending_notification",
    })

    if not sent:
        logger.error("Error correo facturación (%s): %s", matched_reference, detail)
        return {"status": "error", "message": "email_not_sent", "inventory_sync": inventory_sync}, 500

    return {"status": "ok", "message": "email_sent", "inventory_sync": inventory_sync}, 200


def build_order_email_context(order: dict, transaction: dict) -> dict:
    reference = order.get("reference", "sin_referencia")
    amount_in_cents = int(order.get("amount_in_cents") or (transaction or {}).get("amount_in_cents") or 0)
    total_amount = int(round(amount_in_cents / 100))
    currency = order.get("currency", (transaction or {}).get("currency") or "COP")
    payment_method = (order.get("payment_method") or (transaction or {}).get("payment_method_type") or "N/A").upper()
    delivery_type = (order.get("delivery_type") or "shipping").lower()
    shipping_cost = int(order.get("shipping_cost") or 0)
    if delivery_type != "pickup":
        shipping_cost = 0
    subtotal = int(order.get("subtotal") or max(total_amount - shipping_cost, 0))
    shipping_zone = order.get("shipping_zone") or ("Recoger en tienda" if delivery_type == "pickup" else AGREED_SHIPPING_ZONE)
    shipping_message = ""
    if delivery_type == "shipping":
        shipping_message = (order.get("shipping_message") or AGREED_SHIPPING_MESSAGE).strip() or AGREED_SHIPPING_MESSAGE

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

    buyer_full_name = " ".join(
        part for part in [buyer.get("nombre"), buyer.get("apellidos")] if str(part or "").strip()
    ).strip() or "Cliente"
    buyer_email = (buyer.get("email") or order.get("customer_email") or (transaction or {}).get("customer_email") or "").strip()

    shipping = order.get("shipping_address") or ((transaction or {}).get("shipping_address") or {})
    raw_items = order.get("items") or []

    items = []
    for index, item in enumerate(raw_items, start=1):
        if not isinstance(item, dict):
            continue

        quantity = max(1, parse_int(item.get("cantidad"), 1))
        price = max(0, parse_int(item.get("precio"), 0))
        item_subtotal = max(0, parse_int(item.get("subtotal"), quantity * price))
        product_id = str(item.get("id") or "").strip()
        product_link_raw = (item.get("product_url") or "").strip()
        if not product_link_raw and product_id:
            product_link_raw = f"/detalles.html?id={product_id}"

        items.append({
            "line": index,
            "id": product_id,
            "nombre": (item.get("nombre") or "Producto").strip(),
            "variante_nombre": (item.get("variante_nombre") or "").strip(),
            "cantidad": quantity,
            "precio": price,
            "subtotal": item_subtotal,
            "imagen_url": normalize_public_url(item.get("imagen") or item.get("imagen_url") or ""),
            "product_url": normalize_public_url(product_link_raw),
        })

    tx_id = (transaction or {}).get("id") or "N/A"
    tx_status = ((transaction or {}).get("status") or (order.get("status") or "N/A")).upper()

    return {
        "reference": reference,
        "currency": currency,
        "payment_method": payment_method,
        "delivery_type": delivery_type,
        "shipping_cost": shipping_cost,
        "shipping_zone": shipping_zone,
        "shipping_message": shipping_message,
        "subtotal": subtotal,
        "total": total_amount,
        "buyer": buyer,
        "buyer_full_name": buyer_full_name,
        "buyer_email": buyer_email,
        "shipping": shipping,
        "shipping_summary": compact_address(shipping),
        "pickup_message": order.get("pickup_message") or "Tu pedido estará disponible para entrega en tienda en 5 horas hábiles.",
        "items": items,
        "tx_id": tx_id,
        "tx_status": tx_status,
    }


def build_html_kv_table(rows: list[tuple[str, str]]) -> str:
    table_rows = []
    for label, value in rows:
        table_rows.append(
            "<tr>"
            f"<td style='padding:8px 10px;border:1px solid #e7edf4;background:#f7fafc;color:#3b4b5d;font-size:13px;font-weight:600;width:38%;'>{escape_html(label)}</td>"
            f"<td style='padding:8px 10px;border:1px solid #e7edf4;color:#152333;font-size:13px;'>{escape_html(value)}</td>"
            "</tr>"
        )

    return (
        "<table role='presentation' cellpadding='0' cellspacing='0' width='100%' "
        "style='border-collapse:collapse;border:1px solid #e7edf4;border-radius:10px;overflow:hidden;'>"
        + "".join(table_rows)
        + "</table>"
    )


def build_items_html(items: list[dict], currency: str, *, include_product_links: bool) -> str:
    if not items:
        return "<p style='margin:0;color:#5d6b7a;font-size:13px;'>No se recibió detalle de productos para este pedido.</p>"

    rows = []
    for item in items:
        image_html = (
            f"<img src='{escape_html(item.get('imagen_url'))}' alt='{escape_html(item.get('nombre'))}' "
            "style='display:block;width:72px;height:72px;object-fit:cover;border-radius:10px;border:1px solid #e7edf4;'>"
            if item.get("imagen_url")
            else "<div style='width:72px;height:72px;line-height:72px;text-align:center;border-radius:10px;border:1px dashed #ced8e3;color:#6d7c8b;font-size:12px;'>Sin imagen</div>"
        )

        variant_html = (
            f"<div style='margin-top:4px;color:#607285;font-size:12px;'>Variante: {escape_html(item.get('variante_nombre'))}</div>"
            if item.get("variante_nombre")
            else ""
        )

        link_html = ""
        if include_product_links and item.get("product_url"):
            link_html = (
                f"<div style='margin-top:6px;'><a href='{escape_html(item.get('product_url'))}' "
                "style='color:#0b4d93;text-decoration:none;font-size:12px;font-weight:600;'>Ver producto</a></div>"
            )

        rows.append(
            "<tr>"
            f"<td style='padding:10px;border-bottom:1px solid #edf2f7;width:86px;vertical-align:top;'>{image_html}</td>"
            "<td style='padding:10px;border-bottom:1px solid #edf2f7;vertical-align:top;'>"
            f"<div style='font-size:14px;font-weight:700;color:#1a2b3d;'>{escape_html(item.get('nombre'))}</div>"
            f"{variant_html}{link_html}"
            "</td>"
            f"<td style='padding:10px;border-bottom:1px solid #edf2f7;color:#3b4b5d;font-size:13px;text-align:center;vertical-align:top;width:54px;'>{item.get('cantidad')}</td>"
            f"<td style='padding:10px;border-bottom:1px solid #edf2f7;color:#3b4b5d;font-size:13px;text-align:right;vertical-align:top;width:100px;'>{escape_html(format_currency(item.get('precio', 0), currency))}</td>"
            f"<td style='padding:10px;border-bottom:1px solid #edf2f7;color:#1a2b3d;font-size:13px;text-align:right;font-weight:700;vertical-align:top;width:116px;'>{escape_html(format_currency(item.get('subtotal', 0), currency))}</td>"
            "</tr>"
        )

    return (
        "<table role='presentation' cellpadding='0' cellspacing='0' width='100%' style='border-collapse:collapse;'>"
        "<thead>"
        "<tr>"
        "<th style='padding:10px;color:#5b6d80;text-align:left;font-size:11px;text-transform:uppercase;'>Imagen</th>"
        "<th style='padding:10px;color:#5b6d80;text-align:left;font-size:11px;text-transform:uppercase;'>Producto</th>"
        "<th style='padding:10px;color:#5b6d80;text-align:center;font-size:11px;text-transform:uppercase;'>Cant.</th>"
        "<th style='padding:10px;color:#5b6d80;text-align:right;font-size:11px;text-transform:uppercase;'>Precio</th>"
        "<th style='padding:10px;color:#5b6d80;text-align:right;font-size:11px;text-transform:uppercase;'>Subtotal</th>"
        "</tr>"
        "</thead>"
        "<tbody>"
        + "".join(rows)
        + "</tbody></table>"
    )


def wrap_email_html(title: str, subtitle: str, content_html: str) -> str:
    logo_url = normalize_public_url(EMAIL_LOGO_URL) or normalize_public_url("assets/logo.png")
    logo_html = ""
    if logo_url:
        logo_html = (
            f"<img src='{escape_html(logo_url)}' alt='{escape_html(COMPANY_NAME)}' "
            "style='height:40px;max-width:180px;object-fit:contain;display:block;margin:0 auto 14px auto;'>"
        )

    footer_support = f"<strong>{escape_html(SUPPORT_EMAIL)}</strong>" if SUPPORT_EMAIL else "nuestro canal comercial"

    return f"""
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>{escape_html(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#142233;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:20px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="680" cellpadding="0" cellspacing="0" style="max-width:680px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e7edf4;">
          <tr>
            <td style="padding:22px 24px 10px 24px;background:linear-gradient(135deg,#0b4d93 0%,#1f6fbf 100%);text-align:center;">
              {logo_html}
              <h1 style="margin:0;color:#ffffff;font-size:22px;line-height:1.25;">{escape_html(title)}</h1>
              <p style="margin:8px 0 0 0;color:#d8e8fb;font-size:14px;line-height:1.45;">{escape_html(subtitle)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 24px 24px 24px;">
              {content_html}
            </td>
          </tr>
          <tr>
            <td style="padding:14px 24px 20px 24px;background:#f8fbff;color:#637489;font-size:12px;line-height:1.5;text-align:center;">
              Este correo fue generado automáticamente por {escape_html(COMPANY_NAME)}.<br>
              Si tienes preguntas, responde a este correo o escríbenos a {footer_support}.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
""".strip()


def build_internal_email_content(context: dict) -> tuple[str, str, str]:
    reference = context["reference"]
    currency = context["currency"]
    status = context["tx_status"]

    summary_rows = [
        ("Referencia", reference),
        ("Transacción Wompi", context["tx_id"]),
        ("Estado", status),
        ("Método de pago", context["payment_method"]),
        ("Tipo de entrega", "Recoger en tienda" if context["delivery_type"] == "pickup" else "Enviar a domicilio"),
        ("Modalidad de envío", context["shipping_zone"]),
        ("Condición del envío", "Sin costo (recoger en tienda)" if context["delivery_type"] == "pickup" else "A convenir con el cliente (no incluido en el pago online)"),
        ("Subtotal", format_currency(context["subtotal"], currency)),
        ("Total pagado", format_currency(context["total"], currency)),
    ]

    buyer = context["buyer"]
    buyer_rows = [
        ("Nombre", context["buyer_full_name"]),
        ("Documento", buyer.get("numero_documento") or "N/A"),
        ("Teléfono", buyer.get("telefono") or "N/A"),
        ("Email", context["buyer_email"] or "N/A"),
    ]

    if context["delivery_type"] == "pickup":
        delivery_rows = [
            ("Tipo", "Entrega en tienda"),
            ("Mensaje", context["pickup_message"]),
        ]
    else:
        shipping = context["shipping"]
        delivery_rows = [
            ("Tipo", "Envío a domicilio"),
            ("Condición", "El envío se coordina por llamada"),
            ("Mensaje", context["shipping_message"]),
            ("Dirección", context["shipping_summary"]),
            ("Departamento", shipping.get("departamento") or "N/A"),
            ("Ciudad", shipping.get("ciudad") or "N/A"),
        ]

    content_html = (
        "<h2 style='margin:0 0 10px 0;color:#0b4d93;font-size:17px;'>Resumen de pago</h2>"
        + build_html_kv_table(summary_rows)
        + "<h2 style='margin:18px 0 10px 0;color:#0b4d93;font-size:17px;'>Datos del comprador</h2>"
        + build_html_kv_table(buyer_rows)
        + "<h2 style='margin:18px 0 10px 0;color:#0b4d93;font-size:17px;'>Entrega</h2>"
        + build_html_kv_table(delivery_rows)
        + "<h2 style='margin:18px 0 10px 0;color:#0b4d93;font-size:17px;'>Productos comprados</h2>"
        + build_items_html(context["items"], currency, include_product_links=True)
    )

    html_body = wrap_email_html(
        title=f"Nueva compra aprobada - {reference}",
        subtitle=f"Estado del pago: {status}",
        content_html=content_html,
    )

    text_lines = [
        f"Nueva compra aprobada ({status}).",
        "",
        f"Referencia: {reference}",
        f"Transacción Wompi: {context['tx_id']}",
        f"Método de pago: {context['payment_method']}",
        f"Tipo de entrega: {'Recoger en tienda' if context['delivery_type'] == 'pickup' else 'Enviar a domicilio'}",
        f"Modalidad de envío: {context['shipping_zone']}",
        f"Condición del envío: {'Sin costo (recoger en tienda)' if context['delivery_type'] == 'pickup' else 'A convenir con el cliente (no incluido en el pago online)'}",
        f"Subtotal: {format_currency(context['subtotal'], currency)}",
        f"Total: {format_currency(context['total'], currency)}",
        "",
        "Datos del comprador:",
        f"- Nombre: {context['buyer_full_name']}",
        f"- Documento: {buyer.get('numero_documento') or 'N/A'}",
        f"- Teléfono: {buyer.get('telefono') or 'N/A'}",
        f"- Email: {context['buyer_email'] or 'N/A'}",
        "",
        "Productos:",
    ]

    if not context["items"]:
        text_lines.append("- Sin detalle de productos")
    else:
        for item in context["items"]:
            line = (
                f"- {item['nombre']} | Cantidad: {item['cantidad']} | "
                f"Precio: {format_currency(item['precio'], currency)} | "
                f"Subtotal: {format_currency(item['subtotal'], currency)}"
            )
            text_lines.append(line)
            if item.get("product_url"):
                text_lines.append(f"  URL: {item['product_url']}")

    subject = f"[Facturación] Compra aprobada {reference}"
    return subject, "\n".join(text_lines), html_body


def build_customer_email_content(context: dict) -> tuple[str, str, str]:
    reference = context["reference"]
    currency = context["currency"]
    first_name = (context["buyer"].get("nombre") or "Cliente").strip() or "Cliente"

    summary_rows = [
        ("Referencia de pedido", reference),
        ("Transacción", context["tx_id"]),
        ("Método de pago", context["payment_method"]),
        ("Modalidad de envío", context["shipping_zone"]),
        ("Condición del envío", "Sin costo (recoger en tienda)" if context["delivery_type"] == "pickup" else "A convenir con el cliente (no incluido en este pago)"),
        ("Subtotal", format_currency(context["subtotal"], currency)),
        ("Total pagado", format_currency(context["total"], currency)),
    ]

    if context["delivery_type"] == "pickup":
        delivery_rows = [
            ("Tipo de entrega", "Recoger en tienda"),
            ("Mensaje", context["pickup_message"]),
        ]
    else:
        delivery_rows = [
            ("Tipo de entrega", "Envío a domicilio"),
            ("Condición", "El envío se coordina por llamada"),
            ("Mensaje", context["shipping_message"]),
            ("Dirección", context["shipping_summary"]),
        ]

    content_html = (
        f"<p style='margin:0 0 14px 0;color:#1a2b3d;font-size:14px;line-height:1.6;'>Hola <strong>{escape_html(first_name)}</strong>, "
        "tu pago fue aprobado correctamente. Gracias por confiar en nosotros.</p>"
        + "<h2 style='margin:0 0 10px 0;color:#0b4d93;font-size:17px;'>Resumen de tu pedido</h2>"
        + build_html_kv_table(summary_rows)
        + "<h2 style='margin:18px 0 10px 0;color:#0b4d93;font-size:17px;'>Entrega</h2>"
        + build_html_kv_table(delivery_rows)
        + "<h2 style='margin:18px 0 10px 0;color:#0b4d93;font-size:17px;'>Productos comprados</h2>"
        + build_items_html(context["items"], currency, include_product_links=False)
    )

    html_body = wrap_email_html(
        title=f"Compra aprobada - Pedido {reference}",
        subtitle="Tu compra fue confirmada y ya está en proceso.",
        content_html=content_html,
    )

    text_lines = [
        f"Hola {first_name},",
        "",
        "Tu pago fue aprobado correctamente.",
        f"Referencia del pedido: {reference}",
        f"Transacción: {context['tx_id']}",
        f"Método de pago: {context['payment_method']}",
        f"Modalidad de envío: {context['shipping_zone']}",
        f"Condición del envío: {'Sin costo (recoger en tienda)' if context['delivery_type'] == 'pickup' else 'A convenir con el cliente (no incluido en este pago)'}",
        f"Subtotal: {format_currency(context['subtotal'], currency)}",
        f"Total pagado: {format_currency(context['total'], currency)}",
        "",
        "Productos:",
    ]

    if not context["items"]:
        text_lines.append("- Sin detalle de productos")
    else:
        for item in context["items"]:
            text_lines.append(
                f"- {item['nombre']} | Cantidad: {item['cantidad']} | "
                f"Precio: {format_currency(item['precio'], currency)} | "
                f"Subtotal: {format_currency(item['subtotal'], currency)}"
            )

    text_lines.extend([
        "",
        "Si tienes dudas, responde a este correo y te ayudamos.",
        f"{COMPANY_NAME}",
    ])

    subject = f"[{COMPANY_NAME}] Compra aprobada - Pedido {reference}"
    return subject, "\n".join(text_lines), html_body


def send_email_message(to_email: str, subject: str, text_body: str, html_body: str, cc_email: str = "") -> tuple[bool, str]:
    if not SMTP_HOST or not SMTP_USER or not SMTP_PASSWORD:
        return False, "Configura SMTP_HOST, SMTP_USER y SMTP_PASSWORD"

    destination = (to_email or "").strip()
    if not destination:
        return False, "Destinatario de correo vacio"

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = SMTP_FROM
    msg["To"] = destination
    if cc_email.strip():
        msg["Cc"] = cc_email
    if SUPPORT_EMAIL:
        msg["Reply-To"] = SUPPORT_EMAIL

    msg.set_content(text_body)
    msg.add_alternative(html_body, subtype="html")

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=30) as smtp:
            smtp.starttls()
            smtp.login(SMTP_USER, SMTP_PASSWORD)
            smtp.send_message(msg)
        return True, "Correo enviado"
    except Exception as exc:
        return False, str(exc)


def enviar_correos_compra_aprobada(order: dict, transaction: dict) -> tuple[bool, str]:
    if not FACTURACION_EMAIL_TO:
        return False, "FACTURACION_EMAIL_TO no esta configurado"

    context = build_order_email_context(order, transaction)

    customer_email = (context.get("buyer_email") or "").strip()
    if not validate_email(customer_email):
        return False, "No fue posible determinar un email válido para el cliente"

    internal_subject, internal_text, internal_html = build_internal_email_content(context)
    internal_sent, internal_detail = send_email_message(
        FACTURACION_EMAIL_TO,
        internal_subject,
        internal_text,
        internal_html,
        FACTURACION_EMAIL_CC,
    )
    if not internal_sent:
        return False, f"correo interno: {internal_detail}"

    customer_subject, customer_text, customer_html = build_customer_email_content(context)
    customer_sent, customer_detail = send_email_message(
        customer_email,
        customer_subject,
        customer_text,
        customer_html,
    )
    if not customer_sent:
        return False, f"correo cliente: {customer_detail}"

    return True, "Correos interno y cliente enviados"


def generar_firma(reference, amount_in_cents, currency, integrity_secret):
    cadena = f"{reference}{amount_in_cents}{currency}{integrity_secret or ''}"
    return hashlib.sha256(cadena.encode()).hexdigest()


@app.after_request
def add_security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    response.headers["X-Permitted-Cross-Domain-Policies"] = "none"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' https:"
    return response


@app.errorhandler(413)
def request_entity_too_large(_error):
    return make_error(f"Payload demasiado grande. Máximo permitido: {MAX_REQUEST_BODY_BYTES} bytes", 413)


@app.route("/health", methods=["GET"])
def healthcheck():
    return jsonify({
        "ok": True,
        "service": "universo-mercantil-backend",
        "storage_mode": explain_storage_mode(),
        "siigo_configured": siigo_is_configured(),
        "timestamp": now_iso(),
    }), 200


@app.route("/catalog/siigo", methods=["GET", "OPTIONS"])
def catalogo_siigo():
    if request.method == "OPTIONS":
        return ("", 200)

    if request_rate_limited("catalog-siigo"):
        return make_error("Demasiadas solicitudes. Intenta nuevamente en unos segundos.", 429)

    if not is_allowed_origin():
        return make_error("Origen no permitido", 403)

    if not verify_api_key():
        return make_error("Acceso no autorizado", 401)

    if not siigo_is_configured():
        return make_error("Integración de Siigo no configurada", 503)

    page = max(1, parse_int(request.args.get("page"), 1))
    page_size = max(1, min(parse_int(request.args.get("page_size"), 50), 200))
    fetch_all = parse_bool(request.args.get("fetch_all"), SIIGO_FETCH_ALL_DEFAULT)
    max_pages = max(1, min(parse_int(request.args.get("max_pages"), SIIGO_MAX_PAGES), SIIGO_MAX_PAGES))
    query = (request.args.get("q") or "").strip()
    hide_without_image = parse_bool(
        request.args.get("hide_without_image"),
        SIIGO_HIDE_ITEMS_WITHOUT_IMAGE_DEFAULT,
    )

    try:
        items, siigo_payload, cache_hit = siigo_fetch_catalog_cached(
            page,
            page_size,
            fetch_all=fetch_all,
            max_pages=max_pages,
        )
    except RuntimeError as exc:
        reason = str(exc)
        if reason in {"siigo_auth_failed", "siigo_auth_request_failed"}:
            return make_error("No fue posible autenticar con Siigo", 502)
        if reason == "siigo_not_configured":
            return make_error("Integración de Siigo no configurada", 503)
        return make_error("No fue posible consultar el catálogo de Siigo", 502)

    filtered_items = [item for item in items if siigo_matches_query(item, query)]
    items_before_image_filter = len(filtered_items)
    hidden_without_image_count = 0
    hide_without_image_applied = False
    image_manifest_available = False

    if hide_without_image:
        image_index = siigo_get_image_index()
        image_manifest_available = bool(image_index.get("has_entries"))
        has_direct_images = any(siigo_item_has_direct_image(item) for item in filtered_items)

        if image_manifest_available or has_direct_images:
            filtered_items = [item for item in filtered_items if siigo_item_has_image(item, image_index)]
            hidden_without_image_count = max(0, items_before_image_filter - len(filtered_items))
            hide_without_image_applied = True
        else:
            logger.info(
                "Filtro hide_without_image solicitado, pero no hay manifest de imágenes o rutas directas disponibles."
            )

    pagination_info = siigo_extract_pagination(siigo_payload or {}, page, page_size, len(items))
    total = pagination_info["total_results"] if pagination_info["total_results"] >= 0 else len(items)
    fetched_pages = parse_int(
        (siigo_payload or {}).get("pagination", {}).get("fetched_pages") if isinstance((siigo_payload or {}).get("pagination"), dict) else 1,
        1,
    )

    return jsonify({
        "ok": True,
        "source": "siigo",
        "query": query,
        "page": page,
        "page_size": page_size,
        "fetch_all": fetch_all,
        "fetched_pages": fetched_pages,
        "count": len(filtered_items),
        "hide_without_image": hide_without_image,
        "hide_without_image_applied": hide_without_image_applied,
        "image_manifest_available": image_manifest_available,
        "items_before_image_filter": items_before_image_filter,
        "hidden_without_image_count": hidden_without_image_count,
        "cache": {
            "enabled": SIIGO_CATALOG_CACHE_TTL_SECONDS > 0,
            "hit": cache_hit,
            "ttl_seconds": SIIGO_CATALOG_CACHE_TTL_SECONDS,
        },
        "total": total,
        "items": filtered_items,
        "synced_at": now_iso(),
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

    idempotency_context, idempotency_response = enforce_idempotency("checkout")
    if idempotency_response is not None:
        return idempotency_response

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
    shipping_message = normalized_payload["shipping_message"]
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
            "shipping_message": shipping_message,
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
        response_payload = {"checkout_url": link}
        store_idempotency_response(idempotency_context, response_payload, 201)
        return jsonify(response_payload), 201

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

    idempotency_context, idempotency_response = enforce_idempotency("direct-payment")
    if idempotency_response is not None:
        return idempotency_response

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
    shipping_message = normalized_payload["shipping_message"]

    upsert_order(reference, {
        "amount_in_cents": amount_in_cents,
        "currency": currency,
        "customer_email": customer_email,
        "name": normalized_payload["name"],
        "description": normalized_payload["description"],
        "subtotal": normalized_payload["subtotal"],
        "shipping_cost": shipping_cost,
        "shipping_zone": shipping_zone,
        "shipping_message": shipping_message,
        "delivery_type": delivery_type,
        "payment_method": payment_method,
        "pickup_message": normalized_payload["pickup_message"],
        "buyer": buyer,
        "shipping_address": shipping_address,
        "items": items,
        "status": "pending_payment",
        "email_notified": False,
    })

    response_payload = {
        "ok": True,
        "reference": reference,
        "status": "pending_payment"
    }
    store_idempotency_response(idempotency_context, response_payload, 201)
    return jsonify(response_payload), 201


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
        logger.warning("Intento de webhook con firma inválida")
        return make_error("Firma de webhook inválida", 401)

    evento = request.get_json(silent=True) or {}
    if not isinstance(evento, dict):
        return make_error("Payload inválido", 400)

    logger.info("Webhook recibido")

    tx_from_event = (evento.get("data") or {}).get("transaction") or {}
    tx_id = tx_from_event.get("id") or (evento.get("data") or {}).get("id")
    result, status_code = procesar_transaccion_confirmada(tx_id, source="webhook")
    return jsonify(result), status_code


if __name__ == "__main__":
    debug_mode = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    port = int(os.getenv("PORT", "8000"))
    app.run(host="0.0.0.0", port=port, debug=debug_mode)

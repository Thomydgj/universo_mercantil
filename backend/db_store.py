import json
import logging
import os
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

DATABASE_URL = (os.getenv("DATABASE_URL") or "").strip()
DB_ENABLED = bool(DATABASE_URL)

_engine = None


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _get_engine():
    global _engine
    if not DB_ENABLED:
        return None

    if _engine is None:
        try:
            from sqlalchemy import create_engine
        except Exception as exc:  # pragma: no cover - runtime guard
            raise RuntimeError(
                "DATABASE_URL esta configurado pero falta SQLAlchemy en el entorno."
            ) from exc

        _engine = create_engine(DATABASE_URL, future=True, pool_pre_ping=True)

    return _engine


def init_database() -> None:
    if not DB_ENABLED:
        return

    from sqlalchemy import text

    engine = _get_engine()
    with engine.begin() as conn:
        conn.execute(text(
            """
            CREATE TABLE IF NOT EXISTS orders (
                reference TEXT PRIMARY KEY,
                amount_in_cents BIGINT,
                currency VARCHAR(8),
                customer_email TEXT,
                name TEXT,
                description TEXT,
                subtotal BIGINT,
                shipping_cost BIGINT,
                shipping_zone TEXT,
                delivery_type VARCHAR(32),
                payment_method VARCHAR(32),
                pickup_message TEXT,
                buyer_json TEXT,
                shipping_address_json TEXT,
                payment_link_id TEXT UNIQUE,
                payment_link_url TEXT,
                transaction_id TEXT,
                transaction_status TEXT,
                wompi_reference TEXT,
                last_sync_source VARCHAR(32),
                webhook_received_at TEXT,
                redirect_sync_at TEXT,
                status TEXT,
                email_notified BOOLEAN DEFAULT FALSE,
                email_notified_at TEXT,
                email_error TEXT,
                created_at TEXT,
                updated_at TEXT
            )
            """
        ))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_orders_payment_link_id ON orders (payment_link_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_orders_transaction_id ON orders (transaction_id)"))

        conn.execute(text(
            """
            CREATE TABLE IF NOT EXISTS order_items (
                reference TEXT NOT NULL,
                line_index INTEGER NOT NULL,
                item_id TEXT,
                sku TEXT,
                nombre TEXT,
                variante_id TEXT,
                variante_nombre TEXT,
                cantidad INTEGER,
                precio BIGINT,
                subtotal BIGINT,
                PRIMARY KEY (reference, line_index),
                FOREIGN KEY (reference) REFERENCES orders(reference) ON DELETE CASCADE
            )
            """
        ))

        conn.execute(text(
            """
            CREATE TABLE IF NOT EXISTS payment_events (
                id BIGSERIAL PRIMARY KEY,
                reference TEXT NOT NULL,
                source VARCHAR(32) NOT NULL,
                transaction_id TEXT,
                transaction_status TEXT,
                payload_json TEXT,
                created_at TEXT NOT NULL
            )
            """
        ))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_payment_events_reference ON payment_events (reference)"))


def _serialize_order(order: dict[str, Any]) -> dict[str, Any]:
    return {
        "reference": order.get("reference"),
        "amount_in_cents": int(order.get("amount_in_cents") or 0),
        "currency": order.get("currency") or "COP",
        "customer_email": order.get("customer_email") or "",
        "name": order.get("name") or "",
        "description": order.get("description") or "",
        "subtotal": int(order.get("subtotal") or 0),
        "shipping_cost": int(order.get("shipping_cost") or 0),
        "shipping_zone": order.get("shipping_zone") or "",
        "delivery_type": order.get("delivery_type") or "shipping",
        "payment_method": order.get("payment_method") or "wompi",
        "pickup_message": order.get("pickup_message") or "",
        "buyer_json": json.dumps(order.get("buyer") or {}, ensure_ascii=False),
        "shipping_address_json": json.dumps(order.get("shipping_address") or {}, ensure_ascii=False),
        "payment_link_id": order.get("payment_link_id"),
        "payment_link_url": order.get("payment_link_url"),
        "transaction_id": order.get("transaction_id"),
        "transaction_status": order.get("transaction_status"),
        "wompi_reference": order.get("wompi_reference"),
        "last_sync_source": order.get("last_sync_source"),
        "webhook_received_at": order.get("webhook_received_at"),
        "redirect_sync_at": order.get("redirect_sync_at"),
        "status": order.get("status"),
        "email_notified": bool(order.get("email_notified")),
        "email_notified_at": order.get("email_notified_at"),
        "email_error": order.get("email_error"),
        "created_at": order.get("created_at") or now_iso(),
        "updated_at": order.get("updated_at") or now_iso(),
    }


def db_upsert_order(reference: str, patch: dict[str, Any]) -> dict[str, Any]:
    if not DB_ENABLED:
        raise RuntimeError("db_upsert_order requiere DATABASE_URL")

    from sqlalchemy import text

    current = db_get_order(reference) or {"reference": reference, "created_at": now_iso()}
    current.update(patch)
    current["reference"] = reference
    current["updated_at"] = now_iso()

    payload = _serialize_order(current)

    upsert_sql = text(
        """
        INSERT INTO orders (
            reference, amount_in_cents, currency, customer_email, name, description,
            subtotal, shipping_cost, shipping_zone, delivery_type, payment_method, pickup_message,
            buyer_json, shipping_address_json, payment_link_id, payment_link_url,
            transaction_id, transaction_status, wompi_reference, last_sync_source,
            webhook_received_at, redirect_sync_at, status,
            email_notified, email_notified_at, email_error, created_at, updated_at
        ) VALUES (
            :reference, :amount_in_cents, :currency, :customer_email, :name, :description,
            :subtotal, :shipping_cost, :shipping_zone, :delivery_type, :payment_method, :pickup_message,
            :buyer_json, :shipping_address_json, :payment_link_id, :payment_link_url,
            :transaction_id, :transaction_status, :wompi_reference, :last_sync_source,
            :webhook_received_at, :redirect_sync_at, :status,
            :email_notified, :email_notified_at, :email_error, :created_at, :updated_at
        )
        ON CONFLICT (reference) DO UPDATE SET
            amount_in_cents = EXCLUDED.amount_in_cents,
            currency = EXCLUDED.currency,
            customer_email = EXCLUDED.customer_email,
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            subtotal = EXCLUDED.subtotal,
            shipping_cost = EXCLUDED.shipping_cost,
            shipping_zone = EXCLUDED.shipping_zone,
            delivery_type = EXCLUDED.delivery_type,
            payment_method = EXCLUDED.payment_method,
            pickup_message = EXCLUDED.pickup_message,
            buyer_json = EXCLUDED.buyer_json,
            shipping_address_json = EXCLUDED.shipping_address_json,
            payment_link_id = EXCLUDED.payment_link_id,
            payment_link_url = EXCLUDED.payment_link_url,
            transaction_id = EXCLUDED.transaction_id,
            transaction_status = EXCLUDED.transaction_status,
            wompi_reference = EXCLUDED.wompi_reference,
            last_sync_source = EXCLUDED.last_sync_source,
            webhook_received_at = EXCLUDED.webhook_received_at,
            redirect_sync_at = EXCLUDED.redirect_sync_at,
            status = EXCLUDED.status,
            email_notified = EXCLUDED.email_notified,
            email_notified_at = EXCLUDED.email_notified_at,
            email_error = EXCLUDED.email_error,
            updated_at = EXCLUDED.updated_at
        """
    )

    insert_item_sql = text(
        """
        INSERT INTO order_items (
            reference, line_index, item_id, sku, nombre, variante_id, variante_nombre, cantidad, precio, subtotal
        ) VALUES (
            :reference, :line_index, :item_id, :sku, :nombre, :variante_id, :variante_nombre, :cantidad, :precio, :subtotal
        )
        """
    )

    engine = _get_engine()
    with engine.begin() as conn:
        conn.execute(upsert_sql, payload)
        conn.execute(text("DELETE FROM order_items WHERE reference = :reference"), {"reference": reference})

        for index, item in enumerate(current.get("items") or [], start=1):
            conn.execute(insert_item_sql, {
                "reference": reference,
                "line_index": index,
                "item_id": item.get("id"),
                "sku": item.get("sku"),
                "nombre": item.get("nombre"),
                "variante_id": item.get("variante_id"),
                "variante_nombre": item.get("variante_nombre"),
                "cantidad": int(item.get("cantidad") or 0),
                "precio": int(item.get("precio") or 0),
                "subtotal": int(item.get("subtotal") or 0),
            })

    return current


def _parse_order_row(row: dict[str, Any], items: list[dict[str, Any]]) -> dict[str, Any]:
    order = dict(row)
    order["buyer"] = json.loads(order.pop("buyer_json") or "{}")
    order["shipping_address"] = json.loads(order.pop("shipping_address_json") or "{}")
    order["items"] = items
    return order


def db_get_order(reference: str) -> dict[str, Any] | None:
    if not DB_ENABLED:
        return None

    from sqlalchemy import text

    engine = _get_engine()
    with engine.begin() as conn:
        order_row = conn.execute(
            text("SELECT * FROM orders WHERE reference = :reference"),
            {"reference": reference}
        ).mappings().first()

        if not order_row:
            return None

        item_rows = conn.execute(
            text("SELECT * FROM order_items WHERE reference = :reference ORDER BY line_index ASC"),
            {"reference": reference}
        ).mappings().all()

    items = [
        {
            "id": item.get("item_id"),
            "sku": item.get("sku"),
            "nombre": item.get("nombre"),
            "variante_id": item.get("variante_id"),
            "variante_nombre": item.get("variante_nombre"),
            "cantidad": item.get("cantidad"),
            "precio": item.get("precio"),
            "subtotal": item.get("subtotal"),
        }
        for item in item_rows
    ]

    return _parse_order_row(dict(order_row), items)


def db_find_order_by_payment_link_id(payment_link_id: str) -> tuple[str, dict[str, Any]] | None:
    if not DB_ENABLED or not payment_link_id:
        return None

    from sqlalchemy import text

    engine = _get_engine()
    with engine.begin() as conn:
        row = conn.execute(
            text("SELECT reference FROM orders WHERE payment_link_id = :payment_link_id LIMIT 1"),
            {"payment_link_id": payment_link_id}
        ).mappings().first()

    if not row:
        return None

    reference = row.get("reference")
    order = db_get_order(reference)
    if not order:
        return None

    return reference, order


def db_record_payment_event(reference: str, source: str, transaction_id: str | None, transaction_status: str, payload: dict[str, Any]) -> None:
    if not DB_ENABLED:
        return

    from sqlalchemy import text

    engine = _get_engine()
    with engine.begin() as conn:
        conn.execute(text(
            """
            INSERT INTO payment_events (
                reference, source, transaction_id, transaction_status, payload_json, created_at
            ) VALUES (
                :reference, :source, :transaction_id, :transaction_status, :payload_json, :created_at
            )
            """
        ), {
            "reference": reference or "sin_referencia",
            "source": source,
            "transaction_id": transaction_id,
            "transaction_status": transaction_status,
            "payload_json": json.dumps(payload or {}, ensure_ascii=False),
            "created_at": now_iso(),
        })


def explain_storage_mode() -> str:
    return "postgres" if DB_ENABLED else "json"

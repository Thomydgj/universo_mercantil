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
);

CREATE INDEX IF NOT EXISTS idx_orders_payment_link_id ON orders (payment_link_id);
CREATE INDEX IF NOT EXISTS idx_orders_transaction_id ON orders (transaction_id);

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
);

CREATE TABLE IF NOT EXISTS payment_events (
    id BIGSERIAL PRIMARY KEY,
    reference TEXT NOT NULL,
    source VARCHAR(32) NOT NULL,
    transaction_id TEXT,
    transaction_status TEXT,
    payload_json TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payment_events_reference ON payment_events (reference);

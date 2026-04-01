import json
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

try:
    from .db_store import DB_ENABLED, db_upsert_order, init_database
except ImportError:
    from db_store import DB_ENABLED, db_upsert_order, init_database

STORE_PATH = Path(__file__).resolve().parent / "orders_store.json"


def main() -> None:
    if not DB_ENABLED:
        raise SystemExit("DATABASE_URL no esta configurado. Define la variable y vuelve a ejecutar.")

    if not STORE_PATH.exists():
        raise SystemExit(f"No existe {STORE_PATH}")

    init_database()

    with STORE_PATH.open("r", encoding="utf-8") as fh:
        data = json.load(fh)

    orders = (data or {}).get("orders") or {}
    if not isinstance(orders, dict):
        raise SystemExit("El formato de orders_store.json no es valido")

    migrated = 0
    for reference, order in orders.items():
        if not isinstance(order, dict):
            continue
        db_upsert_order(reference, order)
        migrated += 1

    print(f"Migracion completada. Ordenes migradas: {migrated}")


if __name__ == "__main__":
    main()

import requests

WOMPI_PRIVATE_KEY = "prv_test_tZYyDqsINxQmwWmuZkh0A7PwDcMWXOTD"  # ⚠️ copia la tuya desde el Dashboard

headers = {
    "Authorization": f"Bearer {WOMPI_PRIVATE_KEY}",
    "Content-Type": "application/json"
}

payload = {
    "amount_in_cents": 1000000,
    "currency": "COP",
    "reference": "orden_test_123",
    "customer_email": "cliente@ejemplo.com",
    "redirect_url": "https://70efe2b6afc2.ngrok-free.app/checkout/resultado",
    "name": "empaques de prueba",
    "description": "Compra de empaques de prueba",
    "collect_shipping": False,
    "single_use": True
}
r = requests.post("https://sandbox.wompi.co/v1/payment_links", json=payload, headers=headers)
print(r.status_code)
print(r.json())

import os, requests, hashlib, time, json
from flask import Flask, request, jsonify
from dotenv import load_dotenv
from flask_cors import CORS

app = Flask(__name__)
CORS(app) 


# Variables de entorno

load_dotenv()

WOMPI_PUBLIC_KEY = os.getenv("WOMPI_PUBLIC_KEY")
WOMPI_PRIVATE_KEY = os.getenv("WOMPI_PRIVATE_KEY")
WOMPI_INTEGRITY_SECRET = os.getenv("WOMPI_INTEGRITY_SECRET")
WOMPI_URL = os.getenv("WOMPI_URL", "https://sandbox.wompi.co/v1")
BASE_URL = os.getenv("NGROK_BASE_URL")

print("WOMPI_PUBLIC_KEY:", WOMPI_PUBLIC_KEY)
print("WOMPI_PRIVATE_KEY:", WOMPI_PRIVATE_KEY)
print("WOMPI_INTEGRITY_SECRET:", WOMPI_INTEGRITY_SECRET)
print("WOMPI_URL:", WOMPI_URL)
print("BASE_URL:", BASE_URL)


def generar_firma(reference, amount_in_cents, currency, integrity_secret):
    cadena = f"{reference}{amount_in_cents}{currency}{integrity_secret}"
    return hashlib.sha256(cadena.encode()).hexdigest()

@app.route("/checkout", methods=["POST"])
def checkout():
    data = request.get_json(force=True)

    

    # Mantener el flujo actual: construir payload reducido para Wompi
    reference = data.get("reference", f"orden_{int(time.time())}")
    amount_in_cents = data.get("amount_in_cents", 500000)
    currency = data.get("currency", "COP")
    customer_email = data.get("customer_email", "cliente@ejemplo.com")
    name = data.get("name", "Producto")
    description = data.get("description", "Detalle de la compra")

    signature = generar_firma(reference, amount_in_cents, currency, WOMPI_INTEGRITY_SECRET)

    payload = {
        "amount_in_cents": amount_in_cents,
        "currency": currency,
        "reference": reference,
        "customer_email": customer_email,
        "redirect_url": f"{BASE_URL}/checkout/resultado",
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

    response = requests.post(f"{WOMPI_URL}/payment_links", json=payload, headers=headers)
    data = response.json()

    link = data.get("data", {}).get("url")
    if link:
        return jsonify({"checkout_url": link}), 201

    return jsonify(data), response.status_code


@app.route("/checkout/resultado", methods=["GET"])
def resultado():
    params = request.args.to_dict()
    return jsonify({
        "message": "El usuario volvió del Checkout Web",
        "params": params
    }), 200

@app.route("/webhook", methods=["POST"])
def webhook():
    evento = request.get_json(silent=True) or {}
    print("WEBHOOK_EVENT:", evento)
    return jsonify({"status": "ok"}), 200

if __name__ == "__main__":
    app.run(port=5000, debug=True)

import requests

WOMPI_PRIVATE_KEY = "prv_test_tZYyDqsINxQmwWmuZkh0A7PwDcMWXOTD"  # tu llave privada sandbox
transaction_id = "12007940-1765223721-82248"  # el id que recibiste en redirect

headers = {
    "Authorization": f"Bearer {WOMPI_PRIVATE_KEY}",
    "Content-Type": "application/json"
}

r = requests.get(f"https://sandbox.wompi.co/v1/transactions/{transaction_id}", headers=headers)
print(r.status_code)
print(r.json())

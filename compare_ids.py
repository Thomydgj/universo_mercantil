import os
import json
import re

def parse_data():
    with open("frontend/scripts/categorias.js", "r", encoding="utf-8") as f:
        cat_text = f.read()
    with open("frontend/scripts/productos.js", "r", encoding="utf-8") as f:
        prod_text = f.read()

    categories = []
    # Match objects { id: "...", nombre: "..." }
    cat_matches = re.finditer(r'\{\s*id:\s*"([^"]+)",(?:[^}]*?)nombre:\s*"([^"]+)"', cat_text)
    for m in cat_matches:
        categories.append({"id": m.group(1), "nombre": m.group(2)})

    products = []
    prod_matches = re.finditer(r'\{\s*id:\s*"([^"]+)",(?:[^}]*?)nombre:\s*"([^"]+)"', prod_text)
    for m in prod_matches:
        products.append({"id": m.group(1), "nombre": m.group(2)})

    return categories, products

categories, products = parse_data()
cat_ids = {c["id"] for c in categories}
prod_ids = {p["id"] for p in products}
cat_names = {c["nombre"]: c["id"] for c in categories}
prod_names = {p["nombre"]: p["id"] for p in products}

# Normalized names for better matching
norm_names = {}
for n, i in cat_names.items():
    norm_names[n.lower().replace("á","a").replace("é","e").replace("í","i").replace("ó","o").replace("ú","u")] = i
for n, i in prod_names.items():
    norm_names[n.lower().replace("á","a").replace("é","e").replace("í","i").replace("ó","o").replace("ú","u")] = i

base_path = "frontend/assets/images/productos_nuevos"
folders = []
if os.path.exists(base_path):
    for root, dirs, files in os.walk(base_path):
        for d in dirs:
            rel_path = os.path.relpath(os.path.join(root, d), base_path).replace("\\", "/")
            folders.append(rel_path)

results = {"exact_matches": [], "mismatches": [], "mapping": {}}

for folder in folders:
    # Check if folder name or any part is an ID
    parts = folder.split("/")
    folder_name = parts[-1]
    
    if folder_name in cat_ids or folder_name in prod_ids:
        results["exact_matches"].append(folder)
    else:
        # Check by name
        norm_folder = folder_name.lower().replace("á","a").replace("é","e").replace("í","i").replace("ó","o").replace("ú","u")
        # Special case for "Reportería" typo in folder
        norm_folder = norm_folder.replace("reporteria", "reposteria")
        
        if norm_folder in norm_names:
            results["mapping"][folder] = norm_names[norm_folder]
        else:
            results["mismatches"].append(folder)

print(json.dumps(results, indent=2))

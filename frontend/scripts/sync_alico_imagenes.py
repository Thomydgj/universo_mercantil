#!/usr/bin/env python3
"""Sincroniza imagenes y descripciones por SKU desde alicoempaques.com.

Uso rapido:
  /ruta/python frontend/scripts/sync_alico_imagenes.py

Resultado:
  - Descarga imagenes en frontend/assets/images/siigo/alico/
    - Actualiza frontend/scripts/siigo_imagenes.json con {SKU: rutas}
    - Actualiza frontend/scripts/siigo_descripciones.json con {SKU: descripcion}
"""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import sys
from pathlib import Path
from typing import Dict, Iterable, Iterator
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

USER_AGENT = "Mozilla/5.0 (compatible; UniversoMercantilImageSync/1.0)"
DEFAULT_COLLECTION_ENDPOINT = "https://alicoempaques.com/collections/all/products.json"
DEFAULT_OUTPUT_DIR = Path("frontend/assets/images/siigo/alico")
DEFAULT_MANIFEST = Path("frontend/scripts/siigo_imagenes.json")
DEFAULT_DESCRIPTIONS_MANIFEST = Path("frontend/scripts/siigo_descripciones.json")
FRONTEND_DIRNAME = "frontend"

VALID_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Descarga imagenes por SKU desde Alico y actualiza manifest.")
    parser.add_argument("--endpoint", default=DEFAULT_COLLECTION_ENDPOINT, help="Endpoint products.json de Shopify")
    parser.add_argument("--limit", type=int, default=250, help="Tamano de pagina por request (max 250 en Shopify)")
    parser.add_argument("--timeout", type=int, default=30, help="Timeout HTTP en segundos")
    parser.add_argument("--output-dir", default=str(DEFAULT_OUTPUT_DIR), help="Directorio destino de imagenes")
    parser.add_argument("--manifest", default=str(DEFAULT_MANIFEST), help="Archivo JSON de mapeo SKU -> imagen")
    parser.add_argument(
        "--descriptions-manifest",
        default=str(DEFAULT_DESCRIPTIONS_MANIFEST),
        help="Archivo JSON de mapeo SKU -> descripcion",
    )
    parser.add_argument(
        "--replace-existing",
        action="store_true",
        help="Reemplaza archivos de imagen ya existentes en disco",
    )
    parser.add_argument(
        "--skip-download",
        action="store_true",
        help="No descarga archivos; guarda directamente URLs remotas en el manifest",
    )
    return parser.parse_args()


def request_json(url: str, timeout: int) -> dict:
    req = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(req, timeout=timeout) as response:
        return json.load(response)


def iter_products(endpoint: str, limit: int, timeout: int) -> Iterator[dict]:
    page = 1
    while True:
        page_url = f"{endpoint}?limit={limit}&page={page}"
        data = request_json(page_url, timeout=timeout)
        products = data.get("products") or []
        if not products:
            break

        for product in products:
            yield product

        page += 1


def normalize_sku(value: object) -> str:
    return str(value or "").strip().upper()


def clean_filename(text: str) -> str:
    sanitized = re.sub(r"[^A-Za-z0-9._-]+", "_", text)
    return sanitized.strip("._-") or "sin_sku"


def get_extension_from_url(url: str) -> str:
    path = urlparse(url).path
    if not path:
        return ".jpg"
    ext = Path(path).suffix.lower()
    return ext if ext in VALID_EXTENSIONS else ".jpg"


def pick_variant_image_url(product: dict, variant: dict) -> str:
    featured = variant.get("featured_image")
    if isinstance(featured, dict):
        src = str(featured.get("src") or "").strip()
        if src:
            return src

    variant_image_id = variant.get("image_id")
    if variant_image_id:
        for image in product.get("images") or []:
            if not isinstance(image, dict):
                continue
            if image.get("id") == variant_image_id:
                src = str(image.get("src") or "").strip()
                if src:
                    return src

    for image in product.get("images") or []:
        if not isinstance(image, dict):
            continue
        src = str(image.get("src") or "").strip()
        if src:
            return src

    return ""


def extract_product_image_urls(product: dict, variant: dict) -> list[str]:
    image_urls: list[str] = []
    featured = pick_variant_image_url(product, variant)
    if featured:
        image_urls.append(featured)

    for image in product.get("images") or []:
        if not isinstance(image, dict):
            continue
        src = str(image.get("src") or "").strip()
        if src:
            image_urls.append(src)

    # Mantener orden y remover duplicados.
    return list(dict.fromkeys(image_urls))


def normalize_description_text(value: object) -> str:
    raw = str(value or "")
    if not raw:
        return ""

    text = re.sub(r"(?is)<(script|style).*?>.*?</\1>", " ", raw)
    text = re.sub(r"(?i)</?(br|p|li|ul|ol|div|h[1-6])[^>]*>", "\n", text)
    text = re.sub(r"(?i)<[^>]+>", " ", text)
    text = html.unescape(text)
    text = text.replace("\xa0", " ")
    text = re.sub(r"[ \t\r\f\v]+", " ", text)
    text = re.sub(r"\s*\n\s*", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def extract_product_description(product: dict) -> str:
    if not isinstance(product, dict):
        return ""

    description = normalize_description_text(product.get("body_html") or product.get("description") or "")
    if description:
        return description

    title = str(product.get("title") or "").strip()
    product_type = str(product.get("product_type") or "").strip()
    if title and product_type:
        return f"{title}. Solucion de empaque tipo {product_type}."
    return title


def normalize_manifest_paths(value: object) -> list[str]:
    paths: list[str] = []

    def push(path_value: object) -> None:
        path_text = str(path_value or "").strip()
        if path_text:
            paths.append(path_text)

    if isinstance(value, str):
        push(value)
    elif isinstance(value, list):
        for item in value:
            push(item)
    elif isinstance(value, dict):
        push(value.get("imagen"))
        push(value.get("image"))

        maybe_images = value.get("imagenes") or value.get("images")
        if isinstance(maybe_images, list):
            for item in maybe_images:
                push(item)

    return list(dict.fromkeys(paths))


def load_manifest(path: Path) -> Dict[str, list[str]]:
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}
    if not isinstance(data, dict):
        return {}

    manifest: Dict[str, list[str]] = {}
    for key, value in data.items():
        key_text = str(key).strip()
        if not key_text:
            continue

        paths = normalize_manifest_paths(value)
        if not paths:
            continue

        manifest[key_text] = paths

    return manifest


def load_descriptions_manifest(path: Path) -> Dict[str, str]:
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}
    if not isinstance(data, dict):
        return {}

    manifest: Dict[str, str] = {}
    for key, value in data.items():
        key_text = str(key).strip()
        if not key_text:
            continue

        if isinstance(value, dict):
            description = normalize_description_text(value.get("descripcion") or value.get("description") or "")
        else:
            description = normalize_description_text(value)

        if description:
            manifest[key_text] = description

    return manifest


def save_manifest(path: Path, manifest: Dict[str, list[str]]) -> None:
    ordered = {key: manifest[key] for key in sorted(manifest)}

    serializable: Dict[str, object] = {}
    for key, paths in ordered.items():
        if len(paths) == 1:
            serializable[key] = paths[0]
        else:
            serializable[key] = paths

    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(serializable, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def save_descriptions_manifest(path: Path, manifest: Dict[str, str]) -> None:
    ordered = {key: manifest[key] for key in sorted(manifest)}
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(ordered, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def download_image(url: str, destination: Path, timeout: int, replace_existing: bool) -> bool:
    if destination.exists() and not replace_existing:
        return False

    req = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(req, timeout=timeout) as response:
        content = response.read()

    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(content)
    return True


def to_frontend_relative_path(path: Path) -> str:
    posix = path.as_posix()
    prefix = f"{FRONTEND_DIRNAME}/"
    if posix.startswith(prefix):
        return posix[len(prefix):]
    return posix


def build_filename_from_url(url: str) -> str:
    parsed = urlparse(url)
    path = parsed.path
    stem = Path(path).stem or "imagen"
    ext = get_extension_from_url(url)
    short_hash = hashlib.sha1(url.encode("utf-8")).hexdigest()[:10]
    return f"{clean_filename(stem)}-{short_hash}{ext}"


def iter_variant_records(products: Iterable[dict]) -> Iterator[tuple[str, list[str], str]]:
    for product in products:
        description = extract_product_description(product)
        variants = product.get("variants") or []
        for variant in variants:
            sku = normalize_sku(variant.get("sku"))
            if not sku:
                continue
            image_urls = extract_product_image_urls(product, variant)
            if not image_urls:
                continue
            yield sku, image_urls, description


def main() -> int:
    args = parse_args()

    endpoint = str(args.endpoint).strip()
    output_dir = Path(args.output_dir)
    manifest_path = Path(args.manifest)
    descriptions_manifest_path = Path(args.descriptions_manifest)

    if not endpoint:
        print("[ERROR] Endpoint vacio.", file=sys.stderr)
        return 1

    try:
        products = list(iter_products(endpoint, limit=args.limit, timeout=args.timeout))
    except (HTTPError, URLError, TimeoutError, ValueError) as exc:
        print(f"[ERROR] No se pudo consultar el endpoint: {exc}", file=sys.stderr)
        return 1

    records = list(iter_variant_records(products))
    if not records:
        print("[WARN] No se encontraron SKUs con imagen en la fuente.")
        return 0

    existing_manifest = load_manifest(manifest_path)
    manifest = dict(existing_manifest)
    existing_descriptions_manifest = load_descriptions_manifest(descriptions_manifest_path)
    descriptions_manifest = dict(existing_descriptions_manifest)

    # Reutiliza la misma ruta local cuando varias referencias comparten URL.
    url_to_relative_path: Dict[str, str] = {}
    downloaded_count = 0
    skipped_existing_files = 0
    updated_skus = 0
    skus_with_description = 0
    updated_descriptions = 0
    failed_downloads: list[tuple[str, str, str]] = []

    for sku, image_urls, description in records:
        relative_paths: list[str] = []

        for image_url in image_urls:
            if image_url in url_to_relative_path:
                relative_paths.append(url_to_relative_path[image_url])
                continue

            if args.skip_download:
                url_to_relative_path[image_url] = image_url
                relative_paths.append(image_url)
                continue

            filename = build_filename_from_url(image_url)
            destination = output_dir / filename
            relative_path = to_frontend_relative_path(destination)

            try:
                was_downloaded = download_image(
                    image_url,
                    destination=destination,
                    timeout=args.timeout,
                    replace_existing=args.replace_existing,
                )
            except Exception as exc:  # noqa: BLE001
                failed_downloads.append((sku, image_url, str(exc)))
                continue

            if was_downloaded:
                downloaded_count += 1
            else:
                skipped_existing_files += 1

            url_to_relative_path[image_url] = relative_path
            relative_paths.append(relative_path)

        unique_paths = list(dict.fromkeys(relative_paths))
        if not unique_paths:
            continue

        previous = manifest.get(sku) or []
        if previous != unique_paths:
            updated_skus += 1
        manifest[sku] = unique_paths

        normalized_description = normalize_description_text(description)
        if normalized_description:
            skus_with_description += 1
            previous_description = descriptions_manifest.get(sku) or ""
            if previous_description != normalized_description:
                updated_descriptions += 1
            descriptions_manifest[sku] = normalized_description

    save_manifest(manifest_path, manifest)
    save_descriptions_manifest(descriptions_manifest_path, descriptions_manifest)

    print(f"Productos fuente: {len(products)}")
    print(f"SKUs con imagen en fuente: {len(records)}")
    print(f"SKUs actualizados en manifest: {updated_skus}")
    print(f"SKUs con descripcion en fuente: {skus_with_description}")
    print(f"Descripciones actualizadas en manifest: {updated_descriptions}")
    print(f"Imagenes descargadas: {downloaded_count}")
    print(f"Imagenes ya existentes (omitidas): {skipped_existing_files}")
    print(f"Total claves en manifest: {len(manifest)}")
    print(f"Total claves en manifest de descripciones: {len(descriptions_manifest)}")

    if failed_downloads:
        print(f"Descargas fallidas: {len(failed_downloads)}")
        for sku, url, reason in failed_downloads[:10]:
            print(f"  - {sku} -> {url} | {reason}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

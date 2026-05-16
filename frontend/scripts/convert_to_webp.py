#!/usr/bin/env python3
"""Generate WebP variants and optionally rewrite frontend references.

- Converts JPG/JPEG/PNG files under --images-root to .webp alongside originals.
- Rewrites .jpg/.jpeg/.png paths in HTML/JS/CSS files to .webp when target exists.
"""

from __future__ import annotations

import argparse
import re
from dataclasses import dataclass
from pathlib import Path

from PIL import Image


SOURCE_EXTENSIONS = {".jpg", ".jpeg", ".png"}
TEXT_EXTENSIONS = {".html", ".js", ".css"}


@dataclass
class ConversionStats:
    scanned: int = 0
    converted: int = 0
    skipped_existing: int = 0
    errors: int = 0
    source_bytes: int = 0
    webp_bytes: int = 0


@dataclass
class RewriteStats:
    files_scanned: int = 0
    files_updated: int = 0
    refs_updated: int = 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Convert raster images to WebP and rewrite references")
    parser.add_argument("--images-root", default="frontend/assets/images", help="Images root directory")
    parser.add_argument("--refs-root", default="frontend", help="Frontend root where HTML/JS/CSS are scanned")
    parser.add_argument("--quality", type=int, default=82, help="WebP quality for lossy conversion (1-100)")
    parser.add_argument("--force", action="store_true", help="Regenerate existing .webp files")
    parser.add_argument("--rewrite-refs", action="store_true", help="Rewrite image references to .webp")
    parser.add_argument("--verbose", action="store_true", help="Print per-file details")
    return parser.parse_args()


def iter_source_images(images_root: Path):
    for path in images_root.rglob("*"):
        if path.is_file() and path.suffix.lower() in SOURCE_EXTENSIONS:
            yield path


def convert_one(path: Path, quality: int, force: bool, verbose: bool, stats: ConversionStats) -> None:
    stats.scanned += 1
    stats.source_bytes += path.stat().st_size

    webp_path = path.with_suffix(".webp")
    if webp_path.exists() and not force:
        stats.skipped_existing += 1
        stats.webp_bytes += webp_path.stat().st_size
        return

    try:
        with Image.open(path) as img:
            has_alpha = "A" in img.getbands()
            if has_alpha:
                out = img.convert("RGBA")
                out.save(webp_path, format="WEBP", lossless=True, method=6)
            else:
                out = img.convert("RGB")
                out.save(webp_path, format="WEBP", quality=max(1, min(100, quality)), method=6)

        stats.converted += 1
        stats.webp_bytes += webp_path.stat().st_size
        if verbose:
            print(f"WEBP {path} -> {webp_path}")

    except Exception as exc:  # noqa: BLE001
        stats.errors += 1
        print(f"ERROR {path}: {exc}")


REF_PATTERN = re.compile(
    r"(?P<path>(?:\.\./)?assets/[^\s\"'\)]+?\.(?:png|jpe?g))(?P<query>\?[^\s\"'\)]*)?",
    flags=re.IGNORECASE,
)


def resolve_image_path(text_file: Path, refs_root: Path, rel_path: str) -> Path | None:
    """Resolve image paths that may be relative to file dir or frontend root."""
    candidates: list[Path] = []

    # Standard relative resolution from current file.
    candidates.append((text_file.parent / rel_path).resolve())

    # Common project pattern: assets/... referenced from JS inside subfolders.
    normalized = rel_path.removeprefix("./")
    if normalized.startswith("assets/"):
        candidates.append((refs_root / normalized).resolve())

    for candidate in candidates:
        if candidate.exists():
            return candidate

    return None


def rewrite_references(refs_root: Path, verbose: bool) -> RewriteStats:
    stats = RewriteStats()

    for text_file in refs_root.rglob("*"):
        if not text_file.is_file() or text_file.suffix.lower() not in TEXT_EXTENSIONS:
            continue

        stats.files_scanned += 1
        original = text_file.read_text(encoding="utf-8")

        replaced_count = 0

        def replacer(match: re.Match[str]) -> str:
            nonlocal replaced_count
            rel_path = match.group("path")
            query = match.group("query") or ""

            absolute_img = resolve_image_path(text_file, refs_root, rel_path)
            if absolute_img is None:
                return match.group(0)

            webp_target = absolute_img.with_suffix(".webp")
            if not webp_target.exists():
                return match.group(0)

            replaced_count += 1
            return rel_path.rsplit(".", 1)[0] + ".webp" + query

        updated = REF_PATTERN.sub(replacer, original)

        if replaced_count > 0 and updated != original:
            text_file.write_text(updated, encoding="utf-8", newline="\n")
            stats.files_updated += 1
            stats.refs_updated += replaced_count
            if verbose:
                print(f"UPDATED {text_file} ({replaced_count} refs)")

    return stats


def main() -> int:
    args = parse_args()
    images_root = Path(args.images_root).resolve()
    refs_root = Path(args.refs_root).resolve()

    if not images_root.exists() or not images_root.is_dir():
        print(f"Directory not found: {images_root}")
        return 1

    conversion = ConversionStats()
    for source_image in iter_source_images(images_root):
        convert_one(
            source_image,
            quality=args.quality,
            force=args.force,
            verbose=args.verbose,
            stats=conversion,
        )

    rewrite = RewriteStats()
    if args.rewrite_refs:
        if not refs_root.exists() or not refs_root.is_dir():
            print(f"Directory not found: {refs_root}")
            return 1
        rewrite = rewrite_references(refs_root, verbose=args.verbose)

    print("\n=== WebP Conversion Summary ===")
    print(f"Scanned images:     {conversion.scanned}")
    print(f"Converted images:   {conversion.converted}")
    print(f"Skipped existing:   {conversion.skipped_existing}")
    print(f"Conversion errors:  {conversion.errors}")
    print(f"Source bytes:       {conversion.source_bytes:,}")
    print(f"WebP bytes:         {conversion.webp_bytes:,}")

    if args.rewrite_refs:
        print("\n=== Reference Rewrite Summary ===")
        print(f"Scanned files:      {rewrite.files_scanned}")
        print(f"Updated files:      {rewrite.files_updated}")
        print(f"Updated refs:       {rewrite.refs_updated}")

    return 1 if conversion.errors else 0


if __name__ == "__main__":
    raise SystemExit(main())

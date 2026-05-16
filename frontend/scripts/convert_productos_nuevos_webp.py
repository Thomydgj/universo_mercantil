#!/usr/bin/env python3
"""Convert new product images to high-quality WebP without resizing.

This script is intentionally conservative:
- Keeps original pixel dimensions unchanged.
- Uses high-quality lossy WebP for photo-like images.
- Uses lossless WebP for PNG sources by default.
- Keeps original files unless --delete-original is passed.
"""

from __future__ import annotations

import argparse
import os
import tempfile
from dataclasses import dataclass
from pathlib import Path

from PIL import Image


SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff"}


@dataclass
class Stats:
    scanned: int = 0
    converted: int = 0
    skipped_existing: int = 0
    skipped_animated: int = 0
    errors: int = 0
    before_bytes: int = 0
    after_bytes: int = 0
    originals_deleted: int = 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convert product images to WebP with high quality and no downscaling."
    )
    parser.add_argument(
        "--root",
        default="frontend/assets/images/producto",
        help="Root directory to scan. Default: frontend/assets/images/producto",
    )
    parser.add_argument(
        "--quality",
        type=int,
        default=95,
        help="WebP quality for lossy sources (1-100). Default: 95",
    )
    parser.add_argument(
        "--method",
        type=int,
        default=6,
        help="WebP compression effort (0-6). Default: 6",
    )
    parser.add_argument(
        "--lossless-png",
        action="store_true",
        default=True,
        help="Encode PNG inputs as lossless WebP (default: enabled).",
    )
    parser.add_argument(
        "--no-lossless-png",
        action="store_false",
        dest="lossless_png",
        help="Encode PNG inputs as lossy WebP instead.",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Overwrite existing .webp files.",
    )
    parser.add_argument(
        "--delete-original",
        action="store_true",
        help="Delete source file after a successful conversion.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview conversions without writing files.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Print per-file details.",
    )
    return parser.parse_args()


def iter_sources(root: Path):
    for path in root.rglob("*"):
        if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS:
            yield path


def make_temp_path(target: Path) -> Path:
    fd, name = tempfile.mkstemp(prefix=".webp-", suffix=".webp", dir=target.parent)
    os.close(fd)
    return Path(name)


def build_metadata_kwargs(image: Image.Image) -> dict[str, bytes]:
    kwargs: dict[str, bytes] = {}
    exif = image.info.get("exif")
    icc = image.info.get("icc_profile")
    if isinstance(exif, (bytes, bytearray)) and exif:
        kwargs["exif"] = bytes(exif)
    if isinstance(icc, (bytes, bytearray)) and icc:
        kwargs["icc_profile"] = bytes(icc)
    return kwargs


def normalize_mode(image: Image.Image) -> Image.Image:
    if image.mode in {"RGB", "RGBA", "L"}:
        return image
    has_alpha = "A" in image.getbands()
    return image.convert("RGBA" if has_alpha else "RGB")


def convert_file(path: Path, args: argparse.Namespace, stats: Stats) -> None:
    stats.scanned += 1
    stats.before_bytes += path.stat().st_size

    target = path.with_suffix(".webp")
    if target.exists() and not args.overwrite:
        stats.skipped_existing += 1
        if args.verbose:
            print(f"SKIPPED   {path} (existing {target.name})")
        return

    temp_path = make_temp_path(target)
    try:
        with Image.open(path) as image:
            if getattr(image, "is_animated", False):
                stats.skipped_animated += 1
                temp_path.unlink(missing_ok=True)
                if args.verbose:
                    print(f"SKIPPED   {path} (animated)")
                return

            source_ext = path.suffix.lower()
            out = normalize_mode(image)
            metadata = build_metadata_kwargs(image)

            save_kwargs = {
                "format": "WEBP",
                "method": max(0, min(6, args.method)),
                **metadata,
            }

            if source_ext == ".png" and args.lossless_png:
                save_kwargs["lossless"] = True
            else:
                save_kwargs["lossless"] = False
                save_kwargs["quality"] = max(1, min(100, args.quality))

            out.save(temp_path, **save_kwargs)

        after = temp_path.stat().st_size
        stats.after_bytes += after

        if args.dry_run:
            temp_path.unlink(missing_ok=True)
            if args.verbose:
                print(f"DRY-RUN  {path} -> {target} ({after} B)")
            return

        os.replace(temp_path, target)
        stats.converted += 1

        if args.delete_original and path != target:
            path.unlink(missing_ok=True)
            stats.originals_deleted += 1

        if args.verbose:
            print(f"CONVERTED {path} -> {target} ({after} B)")

    except Exception as exc:  # noqa: BLE001
        temp_path.unlink(missing_ok=True)
        stats.errors += 1
        print(f"ERROR     {path}: {exc}")


def print_summary(stats: Stats, dry_run: bool) -> None:
    saved = max(0, stats.before_bytes - stats.after_bytes)
    pct = (saved / stats.before_bytes * 100.0) if stats.before_bytes else 0.0

    mode = "DRY-RUN" if dry_run else "WRITE"
    print("\n=== WebP Conversion Summary ===")
    print(f"Mode:              {mode}")
    print(f"Scanned:           {stats.scanned}")
    print(f"Converted:         {stats.converted}")
    print(f"Skipped Existing:  {stats.skipped_existing}")
    print(f"Skipped Animated:  {stats.skipped_animated}")
    print(f"Errors:            {stats.errors}")
    print(f"Before (sources):  {stats.before_bytes:,} B")
    print(f"After (webp):      {stats.after_bytes:,} B")
    print(f"Estimated Saved:   {saved:,} B ({pct:.2f}%)")
    print(f"Originals Deleted: {stats.originals_deleted}")


def main() -> int:
    args = parse_args()
    root = Path(args.root).resolve()

    if not root.exists() or not root.is_dir():
        print(f"Directory not found: {root}")
        return 1

    stats = Stats()
    for path in iter_sources(root):
        convert_file(path, args, stats)

    print_summary(stats, args.dry_run)
    return 1 if stats.errors else 0


if __name__ == "__main__":
    raise SystemExit(main())

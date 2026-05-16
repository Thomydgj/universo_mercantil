#!/usr/bin/env python3
"""Optimize project images in place without changing name or location.

Supported formats: JPG/JPEG, PNG, WEBP, GIF (static).
The script keeps paths and filenames untouched to avoid breaking links.
"""

from __future__ import annotations

import argparse
import os
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from PIL import Image


SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


@dataclass
class Stats:
    scanned: int = 0
    optimized: int = 0
    unchanged: int = 0
    skipped: int = 0
    errors: int = 0
    before_bytes: int = 0
    after_bytes: int = 0


def build_metadata_kwargs(exif: object, icc: object) -> dict[str, bytes]:
    kwargs: dict[str, bytes] = {}
    if isinstance(exif, (bytes, bytearray)) and exif:
        kwargs["exif"] = bytes(exif)
    if isinstance(icc, (bytes, bytearray)) and icc:
        kwargs["icc_profile"] = bytes(icc)
    return kwargs


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Optimize image files in place. The script never changes names or directories."
        )
    )
    parser.add_argument(
        "--root",
        default="frontend/assets/images",
        help="Root directory to scan. Default: frontend/assets/images",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes without writing files.",
    )
    parser.add_argument(
        "--quality-jpeg",
        type=int,
        default=82,
        help="JPEG quality (1-95). Default: 82",
    )
    parser.add_argument(
        "--quality-webp",
        type=int,
        default=80,
        help="WEBP quality (1-100). Default: 80",
    )
    parser.add_argument(
        "--png-colors",
        type=int,
        default=256,
        help="PNG palette colors when quantizing (2-256). Default: 256",
    )
    parser.add_argument(
        "--keep-larger",
        action="store_true",
        help="Replace files even when optimized output is larger.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Print per-file details.",
    )
    return parser.parse_args()


def iter_images(root: Path) -> Iterable[Path]:
    for path in root.rglob("*"):
        if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS:
            yield path


def make_temp_path(target: Path) -> Path:
    tmp_dir = target.parent
    fd, name = tempfile.mkstemp(prefix=".opt-", suffix=target.suffix, dir=tmp_dir)
    os.close(fd)
    return Path(name)


def save_optimized_copy(
    src: Path,
    dst: Path,
    quality_jpeg: int,
    quality_webp: int,
    png_colors: int,
) -> None:
    ext = src.suffix.lower()

    with Image.open(src) as img:
        if getattr(img, "is_animated", False):
            raise ValueError("animated image (skipped)")

        exif = img.info.get("exif")
        icc = img.info.get("icc_profile")
        metadata_kwargs = build_metadata_kwargs(exif, icc)

        if ext in {".jpg", ".jpeg"}:
            out = img
            if out.mode not in {"RGB", "L"}:
                out = out.convert("RGB")
            out.save(
                dst,
                format="JPEG",
                optimize=True,
                progressive=True,
                quality=max(1, min(95, quality_jpeg)),
                **metadata_kwargs,
            )
            return

        if ext == ".png":
            out = img
            if out.mode in {"RGB", "RGBA", "P"} and 2 <= png_colors <= 256:
                method = Image.Quantize.FASTOCTREE if out.mode == "RGBA" else Image.Quantize.MEDIANCUT
                out = out.quantize(colors=png_colors, method=method)
            out.save(dst, format="PNG", optimize=True, compress_level=9)
            return

        if ext == ".webp":
            out = img
            lossless = bool(img.info.get("lossless", False))
            if not lossless and out.mode not in {"RGB", "RGBA", "L"}:
                out = out.convert("RGBA" if "A" in out.getbands() else "RGB")
            out.save(
                dst,
                format="WEBP",
                quality=max(1, min(100, quality_webp)),
                method=6,
                lossless=lossless,
                **metadata_kwargs,
            )
            return

        if ext == ".gif":
            img.save(dst, format="GIF", optimize=True)
            return

        raise ValueError("unsupported extension")


def optimize_file(path: Path, args: argparse.Namespace, stats: Stats) -> None:
    stats.scanned += 1

    before = path.stat().st_size
    stats.before_bytes += before

    temp_path = make_temp_path(path)
    try:
        save_optimized_copy(
            src=path,
            dst=temp_path,
            quality_jpeg=args.quality_jpeg,
            quality_webp=args.quality_webp,
            png_colors=args.png_colors,
        )

        after = temp_path.stat().st_size

        if after >= before and not args.keep_larger:
            stats.unchanged += 1
            stats.after_bytes += before
            temp_path.unlink(missing_ok=True)
            if args.verbose:
                print(f"UNCHANGED {path} ({before} B)")
            return

        stats.optimized += 1
        stats.after_bytes += after

        if args.dry_run:
            temp_path.unlink(missing_ok=True)
            if args.verbose:
                print(f"DRY-RUN  {path} {before} B -> {after} B")
            return

        os.replace(temp_path, path)
        if args.verbose:
            print(f"OPTIMIZED {path} {before} B -> {after} B")

    except ValueError as exc:
        temp_path.unlink(missing_ok=True)
        if "animated image" in str(exc):
            stats.skipped += 1
            stats.after_bytes += before
            if args.verbose:
                print(f"SKIPPED   {path} ({exc})")
            return
        stats.errors += 1
        stats.after_bytes += before
        print(f"ERROR     {path}: {exc}")

    except Exception as exc:  # noqa: BLE001
        temp_path.unlink(missing_ok=True)
        stats.errors += 1
        stats.after_bytes += before
        print(f"ERROR     {path}: {exc}")


def print_summary(stats: Stats, dry_run: bool) -> None:
    saved = max(0, stats.before_bytes - stats.after_bytes)
    pct = (saved / stats.before_bytes * 100.0) if stats.before_bytes else 0.0

    mode = "DRY-RUN" if dry_run else "WRITE"
    print("\n=== Image Optimization Summary ===")
    print(f"Mode:       {mode}")
    print(f"Scanned:    {stats.scanned}")
    print(f"Optimized:  {stats.optimized}")
    print(f"Unchanged:  {stats.unchanged}")
    print(f"Skipped:    {stats.skipped}")
    print(f"Errors:     {stats.errors}")
    print(f"Before:     {stats.before_bytes:,} B")
    print(f"After:      {stats.after_bytes:,} B")
    print(f"Saved:      {saved:,} B ({pct:.2f}%)")


def main() -> int:
    args = parse_args()
    root = Path(args.root).resolve()

    if not root.exists() or not root.is_dir():
        print(f"Directory not found: {root}")
        return 1

    stats = Stats()

    for image_path in iter_images(root):
        optimize_file(image_path, args, stats)

    print_summary(stats, args.dry_run)

    return 1 if stats.errors else 0


if __name__ == "__main__":
    raise SystemExit(main())

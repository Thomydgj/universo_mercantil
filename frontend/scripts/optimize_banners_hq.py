#!/usr/bin/env python3
"""Increase banner output resolution while keeping good WebP performance.

This script is intentionally banner-specific so product image settings remain untouched.
"""

from __future__ import annotations

import argparse
import os
import tempfile
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageFilter


SUPPORTED = {".webp", ".jpg", ".jpeg", ".png"}


@dataclass
class Stats:
    scanned: int = 0
    processed: int = 0
    skipped: int = 0
    errors: int = 0
    bytes_before: int = 0
    bytes_after: int = 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Optimize banners with higher output resolution and balanced WebP size."
    )
    parser.add_argument(
        "--root",
        default="frontend/assets/images/banners",
        help="Banner root folder. Default: frontend/assets/images/banners",
    )
    parser.add_argument(
        "--desktop-width",
        type=int,
        default=1920,
        help="Target width for desktop banners. Default: 1920",
    )
    parser.add_argument(
        "--mobile-width",
        type=int,
        default=1080,
        help="Target width for mobile banners. Default: 1080",
    )
    parser.add_argument(
        "--quality",
        type=int,
        default=88,
        help="WebP quality 1-100. Default: 88",
    )
    parser.add_argument(
        "--max-growth",
        type=float,
        default=4.0,
        help="Max output/input size ratio allowed. Default: 4.0",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview without writing files.",
    )
    return parser.parse_args()


def iter_files(root: Path):
    for path in root.rglob("*"):
        if path.is_file() and path.suffix.lower() in SUPPORTED:
            yield path


def is_mobile_banner(path: Path) -> bool:
    p = path.as_posix().lower()
    name = path.name.lower()
    return "/movil/" in p or "_movil" in name


def target_width_for(path: Path, desktop_width: int, mobile_width: int) -> int:
    return mobile_width if is_mobile_banner(path) else desktop_width


def ensure_mode(image: Image.Image) -> Image.Image:
    if image.mode in {"RGB", "RGBA", "L"}:
        return image
    return image.convert("RGBA" if "A" in image.getbands() else "RGB")


def resize_if_needed(image: Image.Image, target_width: int) -> Image.Image:
    width, height = image.size
    if width >= target_width or width <= 0:
        return image

    ratio = target_width / float(width)
    new_height = max(1, int(round(height * ratio)))
    # Slight sharpening after upscale to avoid soft output.
    upscaled = image.resize((target_width, new_height), Image.Resampling.LANCZOS)
    return upscaled.filter(ImageFilter.UnsharpMask(radius=1.2, percent=125, threshold=2))


def temp_webp_path(path: Path) -> Path:
    fd, tmp_name = tempfile.mkstemp(prefix=".banner-hq-", suffix=".webp", dir=path.parent)
    os.close(fd)
    return Path(tmp_name)


def optimize_file(path: Path, args: argparse.Namespace, stats: Stats) -> None:
    stats.scanned += 1
    before_size = path.stat().st_size
    stats.bytes_before += before_size

    tmp = temp_webp_path(path)
    try:
        with Image.open(path) as image:
            if getattr(image, "is_animated", False):
                stats.skipped += 1
                stats.bytes_after += before_size
                tmp.unlink(missing_ok=True)
                return

            out = ensure_mode(image)
            out = resize_if_needed(
                out,
                target_width_for(path, args.desktop_width, args.mobile_width),
            )

            out.save(
                tmp,
                format="WEBP",
                quality=max(1, min(100, args.quality)),
                method=6,
            )

        after_size = tmp.stat().st_size

        if before_size > 0 and (after_size / before_size) > max(1.0, args.max_growth):
            stats.skipped += 1
            stats.bytes_after += before_size
            tmp.unlink(missing_ok=True)
            return

        stats.processed += 1
        stats.bytes_after += after_size

        if args.dry_run:
            tmp.unlink(missing_ok=True)
            return

        os.replace(tmp, path)

    except Exception:
        stats.errors += 1
        stats.bytes_after += before_size
        tmp.unlink(missing_ok=True)


def main() -> int:
    args = parse_args()
    root = Path(args.root).resolve()
    if not root.exists() or not root.is_dir():
        print(f"Directory not found: {root}")
        return 1

    stats = Stats()
    for file_path in iter_files(root):
        optimize_file(file_path, args, stats)

    saved = stats.bytes_before - stats.bytes_after
    pct = (saved / stats.bytes_before * 100.0) if stats.bytes_before else 0.0
    print("=== Banner HQ Optimization Summary ===")
    print(f"Scanned:   {stats.scanned}")
    print(f"Processed: {stats.processed}")
    print(f"Skipped:   {stats.skipped}")
    print(f"Errors:    {stats.errors}")
    print(f"Before:    {stats.bytes_before:,} B")
    print(f"After:     {stats.bytes_after:,} B")
    print(f"Saved:     {saved:,} B ({pct:.2f}%)")

    return 1 if stats.errors else 0


if __name__ == "__main__":
    raise SystemExit(main())

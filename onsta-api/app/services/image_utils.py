import io
from fastapi import HTTPException
from PIL import Image, ImageOps

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_SIZE = 15 * 1024 * 1024  # 15 MB


def optimize_image(
    raw_bytes: bytes,
    max_width: int = 1200,
    max_height: int = 900,
    crop_square: bool = False,
    quality: int = 85,
) -> tuple[bytes, str]:
    """
    Normalize EXIF orientation, optionally center-crop to square, resize within bounds,
    and convert to optimized WebP bytes.
    """
    try:
        with Image.open(io.BytesIO(raw_bytes)) as img:
            img = ImageOps.exif_transpose(img)
            if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
                img = img.convert("RGBA")
            else:
                img = img.convert("RGB")

            if crop_square:
                side = min(img.width, img.height)
                left = (img.width - side) // 2
                top = (img.height - side) // 2
                img = img.crop((left, top, left + side, top + side))
                img = img.resize((max_width, max_height), Image.Resampling.LANCZOS)
            else:
                img.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)

            out = io.BytesIO()
            img.save(out, format="WEBP", quality=quality, method=4)
            return out.getvalue(), ".webp"
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or corrupted image file. Please upload a valid JPEG, PNG, or WebP image.")

"""In-memory image handling. Nothing is ever written to disk or storage.

Validation is by magic bytes rather than filename, EXIF is dropped (photos of
injuries commonly carry GPS coordinates), and the re-encoded buffer exists
only for the lifetime of the request.
"""
import io
from typing import Optional

from PIL import Image

from app.core.errors import ImageRejectedError
from app.core.settings import get_settings

# Magic byte prefixes for the accepted formats.
_SIGNATURES = (
    (b"\xff\xd8\xff", "jpeg"),
    (b"\x89PNG\r\n\x1a\n", "png"),
)


def _detect_format(data: bytes) -> Optional[str]:
    for signature, name in _SIGNATURES:
        if data.startswith(signature):
            return name
    # WebP: "RIFF....WEBP"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    return None


def process(data: bytes) -> bytes:
    """Validate, strip metadata, downscale, and re-encode as JPEG."""
    settings = get_settings()

    if not data:
        raise ImageRejectedError("empty_file")
    if len(data) > settings.max_image_bytes:
        raise ImageRejectedError("too_large")
    if _detect_format(data) is None:
        raise ImageRejectedError("unsupported_format")

    try:
        with Image.open(io.BytesIO(data)) as image:
            image.load()
            converted = image.convert("RGB")
    except Exception as exc:  # Pillow raises a wide range of errors here.
        raise ImageRejectedError("unreadable_image") from exc

    converted.thumbnail(
        (settings.max_image_dimension, settings.max_image_dimension)
    )

    buffer = io.BytesIO()
    # Re-encoding through a fresh buffer is what drops EXIF, including GPS.
    converted.save(buffer, format="JPEG", quality=80, optimize=True)
    return buffer.getvalue()

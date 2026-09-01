import io

import pytest
from PIL import Image

from app.core.errors import ImageRejectedError
from app.services import image_service


def make_jpeg(size=(2400, 1800), with_gps=True) -> bytes:
    image = Image.new("RGB", size, (200, 120, 90))
    buffer = io.BytesIO()
    exif = Image.Exif()
    if with_gps:
        # 0x8825 is the GPS IFD pointer — the tag that makes injury photos a
        # privacy problem if they are ever stored or forwarded as-is.
        exif[0x8825] = {1: "N", 2: (28.0, 36.0, 0.0)}
        exif[0x010F] = "TestPhone"
    image.save(buffer, format="JPEG", exif=exif)
    return buffer.getvalue()


def test_valid_jpeg_is_downscaled():
    processed = image_service.process(make_jpeg())
    with Image.open(io.BytesIO(processed)) as image:
        assert max(image.size) <= 1024


def test_exif_including_gps_is_stripped():
    original = make_jpeg()
    with Image.open(io.BytesIO(original)) as image:
        assert image.getexif()

    processed = image_service.process(original)
    with Image.open(io.BytesIO(processed)) as image:
        exif = image.getexif()
        assert 0x8825 not in exif
        assert 0x010F not in exif


def test_png_is_accepted_and_normalised_to_jpeg():
    buffer = io.BytesIO()
    Image.new("RGBA", (400, 400), (10, 20, 30, 255)).save(buffer, format="PNG")
    processed = image_service.process(buffer.getvalue())
    with Image.open(io.BytesIO(processed)) as image:
        assert image.format == "JPEG"


def test_file_pretending_to_be_an_image_is_rejected():
    """Type is decided by magic bytes, not by the filename."""
    with pytest.raises(ImageRejectedError):
        image_service.process(b"GIF89a" + b"\x00" * 128)
    with pytest.raises(ImageRejectedError):
        image_service.process(b"<?php echo 1; ?>")


def test_empty_upload_is_rejected():
    with pytest.raises(ImageRejectedError):
        image_service.process(b"")


def test_oversized_upload_is_rejected():
    with pytest.raises(ImageRejectedError):
        image_service.process(b"\xff\xd8\xff" + b"\x00" * (3 * 1024 * 1024 + 1))

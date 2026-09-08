import io
import json
import subprocess
import tempfile
import warnings
from pathlib import Path
from threading import BoundedSemaphore

from fastapi import HTTPException
from PIL import Image, ImageOps, UnidentifiedImageError

MAX_UPLOAD = 12 * 1024 * 1024
Image.MAX_IMAGE_PIXELS = 16_000_000
workers = BoundedSemaphore(2)


def sanitise_media(data: bytes, kind: str) -> tuple[bytes, str]:
    if not data or len(data) > MAX_UPLOAD:
        raise HTTPException(413, "Maximum upload size: 12 MB")
    if not workers.acquire(blocking=False):
        raise HTTPException(429, "Media processor busy. Please retry shortly.")
    try:
        if kind == "image":
            try:
                with warnings.catch_warnings():
                    warnings.simplefilter("error", Image.DecompressionBombWarning)
                    with Image.open(io.BytesIO(data)) as original:
                        if original.format not in {"JPEG", "PNG", "WEBP"}:
                            raise ValueError("Unsupported image")
                        image = ImageOps.exif_transpose(original).convert("RGB")
                        image.thumbnail((2048, 2048))
                        output = io.BytesIO()
                        # New image removes EXIF, GPS and other uploaded metadata.
                        clean = Image.new("RGB", image.size)
                        clean.paste(image)
                        clean.save(output, format="JPEG", quality=85)
                        return output.getvalue(), "image/jpeg"
            except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError, Image.DecompressionBombWarning) as error:
                raise HTTPException(422, "Choose a JPEG, PNG or WebP photo up to 16 megapixels") from error
        if kind != "audio":
            raise HTTPException(422, "Unsupported attachment type")
        # Restrict demuxers and protocols: never accept playlists or remote inputs.
        if data.startswith(b"\x1aE\xdf\xa3"):
            demuxer = "matroska"
        elif data.startswith(b"OggS"):
            demuxer = "ogg"
        elif len(data) > 12 and data[4:8] == b"ftyp":
            demuxer = "mov"
        elif data.startswith(b"RIFF") and data[8:12] == b"WAVE":
            demuxer = "wav"
        else:
            raise HTTPException(422, "Choose WebM, Ogg, M4A or WAV audio")
        with tempfile.TemporaryDirectory(prefix="community-audio-") as directory:
            source = Path(directory) / "input"
            target = Path(directory) / "voice.ogg"
            source.write_bytes(data)
            options = ["-v", "error", "-protocol_whitelist", "file,pipe", "-f", demuxer]
            try:
                probe = subprocess.run(["ffprobe", *options, "-show_streams", "-show_format", "-of", "json", str(source)], capture_output=True, timeout=10, check=True)
                metadata = json.loads(probe.stdout)
                streams = metadata.get("streams", [])
                if not streams or any(stream["codec_type"] != "audio" for stream in streams):
                    raise ValueError("Audio only")
                duration = metadata.get("format", {}).get("duration")
                if duration and float(duration) > 91:
                    raise ValueError("Voice note too long")
                # Decode at most 91 seconds. Ogg duration is then checked, including
                # MediaRecorder files whose original duration is unspecified.
                subprocess.run(["ffmpeg", "-nostdin", *options, "-i", str(source), "-t", "91", "-map", "0:a:0", "-map_metadata", "-1", "-ac", "1", "-ar", "48000", "-c:a", "libopus", "-b:a", "48k", str(target)], capture_output=True, timeout=20, check=True)
                check = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", str(target)], capture_output=True, timeout=5, check=True)
                if float(json.loads(check.stdout)["format"]["duration"]) > 90.5:
                    raise ValueError("Voice note too long")
                return target.read_bytes(), "audio/ogg"
            except (subprocess.SubprocessError, ValueError, KeyError) as error:
                raise HTTPException(422, "Invalid audio or voice note longer than 90 seconds") from error
            except FileNotFoundError as error:
                raise HTTPException(503, "Audio processor unavailable") from error
    finally:
        workers.release()

# file type/size checks for uploaded videos
from pathlib import Path

ALLOWED_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm"}
MAX_FILE_SIZE_MB = 250


def is_allowed_extension(filename):
    return Path(filename).suffix.lower() in ALLOWED_EXTENSIONS


def max_file_size_bytes():
    return MAX_FILE_SIZE_MB * 1024 * 1024

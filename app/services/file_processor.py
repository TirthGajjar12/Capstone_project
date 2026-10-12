import os
import shutil
from datetime import datetime
from typing import Dict, Any, List

DATA_DIR = os.path.join(os.getcwd(), "data")
ARCHIVE_DIR = os.path.join(DATA_DIR, "archive")

def ensure_directories_exist():
    """Uses os module to create data and archive directories if they don't exist."""
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(ARCHIVE_DIR, exist_ok=True)

def analyze_file(filename: str) -> Dict[str, Any]:
    """
    Computes line count, word count, character count, and file size
    using built-in Python file I/O and os module.
    """
    ensure_directories_exist()
    filepath = os.path.join(DATA_DIR, filename)

    if not os.path.exists(filepath):
        raise FileNotFoundError(f"File '{filename}' does not exist in data directory.")

    line_count = 0
    word_count = 0
    char_count = 0

    with open(filepath, "r", encoding="utf-8") as f:
        for line in f:
            line_count += 1
            char_count += len(line)
            word_count += len(line.split())

    file_size_bytes = os.path.getsize(filepath)

    return {
        "filename": filename,
        "size_bytes": file_size_bytes,
        "line_count": line_count,
        "word_count": word_count,
        "char_count": char_count
    }

def process_and_deduplicate_file(filename: str) -> List[str]:
    """
    Reads lines from a file, strips whitespace, eliminates duplicate records,
    and returns unique cleaned entries.
    """
    ensure_directories_exist()
    filepath = os.path.join(DATA_DIR, filename)

    if not os.path.exists(filepath):
        raise FileNotFoundError(f"File '{filename}' does not exist.")

    unique_records = set()
    cleaned_records = []

    with open(filepath, "r", encoding="utf-8") as f:
        for line in f:
            cleaned = line.strip()
            # Ignore empty lines and duplicates
            if cleaned and cleaned not in unique_records:
                unique_records.add(cleaned)
                cleaned_records.append(cleaned)

    return cleaned_records

def archive_file(filename: str) -> str:
    """
    Moves a processed file to the archive folder using shutil and os.
    Appends a timestamp to the archived file name to avoid collisions.
    """
    ensure_directories_exist()
    source_path = os.path.join(DATA_DIR, filename)

    if not os.path.exists(source_path):
        raise FileNotFoundError(f"File '{filename}' does not exist to archive.")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    name_part, ext_part = os.path.splitext(filename)
    archived_filename = f"{name_part}_{timestamp}{ext_part}"
    dest_path = os.path.join(ARCHIVE_DIR, archived_filename)

    shutil.move(source_path, dest_path)
    return archived_filename

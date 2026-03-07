"""Utilities for downloading training datasets from cloud URLs."""

from __future__ import annotations

import shutil
import tempfile
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path


def _safe_name_from_url(url: str, default_name: str) -> str:
    parsed = urllib.parse.urlparse(url)
    candidate = Path(parsed.path).name
    return candidate or default_name


def download_file(url: str, destination_dir: Path, default_name: str) -> Path:
    """Download a file from URL to destination directory and return local path."""
    destination_dir.mkdir(parents=True, exist_ok=True)
    filename = _safe_name_from_url(url, default_name)
    local_path = destination_dir / filename

    print(f"[CLOUD] Downloading dataset from: {url}")
    print(f"[CLOUD] Saving to: {local_path}")
    urllib.request.urlretrieve(url, local_path)
    return local_path


def prepare_csv_from_cloud(data_url: str, cache_dir: Path, default_name: str) -> Path:
    """Download CSV dataset from cloud and return local file path."""
    downloaded = download_file(data_url, cache_dir, default_name)
    if downloaded.suffix.lower() != ".csv":
        raise ValueError(f"Expected a .csv file but got: {downloaded.name}")
    return downloaded


def prepare_image_dir_from_cloud(
    data_url: str,
    cache_dir: Path,
    extract_dir: Path,
    default_name: str,
) -> Path:
    """Download ZIP dataset from cloud, extract it, and return extraction directory."""
    downloaded = download_file(data_url, cache_dir, default_name)
    if downloaded.suffix.lower() != ".zip":
        raise ValueError(
            "Image datasets must be provided as a .zip URL for automatic extraction"
        )

    if extract_dir.exists():
        shutil.rmtree(extract_dir)
    extract_dir.mkdir(parents=True, exist_ok=True)

    print(f"[CLOUD] Extracting: {downloaded}")
    with zipfile.ZipFile(downloaded, "r") as zf:
        zf.extractall(extract_dir)

    return extract_dir


def make_temp_work_dir(prefix: str) -> Path:
    """Create a temporary work directory for cloud downloads."""
    return Path(tempfile.mkdtemp(prefix=prefix))

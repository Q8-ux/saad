"""Production entrypoint; import only after persistent paths are configured."""

import os
import sys
from pathlib import Path

from gateway import build_gateway

if len(os.environ.get("STUDIO_API_TOKEN", "")) < 24:
    raise RuntimeError("Set a private STUDIO_API_TOKEN of at least 24 characters")

data_dir = Path(os.environ.get("STUDIO_DATA_DIR", "/data")).resolve()
model_dir = data_dir / "models"
data_dir.mkdir(parents=True, exist_ok=True)
model_dir.mkdir(parents=True, exist_ok=True)
os.environ.setdefault("VOICEBOX_MODELS_DIR", str(model_dir))
os.environ.setdefault("HF_HOME", str(model_dir))
os.environ.setdefault("HF_HUB_CACHE", str(model_dir))
os.environ.setdefault("NUMBA_CACHE_DIR", str(data_dir / "numba"))
os.environ.setdefault("VOICEBOX_CLOUD_ENABLED", "0")
sys.path.insert(0, os.environ.get("VOICEBOX_SOURCE_DIR", "/opt/voicebox"))

from backend import config  # noqa: E402

config.set_data_dir(data_dir)

from backend.app import app as voicebox_app  # noqa: E402

app = build_gateway(voicebox_app)

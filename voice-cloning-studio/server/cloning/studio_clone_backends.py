"""MOSS ONNX and Habibi MSA adapters for the pinned Voicebox server."""

from __future__ import annotations

import asyncio
import os
import shutil
import tempfile
import threading
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from . import ModelConfig
from .base import model_load_progress
from ..config import get_models_dir
from ..utils.audio import load_audio
from ..utils.chunked_tts import split_text_into_chunks


MOSS_LANGUAGES = [
    "ar", "da", "de", "el", "en", "es", "fr", "it", "ja", "ko", "nl", "pl",
    "pt", "ru", "sv", "tr", "zh",
]


@dataclass(frozen=True)
class ModelAssets:
    repository: str
    revision: str
    directory: str
    files: tuple[str, ...]

    def cached(self, root: Path) -> bool:
        directory = root / self.directory
        return all((directory / file).is_file() for file in self.files)

    def download(self, root: Path) -> None:
        if not self.cached(root):
            from huggingface_hub import snapshot_download

            snapshot_download(
                repo_id=self.repository,
                revision=self.revision,
                allow_patterns=list(self.files),
                local_dir=root / self.directory,
                max_workers=2,
            )
        if not self.cached(root):
            raise RuntimeError(f"Incomplete model download: {self.repository}")


MOSS_TTS = ModelAssets(
    "OpenMOSS-Team/MOSS-TTS-Nano-100M-ONNX",
    "f52645cb467506d8e18e746ddd59482685b74e58",
    "MOSS-TTS-Nano-100M-ONNX",
    (
        "browser_poc_manifest.json",
        "tts_browser_onnx_meta.json",
        "tokenizer.model",
        "moss_tts_prefill.onnx",
        "moss_tts_decode_step.onnx",
        "moss_tts_local_decoder.onnx",
        "moss_tts_local_cached_step.onnx",
        "moss_tts_local_fixed_sampled_frame.onnx",
        "moss_tts_global_shared.data",
        "moss_tts_local_shared.data",
    ),
)
MOSS_CODEC = ModelAssets(
    "OpenMOSS-Team/MOSS-Audio-Tokenizer-Nano-ONNX",
    "ceff0d0749bfb3fa2d61149794ec6feef0d1e1ae",
    "MOSS-Audio-Tokenizer-Nano-ONNX",
    (
        "codec_browser_onnx_meta.json",
        "moss_audio_tokenizer_encode.onnx",
        "moss_audio_tokenizer_encode.data",
        "moss_audio_tokenizer_decode_full.onnx",
        "moss_audio_tokenizer_decode_step.onnx",
        "moss_audio_tokenizer_decode_shared.data",
    ),
)
HABIBI_MSA = ModelAssets(
    "SWivid/Habibi-TTS",
    "880b7c927ebfba74438836c08530636602baa02f",
    "habibi",
    ("Specialized/MSA/model_200000.safetensors", "Specialized/MSA/vocab.txt"),
)
HABIBI_VOCOS = ModelAssets(
    "charactr/vocos-mel-24khz",
    "0feb3fdd929bcd6649e0e7c5a688cf7dd012ef21",
    "vocos",
    ("config.yaml", "pytorch_model.bin"),
)

# Model load, inference and unload are serialized across these CPU engines.
# The active backend is released before the other engine opens its weights.
_model_lock = threading.RLock()
_active_backend: CloneBackend | None = None


class CloneBackend:
    config: ModelConfig
    assets: tuple[ModelAssets, ...]

    def __init__(self) -> None:
        self.model = None
        self.model_size = "default"

    @property
    def model_dir(self) -> Path:
        return get_models_dir() / "studio-cloning" / self.config.engine

    def _get_model_path(self, model_size="default") -> str:
        return self.assets[0].repository

    def _is_model_cached(self, model_size="default") -> bool:
        return all(asset.cached(self.model_dir) for asset in self.assets)

    def is_loaded(self) -> bool:
        return self.model is not None

    def unload_model(self) -> None:
        global _active_backend
        with _model_lock:
            self.model = None
            if _active_backend is self:
                _active_backend = None

    def delete_cached_model(self) -> None:
        with _model_lock:
            self.unload_model()
            shutil.rmtree(self.model_dir)

    async def load_model(self, model_size="default") -> None:
        await asyncio.to_thread(self._load)

    def _load(self) -> None:
        global _active_backend
        with _model_lock:
            if self.is_loaded():
                return
            if _active_backend is not None:
                _active_backend.unload_model()
            with model_load_progress(self.config.model_name, self._is_model_cached()):
                for asset in self.assets:
                    asset.download(self.model_dir)
                self.model = self._load_runtime()
            _active_backend = self

    async def create_voice_prompt(self, audio_path, reference_text, use_cache=True):
        return {"audio_path": audio_path, "reference_text": reference_text}, False

    async def combine_voice_prompts(self, audio_paths, reference_texts):
        # Keep one complete utterance and its matching transcript. Upstream
        # Voicebox bounds individual samples, while a concatenation is unbounded.
        audio, _ = await asyncio.to_thread(load_audio, audio_paths[0], sample_rate=24000)
        return audio, reference_texts[0]

    async def generate(self, text, voice_prompt, language="ar", seed=None, instruct=None):
        if language not in self.config.languages:
            raise ValueError(f"{self.config.display_name} does not support {language!r}")
        return await asyncio.to_thread(self._generate, text, voice_prompt, seed)

    def _generate(self, text, voice_prompt, seed):
        with _model_lock:
            self._load()
            waveform, sample_rate = self._synthesize(text, voice_prompt, seed)
        if waveform is None:
            raise RuntimeError("The cloning engine returned no audio")
        waveform = np.asarray(waveform, dtype=np.float32)
        if waveform.ndim == 2:
            waveform = waveform.mean(axis=1)
        if waveform.ndim != 1 or not waveform.size or not np.isfinite(waveform).all():
            raise RuntimeError("The cloning engine returned invalid audio")
        if np.max(np.abs(waveform)) < 1e-5:
            raise RuntimeError("The cloning engine returned silent audio")
        return waveform, int(sample_rate)


class MossNanoBackend(CloneBackend):
    config = ModelConfig(
        model_name="moss-tts-nano-onnx",
        display_name="MOSS-TTS-Nano (ONNX)",
        engine="moss_tts_nano",
        hf_repo_id=MOSS_TTS.repository,
        size_mb=764,
        languages=MOSS_LANGUAGES,
    )
    assets = (MOSS_TTS, MOSS_CODEC)

    def _load_runtime(self):
        from onnx_tts_runtime import OnnxTtsRuntime

        return OnnxTtsRuntime(
            model_dir=self.model_dir,
            output_dir=self.model_dir,
            execution_provider="cpu",
            thread_count=max(1, int(os.environ.get("OMP_NUM_THREADS", "2"))),
        )

    def _synthesize(self, text, voice_prompt, seed):
        with tempfile.TemporaryDirectory(prefix="studio-moss-") as directory:
            result = self.model.synthesize(
                text=text,
                prompt_audio_path=voice_prompt["audio_path"],
                output_audio_path=Path(directory) / "generated.wav",
                enable_wetext=False,
                enable_normalize_tts_text=False,
                seed=None if seed is None else seed % (2**64),
            )
        return result["waveform"], result["sample_rate"]


class HabibiBackend(CloneBackend):
    config = ModelConfig(
        model_name="habibi-tts-msa",
        display_name="Habibi-TTS (MSA)",
        engine="habibi_tts",
        hf_repo_id=HABIBI_MSA.repository,
        size_mb=1400,
        languages=["ar"],
    )
    assets = (HABIBI_MSA, HABIBI_VOCOS)

    def _load_runtime(self):
        from importlib.resources import files

        from f5_tts.infer.utils_infer import load_model, load_vocoder
        from f5_tts.model import DiT
        from omegaconf import OmegaConf

        architecture = OmegaConf.load(
            str(files("f5_tts").joinpath("configs/F5TTS_v1_Base.yaml"))
        ).model.arch
        checkpoint, vocabulary = (
            self.model_dir / HABIBI_MSA.directory / path for path in HABIBI_MSA.files
        )
        acoustic_model = load_model(
            DiT, architecture, str(checkpoint), vocab_file=str(vocabulary), device="cpu",
        )
        vocoder = load_vocoder(
            is_local=True,
            local_path=str(self.model_dir / HABIBI_VOCOS.directory),
            device="cpu",
        )
        return acoustic_model, vocoder

    def _synthesize(self, text, voice_prompt, seed):
        import torch
        from habibi_tts.infer.utils_infer import infer_batch_process

        transcript = voice_prompt["reference_text"].strip()
        if not transcript:
            raise ValueError("Habibi-TTS requires the exact reference transcript")
        if transcript[-1] not in ".!?؟":
            transcript += "."
        sample_rate = 24000
        reference, _ = load_audio(voice_prompt["audio_path"], sample_rate=sample_rate)
        if not reference.size or np.max(np.abs(reference)) < 1e-5:
            raise ValueError("Habibi-TTS requires an audible reference")
        seconds = reference.size / sample_rate
        # Keep the reference and each utterance inside F5's 4096-frame limit.
        output_seconds = min(12.0, 40.0 - seconds)
        bytes_per_char = len(text.encode("utf-8")) / len(text)
        max_chars = int(len(transcript.encode("utf-8")) / seconds * output_seconds / bytes_per_char)
        chunks = split_text_into_chunks(text, max_chars=max(8, max_chars))

        model, vocoder = self.model
        with torch.random.fork_rng(devices=[], enabled=seed is not None):
            if seed is not None:
                torch.manual_seed(seed % (2**64))
            audio, rate, _ = next(
                infer_batch_process(
                    (torch.from_numpy(reference).unsqueeze(0), sample_rate),
                    transcript,
                    chunks,
                    model,
                    vocoder,
                    progress=None,
                    device="cpu",
                )
            )
        return audio, rate


STUDIO_CLONERS = {
    MossNanoBackend.config.engine: MossNanoBackend,
    HabibiBackend.config.engine: HabibiBackend,
}

"""GPU worker: run through torchrun, with the upstream repository on PYTHONPATH."""
import argparse, json, os, datetime
from pathlib import Path
import numpy as np
import torch
import torch.distributed as dist
from PIL import Image, ImageOps
from transformers import AutoTokenizer, UMT5EncoderModel
from torchvision.io import write_video
from longcat_video.pipeline_longcat_video import LongCatVideoPipeline
from longcat_video.modules.scheduling_flow_match_euler_discrete import FlowMatchEulerDiscreteScheduler
from longcat_video.modules.autoencoder_kl_wan import AutoencoderKLWan
from longcat_video.modules.longcat_video_dit import LongCatVideoTransformer3DModel
from longcat_video.context_parallel.context_parallel_util import init_context_parallel
from longcat_video.context_parallel import context_parallel_util

def main():
    args = argparse.ArgumentParser()
    args.add_argument("--job", required=True)
    args.add_argument("--weights", required=True)
    a = args.parse_args()
    job = json.loads(Path(a.job).read_text())
    torch.cuda.set_device(0)
    dist.init_process_group("nccl", timeout=datetime.timedelta(hours=2))
    init_context_parallel(context_parallel_size=1, global_rank=0, world_size=1)
    dtype = torch.bfloat16
    def load(cls, folder):
        return cls.from_pretrained(a.weights, subfolder=folder, torch_dtype=dtype)
    dit = LongCatVideoTransformer3DModel.from_pretrained(
        a.weights, subfolder="dit", cp_split_hw=context_parallel_util.get_optimal_split(1), torch_dtype=dtype)
    pipe = LongCatVideoPipeline(tokenizer=load(AutoTokenizer, "tokenizer"),
        text_encoder=load(UMT5EncoderModel, "text_encoder"),
        vae=load(AutoencoderKLWan, "vae"),
        scheduler=load(FlowMatchEulerDiscreteScheduler, "scheduler"), dit=dit)
    pipe.to(0)
    pipe.dit.load_lora(str(Path(a.weights)/"lora/cfg_step_lora.safetensors"), "cfg_step_lora")
    pipe.dit.enable_loras(["cfg_step_lora"])
    common = dict(prompt=job["prompt"], num_frames=93, num_inference_steps=16,
                  guidance_scale=1.0, use_distill=True,
                  generator=torch.Generator(device="cuda").manual_seed(job["seed"]))
    try:
        if job["mode"] == "image":
            with Image.open(job["image_path"]) as source:
                image = ImageOps.fit(ImageOps.exif_transpose(source).convert("RGB"), (832,480))
            frames = pipe.generate_i2v(image=image, resolution="480p", **common)[0]
        else:
            frames = pipe.generate_t2v(height=480, width=832, **common)[0]
        video = torch.from_numpy(np.asarray(frames)).mul(255).clamp(0,255).to(torch.uint8)
        write_video(job["output"], video, fps=15, video_codec="libx264", options={"crf":"18"})
    finally:
        pipe.dit.disable_all_loras()
        dist.destroy_process_group()
if __name__ == "__main__":
    main()

"""Run locally. Creates only a ZeroGPU Space; never selects paid hardware."""
import getpass, re
from huggingface_hub import HfApi, SpaceHardware, hf_hub_download

def main():
    token = getpass.getpass("Hugging Face write token (hidden; not saved): ").strip()
    if not token:
        raise SystemExit("No token supplied.")
    api = HfApi(token=token)
    owner = api.whoami()["name"]
    target = owner + "/saad-video-studio"
    choices = [item for item in SpaceHardware if str(item.value).startswith("zero")]
    if not choices:
        raise SystemExit("This SDK exposes no ZeroGPU hardware. Update the SDK; no paid fallback.")
    hardware = choices[0]
    try:
        api.repo_info(repo_id=target, repo_type="space")
    except Exception as err:
        if getattr(getattr(err, "response", None), "status_code", None) != 404:
            raise SystemExit("Could not verify the destination. No changes made.")
    else:
        runtime = api.get_space_runtime(target)
        print("Existing Space:", "https://huggingface.co/spaces/" + target)
        print("Runtime:", runtime.stage, "Hardware:", runtime.hardware)
        return
    try:
        api.duplicate_repo(from_id="multimodalart/LongCat-Video", to_id=target,
                           repo_type="space", private=False, space_hardware=hardware)
    except Exception:
        raise SystemExit("ZeroGPU creation was rejected. Check account eligibility and current platform rules. No paid hardware was requested.")
    # Preserve original SDK/version metadata and attribution; change only the card title.
    path = hf_hub_download(target, "README.md", repo_type="space", token=token)
    with open(path, encoding="utf-8") as file:
        readme = file.read()
    readme = re.sub(r"(?m)^title:.*$", "title: Saad Video Studio", readme, count=1)
    readme += "\n\n## Saad Video Studio\nPersonal instance for Saad. Based on meituan-longcat/LongCat-Video and the multimodalart community integration. ZeroGPU availability and daily quotas apply.\n"
    api.upload_file(repo_id=target, repo_type="space", path_in_repo="README.md",
                    path_or_fileobj=readme.encode(), commit_message="Brand personal LongCat instance as Saad Video Studio")
    print("Space created; this does not yet prove successful inference.")
    print("https://huggingface.co/spaces/" + target)
    print("Wait for a successful build, then test one video before connecting the website.")
if __name__ == "__main__":
    main()

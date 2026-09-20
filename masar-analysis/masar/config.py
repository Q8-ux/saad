import json
import os
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field


class Project(BaseModel):
    model_config = ConfigDict(extra="forbid")
    token_env: str
    allowed_hosts: list[str] = Field(default_factory=lambda: ["*"], min_length=1)
    max_urls: int = Field(default=8, ge=1, le=20)
    requests_per_minute: int = Field(default=10, ge=1, le=120)
    browser: bool = False
    social: bool = False
    llm: bool = False


def load_env(path=".env"):
    """Read literal values only: never execute shell expansions or overwrite env."""
    p = Path(path)
    if p.exists():
        for line in p.read_text().splitlines():
            if line.strip() and not line.lstrip().startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def load_projects():
    load_env()
    path = Path(os.environ.get("MASAR_CONFIG", "config.local.json"))
    raw = json.loads(path.read_text())
    projects = {name: Project.model_validate(value) for name, value in raw["projects"].items()}
    if not projects or len(projects) > 100:
        raise ValueError("Configure between 1 and 100 projects")
    tokens = [os.environ.get(p.token_env, "") for p in projects.values()]
    if any(len(t) < 32 or t == "GENERATE_WITH_MASAR_INIT" for t in tokens):
        raise ValueError("Each project needs a unique token of at least 32 characters; run masar init")
    if len(set(tokens)) != len(tokens):
        raise ValueError("Project tokens must be unique")
    return projects

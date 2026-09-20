import argparse
import json
import os
import re
import secrets
from pathlib import Path

from .config import load_projects
from .engine import analyze
from .models import AnalysisRequest
from .providers import bounded_command, capabilities


def main():
    parser = argparse.ArgumentParser(prog="masar", description="مسار التحليل")
    commands = parser.add_subparsers(dest="command", required=True)
    init = commands.add_parser("init")
    init.add_argument("--project", default="demo")
    init.add_argument("--allow", action="append", default=[])
    serve = commands.add_parser("serve")
    serve.add_argument("--host", default="127.0.0.1")
    serve.add_argument("--port", default=8787, type=int)
    for action in ("doctor", "analyze", "mcp"):
        p = commands.add_parser(action)
        p.add_argument("--project", default="demo")
        if action == "doctor":
            p.add_argument("--upstream", action="store_true")
        if action == "analyze":
            p.add_argument("query")
            p.add_argument("--url", action="append", default=[])
            p.add_argument("--discover", action="store_true")
            p.add_argument("--provider", default="auto", choices=["auto", "web", "browser", "youtube", "x", "reddit"])
            p.add_argument("--llm", action="store_true")
            p.add_argument("--language", choices=["ar", "en"], default="ar")
    args = parser.parse_args()
    if args.command == "init":
        if not re.fullmatch(r"[a-z][a-z0-9_-]{0,40}", args.project):
            parser.error("Use a lowercase ASCII project name")
        if Path("config.local.json").exists() or Path(".env").exists():
            parser.error("Local configuration already exists; it will not be overwritten")
        token_name = "MASAR_" + args.project.upper().replace("-", "_") + "_TOKEN"
        config = {"projects": {args.project: {"token_env": token_name, "allowed_hosts": args.allow or ["*"],
                    "max_urls": 8, "requests_per_minute": 10, "browser": False, "social": False, "llm": False}}}
        for filename, content in [("config.local.json", json.dumps(config, indent=2)),
                                  (".env", f"MASAR_CONFIG=config.local.json\n{token_name}={secrets.token_urlsafe(36)}\n")]:
            fd = os.open(filename, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600 if filename == ".env" else 0o644)
            with os.fdopen(fd, "w") as out:
                out.write(content)
        print("Project initialized. Token stored privately in .env; run masar serve.")
        return
    if args.command == "serve":
        import uvicorn
        uvicorn.run("masar.api:app", host=args.host, port=args.port, workers=1, access_log=False)
        return
    projects = load_projects()
    if args.project not in projects:
        parser.error("Unknown project")
    project = projects[args.project]
    if args.command == "doctor":
        print(json.dumps(capabilities(project), ensure_ascii=False, indent=2))
        if args.upstream:
            # Local terminal only: never expose upstream config diagnostics via the API.
            print(bounded_command(["agent-reach", "doctor", "--json"], timeout=60))
    elif args.command == "mcp":
        from .mcp_server import serve
        serve(project)
    else:
        if not args.url and not args.discover:
            parser.error("Supply --url or --discover")
        request = AnalysisRequest(query=args.query, urls=args.url, discover=args.discover,
                                  provider=args.provider, use_llm=args.llm, language=args.language)
        result = analyze(request, project)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        if result["status"] == "failed":
            raise SystemExit(2)


if __name__ == "__main__":
    main()

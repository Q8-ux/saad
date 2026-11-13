#!/usr/bin/env python3
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
import json
import os
from pathlib import Path
import subprocess
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo


HERE = Path(__file__).resolve().parent
USER_AGENT = "Q8-ux/Obscura-Project-Check"
SOURCE_ROOT = "https://github.com/Q8-ux/saad/tree/main/"
ACCESS_LIMITS = {401, 403, 429}
STATE_LABELS = {"pass": "نجح", "fail": "تعذر الفحص", "blocked": "الوصول مقيّد", "unknown": "غير محسوم"}
DOM = """const target = document.querySelector(rules.selector || 'html');
const root = document.documentElement;
return JSON.stringify({
  title: document.title.trim(), lang: root.lang, dir: root.dir,
  found: Boolean(target), frame: rules.frame_url && target ? target.src : null,
  matches: rules.selector_timeout ? document.querySelectorAll(rules.selector).length : null,
  sources: rules.source_selector ? Array.from(document.querySelectorAll(rules.source_selector))
    .slice(0, 30).map(link => ({href: link.href, label: link.textContent.trim().slice(0, 160)})) : null
});"""


def http_status(url, field=None, method="HEAD"):
    request = Request(url, headers={"User-Agent": USER_AGENT}, method=method)
    try:
        with urlopen(request, timeout=16) as response:
            if field:
                content_type = response.headers.get_content_type()
                if content_type != "application/json" and not content_type.endswith("+json"):
                    return response.status, None, "أعاد الخادم محتوى بنوع يختلف عن JSON."
                raw = response.read(65537)
                if len(raw) > 65536:
                    return response.status, None, "حجم بيانات الإصدار يتجاوز حد الفحص."
                try:
                    data = json.loads(raw)
                except (ValueError, UnicodeError):
                    return response.status, None, "تعذرت قراءة JSON."
                value = data.get(field) if isinstance(data, dict) else None
                if not isinstance(value, str) or not value.strip():
                    return response.status, None, f"تعذر العثور على قيمة صالحة للحقل {field}."
                return response.status, value.strip()[:200], None
            return response.status, None, None
    except HTTPError as error:
        return error.code, None, None
    except (URLError, OSError, ValueError):
        return None, None, None


def inspect_dom(check, binary, capture):
    options = ["--obey-robots", "--user-agent", USER_AGENT]
    # Use the runtime's configured network route if a proxy is supplied.
    proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")
    if proxy:
        options += ["--proxy", proxy]
    expression = f"(rules => {{ {DOM} }})({json.dumps(check)})"
    try:
        if check.get("selector_timeout"):
            raw, error = inspect_dynamic_page(check, [binary, "mcp", *options], expression)
            if error:
                return None, error
        else:
            args = [binary, "fetch", "--quiet", *options, "--timeout", "23", "--wait", "1",
                    "--wait-until", "domcontentloaded"]
            if capture:
                args += ["--screenshot", str(capture)]
            process = subprocess.run([*args, check["url"], "--eval", expression],
                                     capture_output=True, text=True, timeout=31)
            if process.returncode:
                if "robots.txt" in process.stderr.lower() and "disallow" in process.stderr.lower():
                    return None, "ملف robots.txt يمنع فتح الصفحة آليًا."
                return None, "تعذر تحميل الصفحة في Obscura."
            raw = process.stdout
            if capture:
                raw = json.loads(raw)["evaluation"]
        data = json.loads(raw)
        if not isinstance(data, dict) or not isinstance(data.get("title"), str):
            raise ValueError("Missing DOM evidence")
    except (OSError, subprocess.TimeoutExpired):
        return None, "انتهت مهلة المتصفح أو تعذر تشغيله."
    except (ValueError, TypeError, KeyError, IndexError):
        return None, "تعذرت قراءة نتيجة الصفحة من Obscura."
    return data, None


def inspect_dynamic_page(check, command, expression):
    messages = [
        {"id": 1, "method": "initialize", "params": {
            "protocolVersion": "2024-11-05", "capabilities": {},
            "clientInfo": {"name": "q8-ux-project-checks", "version": "1"},
        }},
        {"method": "notifications/initialized"},
    ]
    calls = [
        ("browser_navigate", {"url": check["url"], "waitUntil": "domcontentloaded"}),
        ("browser_wait_for", {"selector": check["selector"], "timeout": check["selector_timeout"]}),
        ("browser_evaluate", {"expression": expression}),
    ]
    for index, (name, args) in enumerate(calls, start=2):
        messages.append({"id": index, "method": "tools/call", "params": {"name": name, "arguments": args}})
    payload = "".join(json.dumps({"jsonrpc": "2.0", **message}) + "\n" for message in messages)
    process = subprocess.run(command, input=payload, capture_output=True, text=True, timeout=50)
    if process.returncode:
        return None, "تعذر تشغيل متصفح Obscura للفحص الديناميكي."
    replies = {message.get("id"): message for message in map(json.loads, process.stdout.splitlines())}
    for index in range(2, 5):
        result = replies[index].get("result", {})
        if result.get("isError") or "error" in replies[index]:
            if index == 2 and "robots.txt" in str(result).lower():
                return None, "ملف robots.txt يمنع فتح الصفحة آليًا."
            if index == 3:
                return None, "لم يظهر عنصر الصفحة المتوقع ضمن المهلة."
            return None, "تعذر فحص الصفحة الديناميكية في Obscura."
    return replies[4]["result"]["content"][0]["text"], None


def run_check(project, check, binary, screenshots):
    result = {
        "project": project["name"], "source": SOURCE_ROOT + project["source"],
        "id": check["id"], "name": check["name"], "url": check["url"],
    }

    def outcome(state, message, **fields):
        return {**result, "state": state, "message": message, **fields}

    field = check.get("json_field")
    status, version, error = http_status(check["url"], field, "GET" if field else "HEAD")
    if not field and status in {405, 501}:
        status, _, _ = http_status(check["url"], method="GET")
    result["http"] = status
    if status in ACCESS_LIMITS:
        return outcome("blocked", f"أعاد الخادم HTTP {status}.")
    if status is None and field:
        return outcome("unknown", "تعذر الاتصال بنقطة الإصدار ضمن المهلة.")
    if status is not None and not 200 <= status < 300:
        return outcome("fail", f"أعاد الخادم HTTP {status}.")
    if field:
        if error:
            return outcome("fail", error)
        return outcome("pass", "أعاد التطبيق معرّف إصدار صالحًا.", version=version)

    image = screenshots / f"{check['id']}.png" if screenshots and check.get("screenshot") else None
    if image:
        image.unlink(missing_ok=True)
    data, error = inspect_dom(check, binary, image)
    if data is None and image:
        image.unlink(missing_ok=True)
        image = None
        data, error = inspect_dom(check, binary, None)
    if data is None:
        state = "blocked" if "robots.txt" in error else "unknown"
        return outcome(state, error)

    missing = []
    if check["title"].casefold() not in data["title"].casefold():
        missing.append("عنوان الصفحة")
    if not data["found"]:
        missing.append("عنصر الصفحة المتوقع")
    if any(check.get(key) is not None and check[key] != data[key] for key in ("lang", "dir")):
        missing.append("لغة الصفحة أو اتجاهها")
    if check.get("frame_url") and check["frame_url"] != data["frame"]:
        missing.append("وجهة التطبيق المضمّن")
    if check.get("source_selector") and not data["sources"]:
        missing.append("روابط المقال")
    image_fields = {"screenshot": f"screenshots/{image.name}"} if image and image.is_file() else {}
    if missing:
        return outcome("fail", "تعذر التحقق من " + "، ".join(missing) + ".", **image_fields)
    if status is None:
        return outcome("unknown", "ظهر المحتوى المتوقع في Obscura وتعذر تأكيد حالة HTTP.", **image_fields)
    message = "ظهرت العلامات المتوقعة في الصفحة."
    if screenshots and check.get("screenshot") and not image_fields:
        message += " تعذر التقاط الصورة."
    if data["matches"] is not None:
        message += f" عدد العناصر المطابقة: {data['matches']}."
        image_fields["matches"] = data["matches"]
    if data["sources"] is not None:
        links = list({link["href"]: link for link in data["sources"]}.values())
        message += f" جُمعت {len(links)} روابط خارجية من المقال."
        return outcome("pass", message, sources=links, **image_fields)
    return outcome("pass", message, **image_fields)


def report_markdown(report):
    lines = [
        "# فحص المشاريع باستخدام Obscura", "",
        f"{report['engine']} · {report['checked_at']}", "",
        "| المشروع | الفحص | النتيجة | HTTP | الملاحظة |", "| --- | --- | --- | --- | --- |",
    ]
    for item in report["results"]:
        project = f"[{item['project']}]({item['source']})"
        state = STATE_LABELS[item["state"]]
        note = item["message"]
        if item.get("screenshot"):
            note += f" [الصورة]({item['screenshot']})"
        lines.append(f"| {project} | {item['name']} | {state} | {item['http'] or '—'} | {note} |")
    lines += ["", "فحوص واجهات عامة وعلامات نشر. يحتاج اختبار الميكروفون، الأدوار، الطلبات المدفوعة وتوليد المحتوى إلى بيئات اختبار المشروع.", ""]
    return "\n".join(lines)


def main():
    projects = json.loads((HERE / "projects.json").read_text(encoding="utf-8"))
    parser = argparse.ArgumentParser(description="Check public pages of Saad's projects using Obscura.")
    parser.add_argument("project", choices=["all", *projects], nargs="?", default="all")
    parser.add_argument("--binary", default="obscura")
    parser.add_argument("--output", type=Path, default=Path("obscura-report"))
    parser.add_argument("--screenshots", action="store_true")
    args = parser.parse_args()
    try:
        version = subprocess.check_output([args.binary, "--version"], text=True, timeout=8).strip()
    except (OSError, subprocess.SubprocessError) as error:
        parser.error(f"Could not start Obscura: {type(error).__name__}")

    # Use fresh browser profiles and a bounded batch of known public URLs.
    os.environ.pop("OBSCURA_ALLOW_PRIVATE_NETWORK", None)
    args.output.mkdir(parents=True, exist_ok=True)
    screenshots = args.output / "screenshots" if args.screenshots else None
    if screenshots:
        screenshots.mkdir(exist_ok=True)
    selected = projects.values() if args.project == "all" else [projects[args.project]]
    targets = [(project, check) for project in selected for check in project["checks"]]
    with ThreadPoolExecutor(max_workers=3) as pool:
        futures = [pool.submit(run_check, project, check, args.binary, screenshots) for project, check in targets]
        results = [future.result() for future in futures]

    report = {"engine": version, "checked_at": datetime.now(ZoneInfo("Asia/Kuwait")).isoformat(), "results": results}
    (args.output / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    summary = report_markdown(report)
    (args.output / "report.md").write_text(summary, encoding="utf-8")
    print(summary)
    return 0 if all(item["state"] == "pass" for item in results) else 1


if __name__ == "__main__":
    raise SystemExit(main())

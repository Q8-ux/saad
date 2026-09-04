from pathlib import Path


def test_render_blueprint_uses_project_root():
    blueprint = Path(__file__).parents[1] / "render.yaml"
    content = blueprint.read_text(encoding="utf-8")

    assert "name: ai-chess-kuwait" in content
    assert "rootDir: ai-chess-python" in content
    assert "buildCommand: pip install -r requirements.txt" in content
    assert "startCommand: uvicorn app.main:app" in content
    assert "healthCheckPath: /health" in content

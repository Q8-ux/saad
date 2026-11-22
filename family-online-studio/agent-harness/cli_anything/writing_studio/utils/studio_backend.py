import hashlib
import io
import json
import os
import shutil
import subprocess
import tempfile
import zipfile
from pathlib import Path
from ..core.project import atomic_write


def invoke_backend(payload):
    node = shutil.which('node')
    runtime = Path(__file__).resolve().parents[1] / 'runtime' / 'studio-backend.mjs'
    if not node or not runtime.is_file():
        raise ValueError('Node.js 22+ and the bundled Writing Studio runtime are required.')
    # Authentication remains in the Python gateway client, not the renderer.
    environment = {k: v for k, v in os.environ.items() if k not in (
        'STUDIO_SESSION_TOKEN', 'NODE_OPTIONS', 'NODE_PATH')}
    try:
        result = subprocess.run([node, str(runtime)], input=json.dumps(payload, ensure_ascii=False),
                                capture_output=True, text=True, timeout=180, env=environment)
    except subprocess.TimeoutExpired:
        raise ValueError('Document export timed out; export a smaller scope.') from None
    try:
        value = json.loads(result.stdout)
    except (ValueError, TypeError):
        raise ValueError('The native document backend did not return a valid result.') from None
    if result.returncode or not value.get('ok'):
        raise ValueError(value.get('error', 'Native document export failed.'))
    return value


def export_document(document, output, scope, split, kind, overwrite, illustrations_dir=None):
    if Path(output).exists() and not overwrite:
        raise ValueError('Output already exists; use --overwrite explicitly.')
    if Path(output).is_symlink():
        raise ValueError('Refusing to replace a symbolic link.')
    expected = {'package': '.zip', 'pdf': '.pdf', 'docx': '.docx'}[kind]
    if Path(output).suffix.lower() != expected:
        raise ValueError('Output extension must be ' + expected)
    with tempfile.TemporaryDirectory(prefix='studio-export-') as directory:
        temporary = Path(directory) / ('output' + expected)
        receipt = invoke_backend({'command': 'export', 'document': document, 'scope': scope,
                                  'splitEpisodes': split, 'kind': kind, 'output': str(temporary),
                                  'illustrationsDir': illustrations_dir})
        data = temporary.read_bytes()
        digest = hashlib.sha256(data).hexdigest()
        if receipt.get('sha256') != digest or receipt.get('bytes') != len(data):
            raise ValueError('Export receipt does not match the actual output.')
        if expected in ('.zip', '.docx'):
            with zipfile.ZipFile(io.BytesIO(data)) as archive:
                if archive.testzip() is not None:
                    raise ValueError('Export ZIP integrity check failed.')
                required = 'manifest.json' if expected == '.zip' else 'word/document.xml'
                if required not in archive.namelist():
                    raise ValueError('Export package is incomplete.')
        elif not data.startswith(b'%PDF-') or b'%%EOF' not in data[-40:]:
            raise ValueError('PDF export is incomplete.')
        final = atomic_write(output, data, overwrite)
        return {**receipt, 'output': final}

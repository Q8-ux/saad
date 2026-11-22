import hashlib
import io
import json
import os
import re
from pathlib import Path
import shutil
import subprocess
import xml.etree.ElementTree as ET
import zipfile
import fitz
import pytest


def _resolve_cli():
    executable = shutil.which('cli-anything-writing-studio')
    if not executable:
        raise RuntimeError('Install cli-anything-writing-studio before testing its real backend.')
    return executable


class TestCLISubprocess:
    @staticmethod
    def run(*args, success=True):
        result = subprocess.run([_resolve_cli(), '--json', *map(str, args)], capture_output=True, text=True, timeout=90)
        assert result.returncode == (0 if success else 1), result.stdout + result.stderr
        return json.loads(result.stdout)

    def test_installed_help(self):
        result = subprocess.run([_resolve_cli(), '--help'], capture_output=True, text=True, timeout=10)
        assert result.returncode == 0 and 'export' in result.stdout

    def test_inspect_uses_real_validator(self, source):
        result = self.run('project', 'inspect', '--input', source)
        assert result['ok'] and result['scenes'] == 3
        assert 'PRIVATE_' not in json.dumps(result)

    def test_episode_package_real_pdf_docx(self, source, tmp_path):
        before = source.read_bytes()
        output = tmp_path / 'episodes.zip'
        receipt = self.run('export', 'package', '--input', source, '--output', output, '--split-episodes')
        assert receipt['backend'] == 'writing-studio-native' and receipt['files'] == 4
        assert receipt['sha256'] == hashlib.sha256(output.read_bytes()).hexdigest()
        with zipfile.ZipFile(output) as package:
            manifest = json.loads(package.read('manifest.json'))
            assert [target['ids'] for target in manifest['targets']] == [['scene1', 'scene2'], ['scene3']]
            for item in manifest['files']:
                data = package.read(item['name'])
                assert hashlib.sha256(data).hexdigest() == item['sha256']
                if item['name'].endswith('.pdf'):
                    with fitz.open(stream=data, filetype='pdf') as pdf:
                        text = ''.join(page.get_text() for page in pdf)
                        assert len(pdf) >= 2 and 'PRIVATE_' not in text
                        assert abs(pdf[0].rect.width - 595.28) < 1
                        assert any('Amiri' in font[3] for page in pdf for font in page.get_fonts())
                        streams = b'\n'.join(pdf.xref_stream(xref) for page in pdf for xref in page.get_contents())
                        logical = ' '.join(bytes.fromhex(value.decode()).decode('utf-16') for value in re.findall(rb'/ActualText\s*<([A-Fa-f0-9]+)>', streams))
                        expected = ('1', '2') if item['name'].startswith('01') else ('3',)
                        for n in expected:
                            assert 'حوار التجربة ' + n + ' ثابت' in ' '.join(logical.split())
                else:
                    with zipfile.ZipFile(io.BytesIO(data)) as docx:
                        xml = docx.read('word/document.xml')
                        root = ET.fromstring(xml)
                        text = ''.join(root.itertext())
                        assert 'PRIVATE_' not in text and 'قطع' in text
                        expected = ('1', '2') if item['name'].startswith('01') else ('3',)
                        for n in expected:
                            assert 'حوار التجربة ' + n + ' ثابت' in text
                        other = ('3',) if expected == ('1', '2') else ('1', '2')
                        for n in other:
                            assert 'حوار التجربة ' + n + ' ثابت' not in text
                        assert b'<w:tbl>' in xml and 'word/fonts/regular.odttf' in docx.namelist()
        assert source.read_bytes() == before
        print('Verified native delivery:', output)

    def test_scene_scope_and_no_clobber(self, source, tmp_path):
        output = tmp_path / 'scene.docx'
        self.run('export', 'document', '--input', source, '--output', output, '--scope', 'scene:scene2', '--format', 'docx')
        before = output.read_bytes()
        with zipfile.ZipFile(output) as archive:
            text = ''.join(ET.fromstring(archive.read('word/document.xml')).itertext())
            assert 'حوار التجربة 2 ثابت' in text and 'حوار التجربة 1 ثابت' not in text
        assert not self.run('export', 'document', '--input', source, '--output', output, '--format', 'docx', success=False)['ok']
        assert output.read_bytes() == before

    @pytest.mark.parametrize('scope', ['scene:absent', 'unit:absent', 'part:absent', 'unknown'])
    def test_invalid_scope_cannot_create_output(self, source, tmp_path, scope):
        output = tmp_path / 'invalid.zip'
        assert not self.run('export', 'package', '--input', source, '--output', output, '--scope', scope, success=False)['ok']
        assert not output.exists()

    def test_no_missing_or_duplicate_scenes(self, manuscript, tmp_path):
        source = tmp_path / 'missing.json'
        manuscript['scenes'][0].pop('unitId')
        source.write_text(json.dumps(manuscript))
        result = self.run('export', 'package', '--input', source, '--output', tmp_path / 'bad.zip', '--split-episodes', success=False)
        assert not result['ok']

    def test_play_keeps_continuous_stage_format(self, manuscript, tmp_path):
        manuscript['kind'] = 'play'
        source, output = tmp_path / 'play.json', tmp_path / 'play.docx'
        source.write_text(json.dumps(manuscript))
        self.run('export', 'document', '--input', source, '--output', output, '--format', 'docx')
        with zipfile.ZipFile(output) as archive:
            xml = archive.read('word/document.xml')
            text = ''.join(ET.fromstring(xml).itertext())
            assert b'<w:tbl>' not in xml
            assert 'شخصية التجربة: ' in text
            assert text.index('حوار التجربة 1 ثابت') < text.index('حوار التجربة 2 ثابت') < text.index('حوار التجربة 3 ثابت')

    @pytest.mark.parametrize('language', ['ar', 'en'])
    def test_book_a5_and_private_notes(self, tmp_path, language):
        book = {'schemaVersion': 1, 'kind': 'book', 'language': language, 'title': 'كتاب اختبار' if language == 'ar' else 'Test Book', 'subtitle': '', 'author': 'Test Author', 'edition': '', 'frontMatter': [], 'notes': 'PRIVATE_BOOK_NOTE', 'chapters': [{'id': 'chapter', 'title': 'الفصل' if language == 'ar' else 'Chapter', 'blocks': [{'id': 'paragraph', 'type': 'paragraph', 'text': 'نص الكتاب محفوظ' if language == 'ar' else 'The original book text is preserved.'}], 'notes': 'PRIVATE_CHAPTER_NOTE'}]}
        source, output = tmp_path / 'book.json', tmp_path / 'book.zip'
        source.write_text(json.dumps(book))
        assert self.run('export', 'package', '--input', source, '--output', output)['files'] == 2
        with zipfile.ZipFile(output) as archive:
            pdfdata = archive.read(next(n for n in archive.namelist() if n.endswith('.pdf')))
            with fitz.open(stream=pdfdata, filetype='pdf') as pdf:
                assert abs(pdf[0].rect.width - 419.53) < 1
                assert 'PRIVATE_' not in ''.join(p.get_text() for p in pdf)

    def test_illustrations_are_never_silently_dropped(self, tmp_path):
        book = {'schemaVersion': 1, 'kind': 'book', 'language': 'en', 'title': 'Illustrated Book', 'subtitle': '', 'author': '', 'edition': '', 'frontMatter': [], 'notes': '', 'chapters': [{'id': 'chapter', 'title': 'Chapter', 'illustration': {'src': '/studio/books/test/image.png', 'alt': 'Test image'}, 'blocks': []}]}
        source = tmp_path / 'book.json'
        source.write_text(json.dumps(book))
        result = self.run('export', 'package', '--input', source, '--output', tmp_path / 'missing.zip', success=False)
        assert 'illustrations-dir' in result['error']

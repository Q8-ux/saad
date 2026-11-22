import json
import pytest


@pytest.fixture
def manuscript():
    return {
        'schemaVersion': 1, 'kind': 'series', 'title': 'تجربة مستقلة',
        'contentRevision': 'synthetic', 'targetMinutes': 0,
        'englishTitle': '', 'subtitle': '', 'author': 'كاتب التجربة',
        'edition': '', 'audience': '', 'durationNote': '', 'synopsis': '',
        'notes': 'PRIVATE_WORK_NOTE', 'sourceProject': {'raw': 'PRIVATE_SOURCE'},
        'units': [{'id': 'ep2', 'title': 'الحلقة الثانية', 'summary': ''},
                  {'id': 'ep1', 'title': 'الحلقة الأولى', 'summary': ''}],
        'characters': [{'id': 'person', 'name': 'شخصية التجربة', 'role': '',
                        'age': '', 'bio': '', 'color': '#17324d'}],
        'comments': [{'id': 'comment', 'sceneId': 'scene1', 'text': 'PRIVATE_COMMENT',
                      'resolved': False, 'createdAt': ''}],
        'scenes': [{
            'id': 'scene' + str(n), 'title': 'عنوان المشهد ' + str(n),
            'unitId': 'ep1' if n < 3 else 'ep2', 'minutes': 1,
            'location': 'غرفة التجربة', 'time': 'ليل', 'summary': 'PRIVATE_SUMMARY',
            'status': 'draft', 'notes': 'PRIVATE_SCENE_NOTE',
            'blocks': [
                {'id': 'action' + str(n), 'type': 'action', 'text': 'وصف التجربة ' + str(n)},
                {'id': 'dialogue' + str(n), 'type': 'dialogue', 'characterId': 'person',
                 'text': 'حوار التجربة ' + str(n) + ' ثابت'},
                {'id': 'cut' + str(n), 'type': 'transition', 'text': 'قطع'},
            ],
        } for n in (1, 2, 3)],
    }


@pytest.fixture
def source(tmp_path, manuscript):
    target = tmp_path / 'source.json'
    target.write_text(json.dumps({'doc': manuscript, 'revision': 7}, ensure_ascii=False), encoding='utf-8')
    return target

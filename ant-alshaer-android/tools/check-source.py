import pathlib,re,xml.etree.ElementTree as ET
root=pathlib.Path(__file__).resolve().parents[1]
manifest=ET.parse(root/'app/src/main/AndroidManifest.xml').getroot();a='{http://schemas.android.com/apk/res/android}'
permissions={x.attrib[a+'name']for x in manifest.findall('uses-permission')}
assert permissions=={'android.permission.INTERNET','android.permission.ACCESS_NETWORK_STATE','android.permission.RECORD_AUDIO'},permissions
assert manifest.find('application').attrib[a+'usesCleartextTraffic']=='false'
assert manifest.find('application').attrib[a+'allowBackup']=='false'
source=(root/'app/src/main/java/com/q8ux/antalshaer/MainActivity.java').read_text()
assert 'addJavascriptInterface'not in source
assert 'handler.cancel()'in source and 'handler.proceed()'not in source
for path in (root/'app/src/main').rglob('*'):
    if path.is_file():
        text=path.read_text()
        assert not re.search(r'sk-proj-[A-Za-z0-9_-]{20,}|OAI-Sites-Authorization|EXTERNAL_STUDIO_BRIDGE_KEY',text),path
print('Manifest, permissions, TLS and secret-exclusion checks passed')

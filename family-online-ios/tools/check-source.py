from pathlib import Path
import plistlib
import re
import json
root=Path(__file__).resolve().parents[1]
info=plistlib.loads((root/'Sources/WritingStudio/Info.plist').read_bytes())
assert info.get('NSMicrophoneUsageDescription')
assert 'NSCameraUsageDescription' not in info
assert not info.get('NSAppTransportSecurity',{}).get('NSAllowsArbitraryLoads',False)
sources='\n'.join(p.read_text() for p in (root/'Sources').rglob('*.swift'))
assert 'message.frameInfo.isMainFrame' in sources
assert 'StudioPolicy.appURL(webView.url)' in sources
assert not re.search(r'sk-(?:proj-)?[A-Za-z0-9_-]{20,}',sources)
assert 'serverTrust' not in sources
assert not list(root.rglob('*.p12')) and not list(root.rglob('*.mobileprovision'))
icons=json.loads((root/'Sources/WritingStudio/Assets.xcassets/AppIcon.appiconset/Contents.json').read_text())
for item in icons['images']: assert (root/'Sources/WritingStudio/Assets.xcassets/AppIcon.appiconset'/item['filename']).is_file()
print('iOS microphone purpose, HTTPS, bridge guards, icon files and secret exclusions passed')

"""Behavior tests for content integrity, page splitting, and source adapters."""
import copy
import json
import tempfile
import unittest
from pathlib import Path

from format_screenplay import ROOT, Style, paginate, format_file
from screenplay_io import from_blocks, from_fdx, validate_source


def fixture():
    return json.loads((ROOT / "assets/example.json").read_text(encoding="utf-8"))


class FormattingTests(unittest.TestCase):
    def test_long_synchronized_dialogue_and_action_preserve_words(self):
        source = fixture()
        long = "أُغلق الباب، ثم انتظرنا جواباً واضحاً. " * 180
        source["episodes"][0]["scenes"] = [{
            "number": "10", "location": "غرفة الانتظار", "interior": "داخلي", "time": "نهار",
            "beats": [{"character": "أم عبدالله", "dialogue": long, "action": long},
                      {"transition": "قطع"}],
        }]
        pages = paginate(source, Style().validate())
        self.assertGreater(len(pages), 5)
        items = [i for p in pages for i in p["items"] if i["kind"] == "beat"]
        for key in ("dialogue", "action"):
            self.assertEqual(long.split(), " ".join(" ".join(i["fields"][key]) for i in items).split())
        self.assertEqual(sum(bool(i["fields"]["character"]) for i in items), 1)
        self.assertTrue(all(p["used"] <= (297 - 25 - 20) * 72 / 25.4 - 18 + .01 for p in pages if not p["cover"]))

    def test_multiple_episodes_get_distinct_covers_and_continuous_numbers(self):
        source = fixture()
        source["first_page_number"] = 75
        episode = copy.deepcopy(source["episodes"][0])
        episode.update(number="2", label="الحلقة الثانية")
        source["episodes"].append(episode)
        pages = paginate(source, Style())
        self.assertEqual([p["episode"] for p in pages if p["cover"]], ["1", "2"])
        self.assertEqual([p["number"] for p in pages], list(range(75, 75 + len(pages))))

    def test_fdx_keeps_fragmented_text_and_parenthetical_position(self):
        source = from_fdx('''<FinalDraft><Content>
        <Paragraph Type="Scene Heading" Number="7"><Text>داخلي - المكتب - نهار</Text></Paragraph>
        <Paragraph Type="Character"><Text>سالم</Text></Paragraph>
        <Paragraph Type="Dialogue"><Text>انتظر </Text><Text>هنا.</Text></Paragraph>
        <Paragraph Type="Parenthetical"><Text>(بهدوء)</Text></Paragraph>
        <Paragraph Type="Dialogue"><Text>سأعود.</Text></Paragraph>
        <Paragraph Type="Transition"><Text>قطع</Text></Paragraph>
        </Content><TitlePage><Content><Paragraph><Text>اختبار</Text></Paragraph></Content></TitlePage></FinalDraft>''')
        scene = source["episodes"][0]["scenes"][0]
        self.assertEqual(scene["number"], "7")
        self.assertEqual(scene["beats"][0]["dialogue"], "انتظر هنا.")
        self.assertEqual(scene["beats"][1]["parenthetical"], "(بهدوء)")
        self.assertEqual(scene["beats"][1]["dialogue"], "سأعود.")
        self.assertEqual(scene["beats"][-1]["transition"], "قطع")

    def test_studio_does_not_invent_synchronized_action(self):
        source = from_blocks({"version": 2, "title": "اختبار", "blocks": [
            {"type": "Scene Heading", "text": "داخلي - البيت - مساء"},
            {"type": "Action", "text": "يدخل إلى الغرفة."},
            {"type": "Character", "text": "راشد"},
            {"type": "Dialogue", "text": "أين الرسالة؟"},
        ]})
        beats = source["episodes"][0]["scenes"][0]["beats"]
        self.assertEqual(beats[0], {"action": "يدخل إلى الغرفة."})
        self.assertNotIn("action", beats[1])

    def test_orphan_dialogue_and_xml_entities_fail_explicitly(self):
        with self.assertRaises(ValueError):
            from_blocks({"title": "اختبار", "blocks": [{"type": "Dialogue", "text": "حوار"}]})
        with self.assertRaises(ValueError):
            from_fdx('<!DOCTYPE x [<!ENTITY a "value">]><FinalDraft/>')
        source = fixture()
        source["episodes"][0]["scenes"][0]["beats"][0]["action"] = "نص\x00"
        with self.assertRaises(ValueError):
            validate_source(source)


if __name__ == "__main__":
    unittest.main(verbosity=2)

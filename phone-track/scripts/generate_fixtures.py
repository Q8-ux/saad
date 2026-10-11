"""Reference cases are public numbering-plan examples, not user phone numbers."""
import json
from pathlib import Path
import phonenumbers as pn
from phonenumbers import timezone
types = {pn.PhoneNumberType.MOBILE: "MOBILE", pn.PhoneNumberType.FIXED_LINE: "FIXED_LINE", pn.PhoneNumberType.FIXED_LINE_OR_MOBILE: "FIXED_LINE_OR_MOBILE", pn.PhoneNumberType.TOLL_FREE: "TOLL_FREE", pn.PhoneNumberType.VOIP: "VOIP", pn.PhoneNumberType.PREMIUM_RATE: "PREMIUM_RATE", pn.PhoneNumberType.SHARED_COST: "SHARED_COST", pn.PhoneNumberType.PERSONAL_NUMBER: "PERSONAL_NUMBER", pn.PhoneNumberType.PAGER: "PAGER", pn.PhoneNumberType.UAN: "UAN", pn.PhoneNumberType.VOICEMAIL: "VOICEMAIL"}
fixtures = {}
for region in pn.SUPPORTED_REGIONS:
    for requested in (pn.PhoneNumberType.MOBILE, pn.PhoneNumberType.FIXED_LINE, pn.PhoneNumberType.TOLL_FREE, pn.PhoneNumberType.VOIP):
        number = pn.example_number_for_type(region, requested)
        if not number or not pn.is_valid_number(number):
            continue
        e164 = pn.format_number(number, pn.PhoneNumberFormat.E164)
        fixtures[e164] = {"e164": e164, "country": pn.region_code_for_number(number), "type": types[pn.number_type(number)], "timezones": [zone for zone in timezone.time_zones_for_number(number) if zone != "Etc/Unknown"]}
target = Path(__file__).resolve().parents[1] / "tests/fixtures.json"
target.write_text(json.dumps(list(fixtures.values()), sort_keys=True) + "\n")
print(f"Prepared {len(fixtures)} public reference examples.")

"""Release checks for the Sabeq appointment capacity migration and office-only navigation."""
from pathlib import Path
import sqlite3
import re
import unittest

ROOT=Path(__file__).resolve().parents[2]
class AppointmentReleaseTests(unittest.TestCase):
    def test_booking_capacity_enforced_atomically(self):
        sql=(ROOT/"sabeq-legal/research-source/drizzle/0008_consultation_bookings.sql").read_text()
        db=sqlite3.connect(":memory:")
        db.executescript(sql)
        statement="""INSERT INTO consultation_bookings
          (id,slot_date,slot_time,name,phone,email,case_type,preferred_contact,message,language,status)
          SELECT ?, '2026-12-15','10:00','TEST','12345678','test@example.invalid','test','email','','ar','pending'
          WHERE (SELECT COUNT(*) FROM consultation_bookings WHERE slot_date='2026-12-15' AND slot_time='10:00' AND status != 'cancelled') < 2
            AND (SELECT COUNT(*) FROM consultation_bookings WHERE slot_date='2026-12-15' AND status != 'cancelled') < 2"""
        self.assertEqual(db.execute(statement,("synthetic-1",)).rowcount,1)
        self.assertEqual(db.execute(statement,("synthetic-2",)).rowcount,1)
        self.assertEqual(db.execute(statement,("synthetic-3",)).rowcount,0)
        db.execute("UPDATE consultation_bookings SET status='cancelled' WHERE id='synthetic-1'")
        self.assertEqual(db.execute(statement,("synthetic-3",)).rowcount,1)
        self.assertEqual(db.execute("SELECT COUNT(*) FROM consultation_bookings WHERE status!='cancelled'").fetchone()[0],2)

    def test_only_relevant_navigation_is_visible(self):
        src=(ROOT/"sabeq-admin-preview/admin.js").read_text()
        match=re.search(r"const groups=(\[\[.*?\]\]);",src)
        self.assertIsNotNone(match)
        self.assertIn("'overview','inbox','memos'",match.group(1))
        self.assertIn("'users','appointments'",match.group(1))
        self.assertNotIn("'payments'",match.group(1))
        self.assertNotIn("'mobileqa'",match.group(1))
        self.assertNotIn("'cases'",match.group(1))
        self.assertIn("visibleSections.has(requestedSection)",src)
    def test_customer_booking_requires_available_slot(self):
        src=(ROOT/"sabeq-legal/research-source/app/sabeq-site.tsx").read_text()
        self.assertIn('"/api/consultations/availability"',src)
        self.assertIn('name="slotDate"',src)
        self.assertIn('name="slotTime"',src)
        self.assertIn('disabled={bookingDisabled}',src)
        self.assertIn('name === "booking"',src)
    def test_dedicated_modules_are_mirrored(self):
        for filename in ("admin.js","admin.css","index.html","appointments.js","mobileqa.js"):
            a=(ROOT/"sabeq-admin-preview"/filename).read_bytes()
            b=(ROOT/"sabeq-legal/research-source/public/management"/filename).read_bytes()
            self.assertEqual(a,b,filename)

if __name__=="__main__":
    unittest.main()

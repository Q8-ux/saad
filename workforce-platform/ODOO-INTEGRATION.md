# Odoo integration direction

Use the workforce API as the attendance source and map employee identifiers, check-in, check-out, location, shift and worked-hour data into Odoo HR Attendance.

Before implementation, confirm the deployed Odoo edition and API availability, then add idempotency keys, retry handling, sync logs and an employee-mapping table.

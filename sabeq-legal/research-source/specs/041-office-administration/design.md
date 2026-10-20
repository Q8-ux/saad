# Design decision

Operate the legal office with a restrained app layout: grouped scrollable right navigation, readable Arabic, clear service states, compact structured forms and table scrolling contained within named regions. Keep the official logo and navy/teal identity. The user explicitly requested a better font: this administration app now uses local IBM Plex Sans Arabic Regular (400) and SemiBold (600) WOFF2 from IBM/plex, with its unmodified OFL licence. No new application library or fabricated activity.

Taste style exceptions recorded before the reviewed rerun: hairline separators belong to real data lists, form/panel headings and navigation; mono applies only to literal Git commit identifiers; shadow applies to the actual notification overlay and the active-navigation marker; outlined-box belongs to forms and structured administrative surfaces, matching the selected minimalist app reference. These do not waive functional layout, contrast or font checks.

Measured contrast: primary text on white 11.94, muted text 5.42, primary button 6.10, sidebar secondary 8.20, active navigation 10.02, warning badge 6.51, success badge 6.37. fc-scan and fc-query verified actual font family, weights and Arabic/Latin/numeral coverage. A Pillow/RAQM specimen was rendered and inspected for joined Arabic. This is font QA, not a browser screenshot.

Managed control-browser is unavailable. No preview server or substitute browser path was used. Screenshots at phone/tablet/desktop widths and physical touch QA remain unverified.

The installed upstream linter does not implement its documented --allow option. The raw run retains the documented style findings; only the project-specific review is accepted, not an unmodified upstream pass.

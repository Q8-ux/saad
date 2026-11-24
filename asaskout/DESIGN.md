# Asas Kout design decisions

Audience: prospective construction clients in Kuwait. Primary action: prepare a useful project enquiry and choose WhatsApp or email after reviewing its contents.

Identity evidence: original logo and turquoise/grey from the supplied Reach page. New design decisions: dark teal `#123f3e`, readable action teal `#00847f`, stone white `#f5f6f2`, pale green grey `#e7efea`, ink `#153c3b`, body muted `#4e6664`. White text on the action teal measures 4.56:1; body muted on stone measures 5.68:1.

Direction: uneven architectural photographs, one governing visual system. The company's name, «أساس», becomes a foundation-led story: understanding → scope → details. The live interaction turns those requirements into a reviewed project enquiry. Large calm headings, generous space, original logo, staggered image sizes, flat rectangular actions, and a dark closing section. Adapted from existing Canva construction layouts and the local architecture direction planner, seed 42, `uneven-photographs`.

Arabic and English use locally hosted Cairo. Arabic remains connected, right aligned, with generous line height and no negative tracking. English reads left to right on its own static route. No fonts are added solely to imitate a template.

Native CSS transitions are sufficient. One opening photo reveal, control feedback and accordion state transitions; reduced-motion removes the reveal and smooth scrolling. No React migration, GSAP dependency, animated backdrop or decorative video was needed.

Fallbacks: primary contact links work without JavaScript; the enquiry wizard shows a direct-contact fallback. The native menu, modal focus handling, Escape, labelled form errors and actual buttons support keyboard use. Main content is visible without animation. A missing image retains its layout and an accessible alt rather than hiding an entire section.

The illustration labels are required until genuine project photos are supplied. No testimonial, metric or project portfolio has been fabricated to fill a layout. The company homepage is separate from the editable Canva concept; each remains independently editable.

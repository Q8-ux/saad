import { mkdir, rm, cp, writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { company as co, copy } from './content.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, 'dist');
await rm(dist, { recursive: true, force: true });
await mkdir(path.join(dist, 'en'), { recursive: true });
await cp(path.join(root, 'assets'), path.join(dist, 'assets'), { recursive: true });
const esc = s => String(s).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const lines = s => esc(s).replaceAll('\n', '<br>');
const icon = (name, cls='') => {
  const shapes = {
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    diagonal: '<path d="M6 18 18 6M6 6h12v12"/>',
    phone: '<path d="M6 3h4l2 5-3 2a15 15 0 0 0 5 5l2-3 5 2v4a3 3 0 0 1-3 3A18 18 0 0 1 3 6a3 3 0 0 1 3-3Z"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="1"/><path d="m3 6 9 7 9-7"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    whatsapp: '<path d="M20 11.5a8.5 8.5 0 0 1-12.8 7.3L3 20l1.2-4.2A8.5 8.5 0 1 1 20 11.5Z"/><path d="M8 7.5c0 4 2.5 6.5 6.5 7l1-2-2-1-1 1a7 7 0 0 1-2.5-2.5l1-1-1-2-2 .5Z"/>',
    expand: '<path d="M9 3H3v6M15 3h6v6M3 15v6h6M21 15v6h-6"/>',
  };
  return `<svg class="icon ${cls}" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[name]}</svg>`;
};

for (const lang of ['ar', 'en']) {
  const c = copy[lang], ar = lang === 'ar', p = ar ? './' : '../';
  const url = co.url + (ar ? '' : 'en/');
  const navIds = ['about','services','process','contact'];
  const nav = c.nav.map((n,i)=>`<a href="#${navIds[i]}">${esc(n)}</a>`).join('');
  const photo = (name, alt, cls='', eager=false) => `<img class="${cls}" src="${p}assets/${name}.jpg" srcset="${p}assets/${name}-small.jpg 700w, ${p}assets/${name}.jpg ${name==='villa'?1600:name==='structure'?1200:1000}w" sizes="(max-width:760px) 92vw, 45vw" alt="${esc(alt)}" width="${name==='villa'?1600:name==='structure'?1200:1000}" height="${name==='villa'?2400:name==='structure'?800:750}" ${eager?'fetchpriority="high"':'loading="lazy"'} decoding="async">`;
  const schema = {
    '@context':'https://schema.org','@type':'GeneralContractor',name:ar?'شركة أساس كوت لتشييد المباني':'Asas Kout Company General Contracting',url,email:co.email,telephone:'+96592222210',
    logo:co.url+'assets/logo.jpeg',address:{'@type':'PostalAddress',streetAddress:'Mubarak Al Kabeer Street, Mustathmer 2, 13th floor',addressLocality:'Sharq',addressCountry:'KW'},
    areaServed:{'@type':'Country',name:'Kuwait'},sameAs:[co.instagram,co.x,co.snapchat],hasMap:co.map,
  };
  const schemaJSON = JSON.stringify(schema).replaceAll('<','\\u003c');
  const schemaHash = createHash('sha256').update(schemaJSON).digest('base64');
  const html = `<!doctype html>
<html lang="${lang}" dir="${ar?'rtl':'ltr'}">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#123f3e"><meta name="color-scheme" content="light">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'sha256-${schemaHash}'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none'; upgrade-insecure-requests">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <title>${esc(c.title)}</title><meta name="description" content="${esc(c.description)}">
  <link rel="canonical" href="${url}"><link rel="alternate" hreflang="ar-KW" href="${co.url}"><link rel="alternate" hreflang="en-KW" href="${co.url}en/"><link rel="alternate" hreflang="x-default" href="${co.url}">
  <meta property="og:type" content="website"><meta property="og:locale" content="${ar?'ar_KW':'en_KW'}"><meta property="og:title" content="${esc(c.title)}"><meta property="og:description" content="${esc(c.description)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${co.url}assets/villa.jpg"><meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="${p}assets/logo.jpeg"><link rel="preload" href="${p}assets/fonts/cairo-400.ttf" as="font" type="font/ttf" crossorigin><link rel="stylesheet" href="${p}assets/styles.css">
  <script type="module" src="${p}assets/site.mjs"></script>
  <script type="application/ld+json">${schemaJSON}</script>
</head>
<body id="top">
<a class="skip" href="#main">${c.skip}</a>
<div class="topbar"><div class="wrap topbar-inner"><span>${c.top}</span><a href="tel:+96599807796">${c.topContact}<bdi>+965 9980 7796</bdi>${icon('phone')}</a></div></div>
<header class="header"><div class="wrap header-inner">
  <a class="brand" href="${ar?'./':'../en/'}" aria-label="${esc(c.brand)}"><img src="${p}assets/logo.jpeg" width="64" height="64" alt="${esc(c.brand)}"><span><strong>${c.brand}</strong><small>${c.descriptor}</small></span></a>
  <nav class="desktop-nav" aria-label="${ar?'القائمة الرئيسية':'Main navigation'}">${nav}</nav>
  <div class="header-actions"><a class="language" href="${ar?'./en/':'../'}" lang="${ar?'en':'ar'}" dir="${ar?'ltr':'rtl'}" aria-label="${c.languageLabel}">${c.language}</a><a class="button small header-cta" href="#inquiry">${c.quote}${icon('diagonal','directional')}</a><button class="menu-toggle icon-button" aria-expanded="false" aria-controls="mobile-nav" aria-label="${c.menu}">${icon('menu')}</button></div>
</div><nav id="mobile-nav" class="mobile-nav wrap" aria-label="${ar?'قائمة الجوال':'Mobile navigation'}" hidden>${nav}<a class="button" href="#inquiry">${c.quote}${icon('arrow','directional')}</a></nav></header>
<main id="main">
<section class="hero wrap" aria-labelledby="hero-title">
  <div class="hero-copy"><h1 id="hero-title">${c.hero.map(s=>`<span>${s}</span>`).join('')}</h1><p>${c.heroDescription}</p><a class="button hero-button" href="#inquiry">${c.heroAction}${icon('diagonal','directional')}</a><a class="text-link hero-secondary" href="#services">${c.heroSecondary}${icon('arrow','directional')}</a></div>
  <div class="hero-pictures"><figure class="hero-main">${photo('villa',c.imageAlt[0],'',true)}<button class="photo-expand icon-button" data-lightbox="villa" aria-label="${c.lightbox}">${icon('expand')}</button></figure><figure class="hero-detail">${photo('detail',c.imageAlt[1])}</figure><div class="photo-label"><span>${ar?'رؤية معمارية':'An architectural perspective'}</span><span>ASAS KOUT</span></div></div>
  <p class="hero-caption">${c.imageNote}</p>
</section>
<div class="foundation wrap" aria-label="${ar?'أساس رحلتنا معك':'The foundation of our approach'}">${c.foundation.map(s=>`<span>${icon('check')}${s}</span>`).join('')}<span class="foundation-end">${ar?'أساس كوت · الكويت':'Asas Kout · Kuwait'}</span></div>
<section id="about" class="about section wrap" aria-labelledby="about-title"><h2 id="about-title">${lines(c.aboutTitle)}</h2><div class="about-copy"><p class="lead">${c.aboutText}</p><p>${c.aboutText2}</p><a class="text-link" href="#contact">${c.aboutLink}${icon('arrow','directional')}</a></div></section>
<section id="services" class="services section" aria-labelledby="services-title"><div class="wrap services-layout"><div class="services-intro"><h2 id="services-title">${lines(c.servicesTitle)}</h2><p>${c.servicesIntro}</p><figure class="service-photo">${photo('structure',c.imageAlt[2])}<figcaption>${ar?'منهج يبدأ بفهم متطلبات البناء.':'An approach that starts with your building requirements.'}</figcaption></figure></div><div class="service-list">${c.services.map(([title,desc],i)=>`<article class="service"><h3>${title}</h3><p>${desc}</p><a class="text-link" href="#inquiry" data-service="${i===1?'management':i===2?'other':'construction'}">${c.serviceAction}${icon('diagonal','directional')}</a></article>`).join('')}</div></div></section>
<section class="details-section section wrap" aria-labelledby="details-title"><div class="details-copy"><h2 id="details-title">${lines(c.workTitle)}</h2><p>${c.workText}</p><a class="text-link" href="${co.instagram}" target="_blank" rel="noopener noreferrer">${c.workLink}${icon('diagonal','directional')}</a></div><figure class="details-photo">${photo('detail',c.imageAlt[1])}<button class="photo-expand icon-button" data-lightbox="detail" aria-label="${c.lightbox}">${icon('expand')}</button><figcaption>${c.workCaption}</figcaption></figure><p class="details-note">${c.imageNote}</p></section>
<section id="process" class="process section" aria-labelledby="process-title"><div class="wrap"><div class="section-head"><h2 id="process-title">${lines(c.processTitle)}</h2><p>${c.processIntro}</p></div><ol class="process-list">${c.steps.map(([title,desc])=>`<li><span class="process-dot" aria-hidden="true"></span><h3>${title}</h3><p>${desc}</p></li>`).join('')}</ol></div></section>
<section class="faq section wrap" aria-labelledby="faq-title"><h2 id="faq-title">${c.faqTitle}</h2><div class="faq-list">${c.faqs.map(([q,a])=>`<details><summary>${q}<span class="faq-icon">${icon('plus')}</span></summary><p>${a}</p></details>`).join('')}</div></section>
<section id="inquiry" class="inquiry section" aria-labelledby="inquiry-title"><div class="wrap inquiry-layout"><div class="inquiry-copy"><h2 id="inquiry-title">${lines(c.inquiryTitle)}</h2><p>${c.inquiryIntro}</p><a class="inquiry-phone" href="tel:+96592222210"><bdi>+965 9222 2210</bdi>${icon('diagonal','directional')}</a></div><div class="form-container"><form id="project-form" novalidate>
  <div id="form-error" class="form-error" role="alert" hidden></div><div class="form-grid">
  ${['name','phone','service','location','area','details'].map((id,i)=>`<div class="field ${i>3?'full':''}"><label for="${id}">${c.formLabels[i]}${i<4?` <span class="required-mark" aria-hidden="true">*</span>`:''}</label>${id==='service'?`<select id="service" name="service" required aria-describedby="${id}-error"><option value="">${c.formPlaceholders[i]}</option>${c.serviceOptions.map((n,j)=>`<option value="${['construction','management','other'][j]}">${n}</option>`).join('')}</select>`:id==='details'?`<textarea id="details" name="details" rows="3" maxlength="1600" placeholder="${c.formPlaceholders[i]}" aria-describedby="${id}-error"></textarea>`:`<input id="${id}" name="${id}" type="${id==='phone'?'tel':id==='area'?'text':'text'}" ${id==='phone'?'dir="ltr" inputmode="tel" autocomplete="tel"':id==='area'?'inputmode="decimal"':id==='name'?'autocomplete="name"':'autocomplete="address-level2"'} maxlength="${id==='phone'?24:id==='area'?12:100}" placeholder="${c.formPlaceholders[i]}" ${i<4?'required':''} aria-describedby="${id}-error">`}<span id="${id}-error" class="field-error" hidden></span></div>`).join('')}
  </div><button class="button form-submit" type="submit">${c.submit}${icon('arrow','directional')}</button><p class="form-note">${c.formNote}</p></form>
  <section id="request-preview" class="request-preview" aria-labelledby="preview-title" hidden><h3 id="preview-title" tabindex="-1">${c.previewTitle}</h3><p>${c.previewIntro}</p><pre id="message-preview"></pre><a id="send-whatsapp" class="button" target="_blank" rel="noopener noreferrer">${icon('whatsapp')}${c.whatsapp}</a><div class="preview-secondary"><a id="send-email" class="text-link">${c.emailAction}${icon('mail')}</a><button id="edit-request" class="text-link" type="button">${c.edit}</button></div></section>
  <noscript><p>${c.noScript}</p><a href="https://wa.me/96592222210">WhatsApp +965 92222210</a></noscript></div></div></section>
<section id="contact" class="contact section wrap" aria-labelledby="contact-title"><h2 id="contact-title">${c.contactTitle}</h2><div class="contact-grid"><div class="contact-address"><span class="contact-symbol">${icon('pin')}</span><h3>${c.addressTitle}</h3><p>${lines(c.address)}</p><a class="text-link" href="${co.map}" target="_blank" rel="noopener noreferrer">${c.directions}${icon('diagonal','directional')}</a><h3 class="email-title">${c.emailTitle}</h3><a class="email-link" href="mailto:${co.email}"><bdi>${co.email}</bdi></a></div><div class="contact-team">${co.phones.map((phone,i)=>`<div class="contact-person"><span>${c.contactRoles[i]}</span><a class="phone-number" href="tel:+965${phone}"><bdi>+965 ${phone.slice(0,4)} ${phone.slice(4)}</bdi></a><div class="contact-options"><a href="https://wa.me/965${phone}" target="_blank" rel="noopener noreferrer" aria-label="${c.contactWhatsapp} · ${c.contactRoles[i]}">${icon('whatsapp')}${c.contactWhatsapp}</a><a href="tel:+965${phone}" aria-label="${c.call} · ${c.contactRoles[i]}">${icon('phone')}${c.call}</a></div></div>`).join('')}</div></div></section>
</main>
<footer class="footer"><div class="wrap"><div class="footer-top"><div><h2>${c.footerLine}</h2><p>${c.footerDescription}</p></div><div><h3>${c.linksTitle}</h3><nav aria-label="${ar?'روابط التذييل':'Footer navigation'}">${nav}</nav></div><div><h3>${c.socialTitle}</h3><a href="${co.instagram}" target="_blank" rel="noopener noreferrer">Instagram ${icon('diagonal')}</a><a href="${co.x}" target="_blank" rel="noopener noreferrer">X ${icon('diagonal')}</a><a href="${co.snapchat}" target="_blank" rel="noopener noreferrer">Snapchat ${icon('diagonal')}</a></div></div><div class="footer-wordmark" aria-hidden="true">${ar?'أساس كوت':'Asas Kout'}</div><div class="footer-bottom"><small>© ${new Date().getUTCFullYear()} ${c.copyright}</small><div><button class="footer-legal" data-dialog="privacy">${c.privacy}</button><button class="footer-legal" data-dialog="credits">${c.credits}</button><a class="back-top icon-button" href="#top" aria-label="${c.backTop}">${icon('arrow')}</a></div></div></div></footer>
<a class="floating-whatsapp icon-button" href="https://wa.me/96592222210" target="_blank" rel="noopener noreferrer" aria-label="${ar?'تواصل مع أساس كوت على واتساب':'Contact Asas Kout on WhatsApp'}">${icon('whatsapp')}</a>
<dialog id="privacy-dialog" class="info-dialog"><div class="dialog-head"><h2>${c.privacyTitle}</h2><button class="icon-button dialog-close" aria-label="${c.close}">${icon('close')}</button></div><p>${c.privacyText}</p></dialog>
<dialog id="credits-dialog" class="info-dialog"><div class="dialog-head"><h2>${c.creditsTitle}</h2><button class="icon-button dialog-close" aria-label="${c.close}">${icon('close')}</button></div><p>${c.creditsText}</p><ul><li><a href="https://unsplash.com/photos/modern-white-house-with-dark-accents-and-fence-YCEJqQeEsYA" target="_blank" rel="noopener noreferrer">Valentin Lacoste · Unsplash</a></li><li><a href="https://unsplash.com/photos/modern-white-house-with-minimalist-landscaping-and-clean-design-GEkHoBMJxjs" target="_blank" rel="noopener noreferrer">Ellen Qin · Unsplash</a></li><li><a href="https://unsplash.com/photos/construction-site-with-complex-concrete-structures-and-scaffolding-OKZRUxijthA" target="_blank" rel="noopener noreferrer">Julia Taubitz · Unsplash</a></li></ul></dialog>
<dialog id="photo-dialog" class="photo-dialog"><button class="icon-button dialog-close" aria-label="${c.close}">${icon('close')}</button><img id="large-photo" alt=""><p>${c.imageNote}</p></dialog>
</body></html>`;
  await writeFile(path.join(dist, ar?'index.html':'en/index.html'), html);
  await writeFile(path.join(dist, 'assets', `locale-${lang}.json`), JSON.stringify(c));
  await writeFile(path.join(dist, 'assets', `business-${lang}.jsonld`), JSON.stringify(schema));
}
await writeFile(path.join(dist,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${['','en/'].map(s=>`<url><loc>${co.url}${s}</loc><xhtml:link rel="alternate" hreflang="ar-KW" href="${co.url}"/><xhtml:link rel="alternate" hreflang="en-KW" href="${co.url}en/"/></url>`).join('')}</urlset>`);
await writeFile(path.join(dist,'release.json'),JSON.stringify({version:'asaskout-20261124-v1',languages:['ar','en'],contact:co.email},null,2));
console.log('Built Arabic and English static pages with local assets.');

import {escapeHTML as esc} from './core.mjs?v=1.4.0';
import {getLocale} from './i18n.mjs?v=1.4.0';
import {tourText} from './tour-copy.mjs?v=1.5.1';

// Public, attributed capture examples. These are never office property records.
// Capture claims and source sizes were checked on 2026-10-31. See docs/tour-samples.md.
export const SAMPLE_LICENSE = 'https://creativecommons.org/licenses/by/4.0/';
export const TOUR_SAMPLES = Object.freeze([
  {
    id: 'living-room-phone', sceneId: '6d299095', creator: 'oksilat',
    originalTitle: 'Living room table', sizeMB: 13.21,
    sourceUrl: 'https://superspl.at/scene/6d299095',
    posterUrl: 'https://s3-eu-west-1.amazonaws.com/images.playcanvas.com/splat/6d299095/v1/xl.webp',
    title: ['جزء من غرفة معيشة', 'Living room detail', 'رہنے کے کمرے کا ایک حصہ'],
    description: ['التقاط حقيقي بـiPhone 13 Pro Max من فيديو مدته دقيقتان. يغطي جزءاً من الغرفة، وهو أصغر أمثلتنا حجماً.', 'Captured with an iPhone 13 Pro Max from a two-minute video. A partial room capture and our smallest example.', 'iPhone 13 Pro Max کی دو منٹ کی ویڈیو سے حاصل کردہ حقیقی منظر۔ یہ کمرے کا ایک حصہ اور ہماری سب سے چھوٹی مثال ہے۔'],
  },
  {
    id: 'house-drone', sceneId: 'db2c9baa', creator: 'deybacsi',
    originalTitle: 'House (low density)', sizeMB: 51.71,
    sourceUrl: 'https://superspl.at/scene/db2c9baa',
    posterUrl: 'https://s3-eu-west-1.amazonaws.com/images.playcanvas.com/splat/db2c9baa/v1/xl.webp',
    title: ['منزل من الخارج', 'House exterior', 'گھر کا بیرونی منظر'],
    description: ['مسح من تصوير درون و156 صورة، بنسخة أقل كثافة من الأصل. يعرض الخارج والمحيط، دون جولة داخل الغرف.', 'Reconstructed from drone footage and 156 images, using the lower-density version. Covers the exterior and surroundings, not the rooms.', 'ڈرون اور 156 تصاویر سے تیار کردہ کم کثافت والا اسکین۔ گھر کا بیرونی حصہ اور اطراف دکھاتا ہے، اندرونی کمرے نہیں۔'],
  },
  {
    id: 'full-apartment-phone', sceneId: 'eed8f458', creator: 'dima_kuz',
    originalTitle: 'full apartment', sizeMB: 320.96,
    sourceUrl: 'https://superspl.at/scene/eed8f458',
    posterUrl: 'https://s3-eu-west-1.amazonaws.com/images.playcanvas.com/splat/eed8f458/v7/xl.webp',
    title: ['شقة كاملة بهاتف iPhone', 'Full apartment captured on iPhone', 'iPhone سے اسکین کیا گیا مکمل اپارٹمنٹ'],
    description: ['شقة التُقطت بهاتف iPhone وفق وصف صاحب المسح، باستخدام AnythingTo3D. المثال كبير؛ يفضل فتحه على شبكة Wi-Fi.', 'An apartment captured on iPhone using AnythingTo3D, according to its creator. A large example; Wi-Fi is recommended.', 'تخلیق کار کے مطابق AnythingTo3D کے ذریعے iPhone سے اسکین کیا گیا اپارٹمنٹ۔ یہ بڑی مثال ہے؛ Wi-Fi بہتر ہے۔'],
  },
]);

export const sampleText = (sample, key, locale = getLocale()) => sample[key][{ar:0,en:1,ur:2}[locale] ?? 0];
export const sampleProperty = (sample, locale = getLocale()) => ({virtualTour:{kind:'scene',url:sample.sourceUrl,title:sampleText(sample,'title',locale)}});

export function sampleCreditHTML(sample, locale = getLocale()) {
  return `<div class="tour-sample-credit"><span><bdi>${esc(sample.originalTitle)}</bdi> · <bdi>${esc(sample.creator)}</bdi></span><span><a href="${esc(sample.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(tourText('sampleSource',locale))}</a> · <a href="${SAMPLE_LICENSE}" target="_blank" rel="noopener noreferrer" lang="en" dir="ltr">CC BY 4.0</a></span><small>${esc(tourText('sampleUnchanged',locale))}</small></div>`;
}

export function sampleGalleryHTML(locale = getLocale()) {
  return `<section class="tour-samples" data-i18n-skip aria-labelledby="tour-samples-title"><div class="tour-samples-heading"><span class="eyebrow">${esc(tourText('sampleEyebrow',locale))}</span><h2 id="tour-samples-title">${esc(tourText('sampleHeading',locale))}</h2><p>${esc(tourText('sampleIntro',locale))}</p></div><div class="tour-sample-grid">${TOUR_SAMPLES.map(sample=>`<article class="tour-sample-card"><img class="tour-sample-poster" src="${esc(sample.posterUrl)}" alt="${esc(sampleText(sample,'title',locale))}" width="960" height="960" loading="lazy" decoding="async" referrerpolicy="no-referrer"><div class="tour-sample-body"><span class="tour-sample-tag">${esc(tourText('sampleTag',locale))}</span><h3>${esc(sampleText(sample,'title',locale))}</h3><p>${esc(sampleText(sample,'description',locale))}</p><p class="tour-sample-size"><span>${esc(tourText('sampleSize',locale))}</span> <bdi>${sample.sizeMB.toFixed(2)} MB</bdi>${sample.sizeMB>100?` · ${esc(tourText('sampleLarge',locale))}`:''}</p><button class="btn primary" type="button" data-action="tour-sample" data-id="${esc(sample.id)}" aria-label="${esc(tourText('sampleView',locale)+': '+sampleText(sample,'title',locale))}">${esc(tourText('sampleView',locale))}</button>${sampleCreditHTML(sample,locale)}</div></article>`).join('')}</div><p class="fineprint">${esc(tourText('sampleLoad',locale))}</p></section>`;
}

'use client';

import { useEffect } from 'react';

export default function UrlSanitizer() {
  useEffect(() => {
    const url = new URL(window.location.href);
    let changed = false;

    const trackingKeys = [
      'utm_source','utm_medium','utm_campaign','utm_term','utm_content',
      'gclid','fbclid','mc_cid','mc_eid'
    ];

    for (const key of trackingKeys) {
      if (url.searchParams.has(key)) {
        url.searchParams.delete(key);
        changed = true;
      }
    }

    if (changed) {
      const clean = `${url.pathname}${url.searchParams.toString() ? `?${url.searchParams.toString()}` : ''}${url.hash}`;
      window.history.replaceState({}, '', clean);
    }
  }, []);

  return null;
}

'use client';

import { useEffect } from 'react';

const emojiPattern = /[\p{Extended_Pictographic}\uFE0F\u200D]/gu;

function cleanNode(node: Node) {
  if (node.nodeType === Node.TEXT_NODE && node.textContent) {
    const cleaned = node.textContent.replace(emojiPattern, '');
    if (cleaned !== node.textContent) node.textContent = cleaned;
    return;
  }

  node.childNodes.forEach(cleanNode);
}

export default function EmojiSanitizer() {
  useEffect(() => {
    cleanNode(document.body);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach(cleanNode);
        if (mutation.type === 'characterData') cleanNode(mutation.target);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, []);

  return null;
}

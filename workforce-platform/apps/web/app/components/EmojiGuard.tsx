'use client';

import { useEffect } from 'react';

const emojiPattern = /[\p{Extended_Pictographic}\uFE0F\u200D]/gu;

function stripEmojiFromTextNodes(root: ParentNode) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    nodes.push(current as Text);
    current = walker.nextNode();
  }
  for (const node of nodes) {
    if (node.parentElement?.closest('svg')) continue;
    const clean = node.data.replace(emojiPattern, '').replace(/\s{2,}/g, ' ');
    if (clean !== node.data) node.data = clean;
  }
}

export default function EmojiGuard() {
  useEffect(() => {
    stripEmojiFromTextNodes(document.body);
    const observer = new MutationObserver(() => stripEmojiFromTextNodes(document.body));
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);
  return null;
}

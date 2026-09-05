// Matching semantics derived from Katakana Terminator (MIT), copyright
// 2017-2021 Katakana Terminator Contributors. DOM scope and request behavior
// are intentionally owned by Japanese Reading Helper instead of copied from that script.
const KATAKANA_PHRASE = /[\u30A1-\u30FA\u30FD-\u30FF][\u3099\u309A\u30A1-\u30FF]*[\u3099\u309A\u30A1-\u30FA\u30FC-\u30FF]|[\uFF66-\uFF6F\uFF71-\uFF9D][\uFF65-\uFF9F]*[\uFF66-\uFF9F]/gu;

export function findKatakanaMatches(text) {
  if (typeof text !== "string" || text.length === 0) {
    return [];
  }

  return [...text.matchAll(KATAKANA_PHRASE)].map((match) => ({
    start: match.index,
    end: match.index + match[0].length,
    text: match[0],
  }));
}

import { kanaToHepburn } from "./romanize.js";

const BLOCKED_TAGS = new Set([
  "SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "FORM", "INPUT", "TEXTAREA", "SELECT", "OPTION",
  "BUTTON", "CODE", "PRE", "KBD", "SAMP", "RUBY", "RT", "RP", "SVG", "MATH", "CANVAS",
  "AUDIO", "VIDEO",
]);
const convertedRubySnapshots = new WeakMap();
const KANA_ONLY = /^[\u3041-\u3096\u309d\u309e\u30a1-\u30fa\u30fd\u30feー・\s]+$/u;

export function shouldSkipTextNode(node) {
  if (!node || node.nodeType !== 3 || !node.parentElement || !node.textContent.trim()) {
    return true;
  }

  for (let element = node.parentElement; element; element = element.parentElement) {
    if (BLOCKED_TAGS.has(element.tagName)) {
      return true;
    }
    if (
      element.hasAttribute("data-yomi-ruby-generated")
      || element.hasAttribute("data-yomi-ruby-converted-rt")
      || element.hasAttribute("data-yomi-ruby-status")
    ) {
      return true;
    }
    if (element.hidden || element.hasAttribute("inert") || element.getAttribute("aria-hidden") === "true") {
      return true;
    }
    const editable = element.getAttribute("contenteditable");
    if (editable != null && editable.toLowerCase() !== "false") {
      return true;
    }
    const style = element.ownerDocument.defaultView?.getComputedStyle?.(element);
    if (style?.display === "none" || style?.visibility === "hidden" || style?.visibility === "collapse") {
      return true;
    }
  }
  return false;
}

export function convertExistingKanaRuby(root) {
  let converted = 0;
  const rubyElements = [];
  if (root.matches?.("ruby:not([data-yomi-ruby-generated])")) {
    rubyElements.push(root);
  }
  rubyElements.push(...root.querySelectorAll("ruby:not([data-yomi-ruby-generated])"));
  for (const ruby of rubyElements) {
    if (isKatakanaTerminatorRuby(ruby)) {
      continue;
    }
    const rtElements = [...ruby.querySelectorAll(":scope > rt")];
    const baseText = [...ruby.childNodes]
      .filter((node) => !(node.nodeType === 1 && ["RT", "RP"].includes(node.tagName)))
      .map((node) => node.textContent)
      .join("");
    if (!/\p{Script=Han}/u.test(baseText)) {
      continue;
    }
    for (const rt of rtElements) {
      const reading = rt.textContent.trim();
      if (!KANA_ONLY.test(reading)) {
        continue;
      }
      const romaji = kanaToHepburn(reading);
      if (!romaji) {
        continue;
      }
      convertedRubySnapshots.set(rt, {
        text: rt.textContent,
        attributes: [...rt.attributes].map(({ name, value }) => [name, value]),
      });
      rt.textContent = romaji;
      rt.classList.add("yomi-ruby-existing-rt");
      rt.setAttribute("data-yomi-ruby-converted-rt", "");
      rt.setAttribute("data-yomi-ruby-kana", reading);
      converted += 1;
    }
  }
  return converted;
}

export function restoreConvertedKanaRuby(root) {
  for (const rt of root.querySelectorAll("rt[data-yomi-ruby-converted-rt]")) {
    const snapshot = convertedRubySnapshots.get(rt);
    if (!snapshot) {
      continue;
    }
    rt.textContent = snapshot.text;
    for (const attribute of [...rt.attributes]) {
      rt.removeAttribute(attribute.name);
    }
    for (const [name, value] of snapshot.attributes) {
      rt.setAttribute(name, value);
    }
    convertedRubySnapshots.delete(rt);
  }
}

function isKatakanaTerminatorRuby(ruby) {
  return Boolean(ruby.querySelector("rt.katakana-terminator-rt, rt[data-rt]"));
}

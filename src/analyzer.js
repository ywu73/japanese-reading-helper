import { kanaToHepburn } from "./romanize.js";

const HAS_KANJI = /\p{Script=Han}/u;
const KANA_READING = /^[\u3041-\u3096\u309d\u309e\u30a1-\u30fa\u30fd\u30feー・\s]+$/u;

export function createAnalyzer(tokenizer) {
  if (typeof tokenizer?.tokenize !== "function") {
    throw new TypeError("A Kuromoji-compatible tokenizer is required.");
  }
  return (text) => segmentsFromTokens(text, tokenizer.tokenize(text));
}

export function segmentsFromTokens(text, tokens) {
  if (typeof text !== "string" || !Array.isArray(tokens) || text.length === 0) {
    return text ? [{ type: "text", text }] : [];
  }

  const offsets = codePointOffsets(text);
  if (!positionsMatchSource(text, tokens, offsets)) {
    return [{ type: "text", text }];
  }

  const segments = [];
  let cursor = 0;
  for (const token of tokens) {
    const start = offsets[token.word_position - 1];
    appendText(segments, text.slice(cursor, start));

    const surface = token.surface_form;
    if (isReliableKanjiToken(token)) {
      const romaji = kanaToHepburn(token.reading, {
        surface,
        partOfSpeech: token.pos,
      });
      if (romaji) {
        segments.push({ type: "annotation", surface, reading: token.reading, romaji });
      } else {
        appendText(segments, surface);
      }
    } else {
      appendText(segments, surface);
    }
    cursor = start + surface.length;
  }
  appendText(segments, text.slice(cursor));
  return segments;
}

export function isReliableKanjiToken(token) {
  return Boolean(
    token
      && token.word_type === "KNOWN"
      && typeof token.surface_form === "string"
      && HAS_KANJI.test(token.surface_form)
      && typeof token.reading === "string"
      && KANA_READING.test(token.reading),
  );
}

function positionsMatchSource(text, tokens, offsets) {
  let cursor = 0;
  for (const token of tokens) {
    const codePointIndex = Number(token?.word_position) - 1;
    const start = offsets[codePointIndex];
    const surface = token?.surface_form;
    if (!Number.isInteger(codePointIndex) || !Number.isInteger(start) || start < cursor || typeof surface !== "string") {
      return false;
    }
    if (text.slice(start, start + surface.length) !== surface) {
      return false;
    }
    cursor = start + surface.length;
  }
  return true;
}

function codePointOffsets(text) {
  const offsets = [0];
  let codeUnitOffset = 0;
  for (const character of text) {
    codeUnitOffset += character.length;
    offsets.push(codeUnitOffset);
  }
  return offsets;
}

function appendText(segments, text) {
  if (!text) {
    return;
  }
  const last = segments.at(-1);
  if (last?.type === "text") {
    last.text += text;
  } else {
    segments.push({ type: "text", text });
  }
}

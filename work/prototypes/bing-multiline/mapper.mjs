// PROTOTYPE ONLY: decide whether one Bing multiline response can be mapped
// positionally to exact katakana candidates without guessing missing lines.

const LATIN_LETTER = /\p{Script=Latin}/u;

export function evaluateMultilineResponse({
  phrases,
  translatedText,
  targetLanguage = "en",
  detectedLanguage = "ja",
}) {
  const sources = Array.isArray(phrases) ? phrases : [];
  const outputLines = typeof translatedText === "string"
    ? translatedText.split(/\r?\n/u).map((line) => line.trim())
    : [];
  const reasons = [];

  if (sources.length === 0) {
    reasons.push("no input candidates");
  }
  if (targetLanguage !== "en") {
    reasons.push(`unexpected target language: ${targetLanguage}`);
  }
  if (detectedLanguage !== "ja") {
    reasons.push(`unexpected detected language: ${detectedLanguage}`);
  }
  if (outputLines.length !== sources.length) {
    reasons.push(`line-count mismatch: ${sources.length} input / ${outputLines.length} output`);
  }

  const mappings = sources.map((source, index) => {
    const translation = outputLines[index] ?? null;
    const valid = typeof translation === "string"
      && translation.length > 0
      && translation !== source
      && LATIN_LETTER.test(translation);
    if (!valid) {
      reasons.push(`unreliable line ${index + 1}: ${JSON.stringify(translation)}`);
    }
    return { index, source, translation, valid };
  });

  const structurallyAccepted = reasons.length === 0;
  return {
    structurallyAccepted,
    productionSafe: false,
    mappingEvidence: "positional-only",
    inputCount: sources.length,
    outputCount: outputLines.length,
    reasons,
    mappings,
  };
}

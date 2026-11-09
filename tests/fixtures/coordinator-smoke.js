import { AnnotationCoordinator } from "../../src/coordinator.js";

// Exercise the candidate DOM implementation without installing a userscript or
// sending fixture text to a provider. Reading selection is a deterministic stub.
const coordinator = new AnnotationCoordinator({ document });
const readings = new Map([
  ["今日", ["キョウ", "kyō"]], ["東京", ["トウキョウ", "tōkyō"]],
  ["日本語", ["ニホンゴ", "nihongo"]], ["勉強", ["ベンキョウ", "benkyō"]],
  ["食べる", ["タベル", "taberu"]], ["方法", ["ホウホウ", "hōhō"]],
  ["思う", ["オモウ", "omou"]], ["前", ["マエ", "mae"]], ["後", ["ゴ", "go"]],
]);
const pattern = new RegExp([...readings.keys()].join("|"), "gu");
const runtime = {
  plan(record) {
    return { ranges: [...record.text.matchAll(pattern)].map((match) => {
      const [reading, romaji] = readings.get(match[0]);
      return { start: match.index, end: match.index + match[0].length,
        text: match[0], reading, romaji };
    }) };
  },
  forget() {}, pause() {}, resume() {},
};

document.querySelector("h1").textContent = "Candidate DOM regression (no installation)";
document.querySelector("h1 + p").textContent = "Use the candidate controls below. Readings are fixed fixture data; this checks DOM behavior, not Tampermonkey transport or reading accuracy.";
for (const [label, action] of [
  ["Enable candidate Kanji", () => coordinator.enableKanji(runtime)],
  ["Disable candidate Kanji", () => coordinator.stop()],
]) {
  const button = document.createElement("button");
  button.textContent = label;
  button.addEventListener("click", action);
  document.querySelector("nav").append(button);
}

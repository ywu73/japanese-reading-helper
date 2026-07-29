#!/usr/bin/env node
// PROTOTYPE ONLY: interactive shell for inspecting strict positional mapping.

import { evaluateMultilineResponse } from "./mapper.mjs";
import { INDIVIDUAL_COMPARISON, LIVE_CASES } from "./live-evidence-2026-07-29.mjs";

const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

let caseIndex = 0;
let mutation = "none";

if (process.argv.includes("--summary") || !process.stdin.isTTY) {
  printSummary();
  process.exit(0);
}

process.stdin.setRawMode(true);
process.stdin.setEncoding("utf8");
process.stdin.resume();
render();
process.stdin.on("data", (key) => {
  if (key === "q" || key === "\u0003") {
    process.stdout.write("\n");
    process.exit(0);
  }
  if (key === "n") {
    caseIndex = (caseIndex + 1) % LIVE_CASES.length;
    mutation = "none";
  } else if (key === "p") {
    caseIndex = (caseIndex - 1 + LIVE_CASES.length) % LIVE_CASES.length;
    mutation = "none";
  } else if (key === "d") {
    mutation = mutation === "drop-line" ? "none" : "drop-line";
  } else if (key === "m") {
    mutation = mutation === "merge-lines" ? "none" : "merge-lines";
  } else if (key === "r") {
    mutation = "none";
  }
  render();
});

function currentEvaluation() {
  const evidence = LIVE_CASES[caseIndex];
  const lines = evidence.translatedText.split("\n");
  const translatedText = mutation === "drop-line"
    ? lines.slice(0, -1).join("\n")
    : mutation === "merge-lines" && lines.length > 1
      ? [lines[0] + " " + lines[1], ...lines.slice(2)].join("\n")
      : evidence.translatedText;
  return {
    evidence,
    translatedText,
    evaluation: evaluateMultilineResponse({ ...evidence, translatedText }),
  };
}

function render() {
  const { evidence, translatedText, evaluation } = currentEvaluation();
  console.clear();
  console.log(`${BOLD}PROTOTYPE — Bing multiline positional mapper${RESET}`);
  console.log(`${DIM}Question: can one multiline Bing response be mapped without guessing missing lines?${RESET}\n`);
  console.log(`${BOLD}case${RESET}: ${caseIndex + 1}/${LIVE_CASES.length} ${evidence.name}`);
  console.log(`${BOLD}mutation${RESET}: ${mutation}`);
  console.log(`${BOLD}transport${RESET}: ${evidence.transport.method} https://${evidence.transport.host}${evidence.transport.path}`);
  console.log(`${BOLD}usedLLM${RESET}: ${evidence.usedLLM}`);
  console.log(`${BOLD}inputCount${RESET}: ${evaluation.inputCount}`);
  console.log(`${BOLD}outputCount${RESET}: ${evaluation.outputCount}`);
  console.log(`${BOLD}structurallyAccepted${RESET}: ${evaluation.structurallyAccepted}`);
  console.log(`${BOLD}productionSafe${RESET}: ${evaluation.productionSafe}`);
  console.log(`${BOLD}mappingEvidence${RESET}: ${evaluation.mappingEvidence}`);
  console.log(`${BOLD}reasons${RESET}: ${evaluation.reasons.length ? evaluation.reasons.join("; ") : "none"}`);
  console.log(`\n${BOLD}mappings${RESET}`);
  for (const mapping of evaluation.mappings) {
    console.log(`${String(mapping.index + 1).padStart(2)}. ${mapping.source} -> ${mapping.translation ?? "<missing>"} [${mapping.valid ? "valid" : "invalid"}]`);
  }
  console.log(`\n${DIM}translatedText=${JSON.stringify(translatedText)}${RESET}`);
  console.log(`\n${BOLD}[n]${RESET} next  ${BOLD}[p]${RESET} previous  ${BOLD}[d]${RESET} drop line  ${BOLD}[m]${RESET} merge lines  ${BOLD}[r]${RESET} reset  ${BOLD}[q]${RESET} quit`);
}

function printSummary() {
  const summaries = LIVE_CASES.map((evidence) => {
    const evaluation = evaluateMultilineResponse(evidence);
    return {
      name: evidence.name,
      inputCount: evaluation.inputCount,
      outputCount: evaluation.outputCount,
      structurallyAccepted: evaluation.structurallyAccepted,
      productionSafe: evaluation.productionSafe,
      usedLLM: evidence.usedLLM,
    };
  });
  console.log(JSON.stringify({
    question: "Can one multiline Bing response be mapped without guessing missing lines?",
    verdict: "The observed samples preserve positional structure, but positional-only mapping is not a production contract.",
    cases: summaries,
    individualComparison: INDIVIDUAL_COMPARISON,
  }, null, 2));
}

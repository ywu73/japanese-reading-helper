import { buildStaticTokenizer } from "../../../src/static-tokenizer.js";
import { createAnalyzer } from "../../../src/analyzer.js";

let analyze;
self.onmessage = ({ data }) => {
  try {
    if (data.type === "initialize") {
      const files = new Map(data.entries);
      try {
        analyze = createAnalyzer(buildStaticTokenizer(files));
      } finally {
        files.clear();
      }
      self.postMessage({ id: data.id, result: "ready" });
    } else if (data.type === "analyze" && analyze) {
      self.postMessage({ id: data.id, result: data.texts.map(analyze) });
    } else {
      throw new Error("Invalid prototype worker operation");
    }
  } catch (error) {
    self.postMessage({ id: data.id, error: error.message });
  }
};

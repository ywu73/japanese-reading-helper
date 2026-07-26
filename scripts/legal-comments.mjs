export function asLineComments(value) {
  return value.trimEnd().split("\n").map((line) => line ? `// ${line}` : "//").join("\n");
}

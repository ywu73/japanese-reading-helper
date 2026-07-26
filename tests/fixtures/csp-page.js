document.querySelector("#csp-add-dynamic").addEventListener("click", () => {
  const paragraph = document.createElement("p");
  paragraph.textContent = "新しい東京の記事で日本語を勉強する。";
  document.querySelector("#csp-dynamic").append(paragraph);
});

document.querySelector("#csp-disable-yomi-ruby").addEventListener("click", () => {
  globalThis.__YOMI_RUBY_MENU_COMMANDS__.get("关闭本网站自动标注")?.();
});

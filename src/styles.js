export const STYLES = `
ruby.yomi-ruby-ruby {
  position: relative !important;
  ruby-position: over;
  ruby-align: center;
}
ruby.yomi-ruby-ruby > rt.yomi-ruby-rt,
rt.yomi-ruby-existing-rt {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
  font-size: 0.55em !important;
  font-weight: 500 !important;
  line-height: 1 !important;
  user-select: none !important;
}
ruby.yomi-ruby-ruby:focus-visible {
  outline: 2px solid Highlight !important;
  outline-offset: 2px !important;
}
ruby.yomi-ruby-ruby[data-yomi-ruby-kana]:hover::after,
ruby.yomi-ruby-ruby[data-yomi-ruby-kana]:focus-visible::after {
  content: attr(data-yomi-ruby-kana);
  position: absolute;
  z-index: 2147483647;
  left: 50%;
  bottom: calc(100% + 1.4em);
  transform: translateX(-50%);
  padding: 0.2em 0.4em;
  border-radius: 0.3em;
  background: rgba(24, 24, 27, 0.94);
  color: white;
  font: 12px/1.35 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  white-space: nowrap;
  pointer-events: none;
}
[data-yomi-ruby-status] {
  position: fixed !important;
  z-index: 2147483647 !important;
  right: 16px !important;
  bottom: 16px !important;
  max-width: min(420px, calc(100vw - 32px)) !important;
  padding: 10px 14px !important;
  border-radius: 8px !important;
  background: rgba(24, 24, 27, 0.94) !important;
  color: #fff !important;
  font: 13px/1.45 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.25) !important;
}
`;

export function installStyles(document) {
  const style = document.createElement("style");
  style.setAttribute("data-yomi-ruby-style", "");
  style.textContent = STYLES;
  document.documentElement.append(style);
  return () => style.remove();
}

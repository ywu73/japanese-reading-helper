// Owns only viewport priority and observation. It never analyzes source text,
// sends requests, or changes the DOM. Far-away records remain eligible for
// bounded background processing after foreground work settles.
export class ViewportScheduler {
  constructor({ document, onReady, margin = 300 }) {
    this.window = document.defaultView;
    this.margin = margin;
    this.pending = new Map();
    this.targets = new Map();
    this.ready = new Set();
    this.active = true;
    const Observer = this.window?.IntersectionObserver;
    this.observer = typeof Observer === "function" ? new Observer((entries) => {
      if (!this.active) {
        return;
      }
      for (const entry of entries) {
        for (const record of this.targets.get(entry.target) ?? []) {
          if (entry.isIntersecting) {
            this.ready.add(record);
          } else {
            this.ready.delete(record);
          }
        }
      }
      if (this.ready.size > 0) {
        onReady();
      }
    }, { rootMargin: `${margin}px` }) : null;
  }

  defer(record) {
    const target = record.currentNodes[0]?.parentElement;
    if (!this.active || !this.observer || !target) {
      return false;
    }
    const rect = target.getBoundingClientRect();
    // Zero-size parents (e.g. display:contents) cannot locate their text.
    // Treat them as foreground instead of indefinitely postponing content.
    if (
      (rect.width === 0 && rect.height === 0)
      || (rect.bottom >= -this.margin && rect.top <= this.window.innerHeight + this.margin
        && rect.right >= -this.margin && rect.left <= this.window.innerWidth + this.margin)
    ) {
      return false;
    }
    this.pending.set(record, target);
    let records = this.targets.get(target);
    if (!records) {
      records = new Set();
      this.targets.set(target, records);
      this.observer.observe(target);
    }
    records.add(record);
    return true;
  }

  has(record) {
    return this.pending.has(record);
  }

  get hasReady() {
    return this.ready.size > 0;
  }

  get hasDeferred() {
    return this.pending.size > 0;
  }

  takeReady() {
    const record = this.ready.values().next().value;
    if (record) {
      this.forget(record);
    }
    return record;
  }

  takeBackground() {
    const record = this.pending.keys().next().value;
    if (record) {
      this.forget(record);
    }
    return record;
  }

  forget(record) {
    const target = this.pending.get(record);
    this.pending.delete(record);
    this.ready.delete(record);
    const records = this.targets.get(target);
    if (records) {
      records.delete(record);
      if (records.size === 0) {
        this.targets.delete(target);
        this.observer.unobserve(target);
      }
    }
  }

  stop() {
    this.active = false;
    this.observer?.disconnect();
    this.pending.clear();
    this.targets.clear();
    this.ready.clear();
  }
}

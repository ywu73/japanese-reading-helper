// Index only pending subscriptions so detached records do not scan the cache.
export class RecordWaiters {
  constructor() {
    this.entriesByRecord = new WeakMap();
  }

  add(record, entry) {
    entry.waiters.add(record);
    let entries = this.entriesByRecord.get(record);
    if (!entries) {
      entries = new Set();
      this.entriesByRecord.set(record, entries);
    }
    entries.add(entry);
  }

  forget(record) {
    const entries = this.entriesByRecord.get(record);
    if (!entries) {
      return;
    }
    for (const entry of entries) {
      entry.waiters.delete(record);
    }
    this.entriesByRecord.delete(record);
  }

  take(entry) {
    const records = [...entry.waiters];
    entry.waiters.clear();
    for (const record of records) {
      const entries = this.entriesByRecord.get(record);
      entries.delete(entry);
      if (entries.size === 0) {
        this.entriesByRecord.delete(record);
      }
    }
    return records;
  }

  clear() {
    this.entriesByRecord = new WeakMap();
  }
}

const config = require("../config");

class MemoryCache {
  constructor(defaultTtlMs = 60000, maxSize = 2000) {
    this.defaultTtlMs = defaultTtlMs;
    this.maxSize = maxSize;
    this.store = new Map();
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  set(key, value, ttlMs = this.defaultTtlMs) {
    if (this.store.size >= this.maxSize) {
      // Evict oldest item
      const oldestKey = this.store.keys().next().value;
      this.store.delete(oldestKey);
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  delete(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

// Dedicated cache stores
const projectKeyCache = new MemoryCache(config.cache.projectTtlMs, 1000);
const originProjectsCache = new MemoryCache(config.cache.projectTtlMs, 500);
const alertDebounceCache = new MemoryCache(config.cache.alertDebounceMs, 5000);

module.exports = {
  projectKeyCache,
  originProjectsCache,
  alertDebounceCache,
};

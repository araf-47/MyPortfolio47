"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryCache = exports.Cache = exports.NamespacedCacheStore = void 0;
exports.createPersistentCacheStore = createPersistentCacheStore;
/**
 * @fileoverview
 * Provides infrastructure for common caching functionality within the build system.
 */
const environment_options_1 = require("../environment-options");
const error_1 = require("../error");
/**
 * A backing data store wrapper that namespaces all keys using length-prefix framing.
 * Prevents key collisions between namespaces regardless of characters (such as colons)
 * in the namespace or key.
 */
class NamespacedCacheStore {
    store;
    namespace;
    #prefix;
    constructor(store, namespace) {
        this.store = store;
        this.namespace = namespace;
        this.#prefix = `${namespace.length}:${namespace}:`;
    }
    get(key) {
        return this.store.get(this.#prefix + key);
    }
    has(key) {
        return this.store.has(this.#prefix + key);
    }
    set(key, value) {
        const result = this.store.set(this.#prefix + key, value);
        if (result instanceof Promise) {
            return result.then(() => this);
        }
        return this;
    }
}
exports.NamespacedCacheStore = NamespacedCacheStore;
/**
 * A cache object that allows accessing and storing key/value pairs in
 * an underlying CacheStore. This class is the primary method for consumers
 * to use a cache.
 */
class Cache {
    store;
    // In-flight creator promises to deduplicate concurrent requests for the same key.
    #requests = new Map();
    // Track how many writes occurred for a key to detect mutations during await gaps.
    #writeCounts = new Map();
    // Count the number of active, pending getOrCreate operations per key to avoid memory leaks.
    #pendingGets = new Map();
    constructor(store) {
        this.store = store;
    }
    #incrementWrite(key) {
        // Only track write counts if there is a pending getOrCreate operation active for the key.
        // This ensures that write counts are not leaked when no concurrent gets are running.
        if (this.#pendingGets.has(key)) {
            this.#writeCounts.set(key, (this.#writeCounts.get(key) || 0) + 1);
        }
    }
    /**
     * Gets the value associated with a provided key if available.
     * Otherwise, creates a value using the factory creator function, puts the value
     * in the cache, and returns the new value.
     * @param key A key associated with the value.
     * @param creator A factory function for the value if no value is present.
     * @returns A value associated with the provided key.
     */
    async getOrCreate(key, creator) {
        // 1. If another call is already running the creator for this key, share its promise.
        let activeRequest = this.#requests.get(key);
        if (activeRequest !== undefined) {
            return activeRequest;
        }
        // Increment pending gets count to enable write-tracking for this key.
        const currentPending = this.#pendingGets.get(key) || 0;
        this.#pendingGets.set(key, currentPending + 1);
        try {
            const startWriteCount = this.#writeCounts.get(key) || 0;
            // 2. Query the backing store. Since store.get can be async, we yield to the event loop.
            const value = await this.store.get(key);
            // If a write (e.g. put) occurred during the store.get await gap, we must abort
            // the current execution and restart to ensure we return the newly written value.
            if ((this.#writeCounts.get(key) || 0) !== startWriteCount) {
                return this.getOrCreate(key, creator);
            }
            if (value !== undefined) {
                return value;
            }
            // 3. Recheck active request after the await gap in case another concurrent call
            // initiated a creator during the store.get wait.
            activeRequest = this.#requests.get(key);
            if (activeRequest !== undefined) {
                return activeRequest;
            }
            // 4. Run the creator to produce the new value, and store its promise in #requests.
            activeRequest = Promise.resolve(creator()).then(async (newValue) => {
                // Ensure this request is still the active one before writing back to the store
                // (prevents overwriting newer data if put() was called before resolution).
                if (this.#requests.get(key) === activeRequest) {
                    this.#incrementWrite(key);
                    await this.store.set(key, newValue);
                    this.#requests.delete(key);
                }
                return newValue;
            }, (error) => {
                // Clean up the active request if the creator fails.
                if (this.#requests.get(key) === activeRequest) {
                    this.#requests.delete(key);
                }
                throw error;
            });
            this.#requests.set(key, activeRequest);
            return activeRequest;
        }
        finally {
            // Clean up write counts and pending gets once all concurrent gets for this key finish.
            const current = this.#pendingGets.get(key) || 0;
            if (current <= 1) {
                this.#pendingGets.delete(key);
                this.#writeCounts.delete(key);
            }
            else {
                this.#pendingGets.set(key, current - 1);
            }
        }
    }
    /**
     * Gets the value associated with a provided key if available.
     * @param key A key associated with the value.
     * @returns A value associated with the provided key if present. Otherwise, `undefined`.
     */
    async get(key) {
        const value = await this.store.get(key);
        return value;
    }
    /**
     * Puts a value in the cache and associates it with the provided key.
     * If the key is already present, the value is updated instead.
     * @param key A key associated with the value.
     * @param value A value to put in the cache.
     */
    async put(key, value) {
        this.#requests.delete(key);
        this.#incrementWrite(key);
        await this.store.set(key, value);
    }
    /**
     * Clears internal state for a specific key (requests, write counts, and pending gets).
     */
    deleteInternal(key) {
        this.#requests.delete(key);
        this.#writeCounts.delete(key);
        this.#pendingGets.delete(key);
    }
    /**
     * Clears the base class internal state (requests, write counts, and pending gets).
     */
    clearInternal() {
        this.#requests.clear();
        this.#writeCounts.clear();
        this.#pendingGets.clear();
    }
}
exports.Cache = Cache;
/**
 * A lightweight in-memory cache implementation based on a JavaScript Map object.
 */
class MemoryCache extends Cache {
    constructor() {
        super(new Map());
    }
    /**
     * Removes the specified key from the cache instance.
     * @param key The key to remove.
     * @returns True if an element in the Map existed and has been removed, or false if the element does not exist.
     */
    delete(key) {
        this.deleteInternal(key);
        return this.store.delete(key);
    }
    /**
     * Removes all entries from the cache instance.
     */
    clear() {
        this.clearInternal();
        this.store.clear();
    }
    /**
     * Provides all the values currently present in the cache instance.
     * @returns An iterable of all values in the cache.
     */
    values() {
        return this.store.values();
    }
    /**
     * Provides all the keys/values currently present in the cache instance.
     * @returns An iterable of all key/value pairs in the cache.
     */
    entries() {
        return this.store.entries();
    }
}
exports.MemoryCache = MemoryCache;
/**
 * Creates and returns a persistent cache store.
 * Attempts to use the native LMDB store first, and falls back to the built-in SQLite store
 * if LMDB fails to initialize.
 *
 * @param baseCachePath The base path of the cache file/directory without suffix/extension.
 * @returns A promise resolving to a PersistentCacheStore instance.
 */
async function createPersistentCacheStore(baseCachePath) {
    if (environment_options_1.persistentCacheStoreSetting === 'sqlite') {
        try {
            const { SqliteCacheStore } = await Promise.resolve().then(() => __importStar(require('./sqlite-cache-store')));
            return new SqliteCacheStore(baseCachePath + '-sqlite.db');
        }
        catch (err) {
            (0, error_1.assertIsError)(err);
            throw new Error('Unable to initialize JavaScript cache storage.\n' + `SQLite error: ${err.message}`, { cause: err });
        }
    }
    if (environment_options_1.persistentCacheStoreSetting === 'lmdb') {
        try {
            const { LmdbCacheStore } = await Promise.resolve().then(() => __importStar(require('./lmdb-cache-store')));
            return new LmdbCacheStore(baseCachePath + '.db');
        }
        catch (err) {
            (0, error_1.assertIsError)(err);
            throw new Error('Unable to initialize JavaScript cache storage.\n' + `LMDB error: ${err.message}`, { cause: err });
        }
    }
    try {
        const { LmdbCacheStore } = await Promise.resolve().then(() => __importStar(require('./lmdb-cache-store')));
        return new LmdbCacheStore(baseCachePath + '.db');
    }
    catch (lmdbError) {
        try {
            const { SqliteCacheStore } = await Promise.resolve().then(() => __importStar(require('./sqlite-cache-store')));
            return new SqliteCacheStore(baseCachePath + '-sqlite.db');
        }
        catch (sqliteError) {
            (0, error_1.assertIsError)(lmdbError);
            (0, error_1.assertIsError)(sqliteError);
            throw new Error('Unable to initialize JavaScript cache storage.\n' +
                `LMDB error: ${lmdbError.message.split('\n')[0]}\n` +
                `SQLite error: ${sqliteError.message.split('\n')[0]}`, { cause: sqliteError });
        }
    }
}
//# sourceMappingURL=cache.js.map
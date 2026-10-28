/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
/**
 * A backing data store for one or more Cache instances.
 * The interface is intentionally designed to support using a JavaScript
 * Map instance as a potential cache store.
 */
export interface CacheStore<V> {
    /**
     * Returns the specified value from the cache store or `undefined` if not found.
     * @param key The key to retrieve from the store.
     */
    get(key: string): V | undefined | Promise<V | undefined>;
    /**
     * Returns whether the provided key is present in the cache store.
     * @param key The key to check from the store.
     */
    has(key: string): boolean | Promise<boolean>;
    /**
     * Adds a new value to the cache store if the key is not present.
     * Updates the value for the key if already present.
     * @param key The key to associate with the value in the cache store.
     * @param value The value to add to the cache store.
     */
    set(key: string, value: V): this | Promise<this>;
}
/**
 * A persistent backing data store that supports namespace partitioning
 * and manual lifecycle close operations.
 */
export interface PersistentCacheStore<V = any> extends CacheStore<V> {
    createCache<T = V>(namespace: string): Cache<T>;
    close(): void | Promise<void>;
}
/**
 * A backing data store wrapper that namespaces all keys using length-prefix framing.
 * Prevents key collisions between namespaces regardless of characters (such as colons)
 * in the namespace or key.
 */
export declare class NamespacedCacheStore<V> implements CacheStore<V> {
    #private;
    private readonly store;
    readonly namespace: string;
    constructor(store: CacheStore<V>, namespace: string);
    get(key: string): V | undefined | Promise<V | undefined>;
    has(key: string): boolean | Promise<boolean>;
    set(key: string, value: V): this | Promise<this>;
}
/**
 * A cache object that allows accessing and storing key/value pairs in
 * an underlying CacheStore. This class is the primary method for consumers
 * to use a cache.
 */
export declare class Cache<V, S extends CacheStore<V> = CacheStore<V>> {
    #private;
    protected readonly store: S;
    constructor(store: S);
    /**
     * Gets the value associated with a provided key if available.
     * Otherwise, creates a value using the factory creator function, puts the value
     * in the cache, and returns the new value.
     * @param key A key associated with the value.
     * @param creator A factory function for the value if no value is present.
     * @returns A value associated with the provided key.
     */
    getOrCreate(key: string, creator: () => V | Promise<V>): Promise<V>;
    /**
     * Gets the value associated with a provided key if available.
     * @param key A key associated with the value.
     * @returns A value associated with the provided key if present. Otherwise, `undefined`.
     */
    get(key: string): Promise<V | undefined>;
    /**
     * Puts a value in the cache and associates it with the provided key.
     * If the key is already present, the value is updated instead.
     * @param key A key associated with the value.
     * @param value A value to put in the cache.
     */
    put(key: string, value: V): Promise<void>;
    /**
     * Clears internal state for a specific key (requests, write counts, and pending gets).
     */
    protected deleteInternal(key: string): void;
    /**
     * Clears the base class internal state (requests, write counts, and pending gets).
     */
    protected clearInternal(): void;
}
/**
 * A lightweight in-memory cache implementation based on a JavaScript Map object.
 */
export declare class MemoryCache<V> extends Cache<V, Map<string, V>> {
    constructor();
    /**
     * Removes the specified key from the cache instance.
     * @param key The key to remove.
     * @returns True if an element in the Map existed and has been removed, or false if the element does not exist.
     */
    delete(key: string): boolean;
    /**
     * Removes all entries from the cache instance.
     */
    clear(): void;
    /**
     * Provides all the values currently present in the cache instance.
     * @returns An iterable of all values in the cache.
     */
    values(): MapIterator<V>;
    /**
     * Provides all the keys/values currently present in the cache instance.
     * @returns An iterable of all key/value pairs in the cache.
     */
    entries(): MapIterator<[string, V]>;
}
/**
 * Creates and returns a persistent cache store.
 * Attempts to use the native LMDB store first, and falls back to the built-in SQLite store
 * if LMDB fails to initialize.
 *
 * @param baseCachePath The base path of the cache file/directory without suffix/extension.
 * @returns A promise resolving to a PersistentCacheStore instance.
 */
export declare function createPersistentCacheStore(baseCachePath: string): Promise<PersistentCacheStore>;

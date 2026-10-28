"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PersistentLoadResultCache = void 0;
exports.extractDiskFilePath = extractDiskFilePath;
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const node_url_1 = require("node:url");
const concurrency_1 = require("../../utils/concurrency");
const hash_1 = require("../../utils/hash");
const load_result_cache_1 = require("./load-result-cache");
/**
 * Calculates a unique cache key from the global configuration hash and path.
 */
function calculateCacheKey(globalConfigHash, path) {
    const hasher = (0, hash_1.createContentHash)();
    hasher.update(globalConfigHash);
    hasher.update('\0');
    hasher.update(path);
    return hasher.digest();
}
/**
 * Normalizes a namespaced cache key into a valid disk file path if one exists.
 * Handles 'file:' URIs, OS platform differences, and custom plugin namespaces.
 */
function extractDiskFilePath(path) {
    if (path.startsWith('file:')) {
        const urlStr = path.startsWith('file://') ? path : 'file://' + path.slice(5);
        try {
            return (0, node_url_1.fileURLToPath)(urlStr);
        }
        catch {
            const candidate = path.slice(5);
            return (0, node_path_1.isAbsolute)(candidate) ? candidate : undefined;
        }
    }
    // Handle custom namespace prefix (e.g. "sass:/path/to/file")
    // Ensure colonIndex > 1 to avoid treating Windows drive letters (e.g. "C:/") as namespace prefixes.
    const colonIndex = path.indexOf(':');
    if (colonIndex > 1) {
        const candidatePath = path.slice(colonIndex + 1);
        if ((0, node_path_1.isAbsolute)(candidatePath)) {
            return candidatePath;
        }
    }
    return (0, node_path_1.isAbsolute)(path) ? path : undefined;
}
/**
 * Validates that all imported watch files exist on disk and their contents match.
 * Performs a fast-path metadata check (mtime + size) first, falling back to content hashing.
 * Heals/updates the cached metadata on disk if the content hash was valid but the metadata changed.
 */
async function validateAndHealCacheEntry(watchFilesMetadata, store, cacheKey, cached) {
    if (!watchFilesMetadata) {
        return false;
    }
    const watchFiles = Object.keys(watchFilesMetadata);
    let healed = false;
    const isValidResults = await (0, concurrency_1.mapConcurrent)(watchFiles, concurrency_1.MAX_CONCURRENT_READS, async (filePath) => {
        try {
            const stats = await (0, promises_1.stat)(filePath);
            const expected = watchFilesMetadata[filePath];
            if (!expected) {
                return false;
            }
            // 1. Fast Path: size and mtime match
            if (stats.size === expected.size && stats.mtimeMs === expected.mtimeMs) {
                return true;
            }
            // 2. Slow Path: content hash fallback
            const currentContent = await (0, promises_1.readFile)(filePath);
            const currentHash = (0, hash_1.calculateHash)(currentContent);
            if (currentHash === expected.hash) {
                // Heal cache entry with new metadata
                watchFilesMetadata[filePath] = {
                    ...expected,
                    mtimeMs: stats.mtimeMs,
                    size: stats.size,
                };
                healed = true;
                return true;
            }
            return false;
        }
        catch {
            return false;
        }
    });
    if (isValidResults.some((isValid) => !isValid)) {
        return false;
    }
    if (healed) {
        try {
            await store.put(cacheKey, cached);
        }
        catch {
            // Ignore errors writing healed entries
        }
    }
    return true;
}
/**
 * Computes metadata (content hashes, mtime, size) for an array of watch file paths.
 * Processes files with a sliding worker pool of 16 concurrent operations.
 */
async function computeMetadataForWatchFiles(watchFiles, knownContents) {
    const watchFilesMetadata = {};
    await (0, concurrency_1.runConcurrent)(watchFiles, concurrency_1.MAX_CONCURRENT_READS, async (filePath) => {
        try {
            const knownContent = knownContents?.get(filePath);
            const [content, stats] = await Promise.all([
                knownContent !== undefined ? knownContent : (0, promises_1.readFile)(filePath),
                (0, promises_1.stat)(filePath),
            ]);
            const hash = (0, hash_1.calculateHash)(content);
            watchFilesMetadata[filePath] = {
                hash,
                mtimeMs: stats.mtimeMs,
                size: stats.size,
            };
        }
        catch {
            // Ignore unreadable files
        }
    });
    return watchFilesMetadata;
}
class PersistentLoadResultCache {
    persistentStore;
    globalConfigHash;
    memoryCache = new load_result_cache_1.MemoryLoadResultCache();
    constructor(persistentStore, globalConfigHash = '') {
        this.persistentStore = persistentStore;
        this.globalConfigHash = globalConfigHash;
    }
    /**
     * Retrieves a load result from cache.
     * Checks L1 memory cache first for immediate watch-mode speed, falling back to L2 persistent disk
     * store on L1 cache miss. L2 persistent cache entries are validated against dependency metadata.
     */
    async get(path) {
        // 1. Check L1 Memory Cache
        const memoryResult = this.memoryCache.get(path);
        if (memoryResult) {
            return memoryResult;
        }
        if (!this.persistentStore) {
            return undefined;
        }
        // 2. Check L2 Persistent Disk Cache
        const cacheKey = calculateCacheKey(this.globalConfigHash, path);
        const cached = await this.persistentStore.get(cacheKey);
        if (cached &&
            (await validateAndHealCacheEntry(cached.watchFilesMetadata, this.persistentStore, cacheKey, cached))) {
            const result = {
                contents: cached.contents,
                loader: cached.loader,
                watchFiles: cached.watchFiles,
                watchDirs: cached.watchDirs,
                warnings: cached.warnings,
                errors: cached.errors,
            };
            // Populate L1 Memory Cache for subsequent lookups
            await this.memoryCache.put(path, result);
            return result;
        }
        return undefined;
    }
    /**
     * Stores a load result in both L1 memory cache and L2 persistent disk store.
     */
    async put(path, result) {
        await this.memoryCache.put(path, result);
        // Persist to L2 store if persistentStore is configured and contents exist (including empty strings/buffers)
        if (this.persistentStore && result.contents !== undefined) {
            let content = '';
            const filePath = extractDiskFilePath(path);
            if (filePath) {
                try {
                    content = await (0, promises_1.readFile)(filePath);
                }
                catch {
                    // Skip L2 persistent store if target disk file cannot be read
                    return;
                }
            }
            const cacheKey = calculateCacheKey(this.globalConfigHash, path);
            // Reuse the target file's pre-read content buffer to avoid redundant disk reads (readFile)
            // during dependency watch file metadata computation.
            const knownContents = filePath
                ? new Map([[filePath, content]])
                : undefined;
            const allWatchFiles = Array.from(new Set(filePath ? [filePath, ...(result.watchFiles ?? [])] : result.watchFiles));
            const watchFilesMetadata = await computeMetadataForWatchFiles(allWatchFiles, knownContents);
            await this.persistentStore.put(cacheKey, {
                contents: result.contents,
                loader: result.loader,
                watchFiles: result.watchFiles ?? [],
                watchDirs: result.watchDirs,
                watchFilesMetadata,
                warnings: result.warnings,
                errors: result.errors,
            });
        }
    }
    /**
     * Invalidates cached entries affected by a modified dependency file during watch mode.
     *
     * Note: Invalidation of L1 memory cache is sufficient for active watch mode.
     * Cross-process/cold start stale entries in L2 persistent store are automatically handled
     * during `get()` via dependency metadata verification (`validateAndHealCacheEntry`).
     */
    invalidate(path) {
        return this.memoryCache.invalidate(path);
    }
    get watchFiles() {
        return this.memoryCache.watchFiles;
    }
}
exports.PersistentLoadResultCache = PersistentLoadResultCache;
//# sourceMappingURL=persistent-load-result-cache.js.map
"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryLoadResultCache = void 0;
exports.createCachedLoad = createCachedLoad;
const node_path_1 = require("node:path");
function createCachedLoad(cache, callback) {
    if (cache === undefined) {
        return callback;
    }
    return async (args) => {
        const loadCacheKey = `${args.namespace}:${args.path}`;
        let result = await cache.get(loadCacheKey);
        if (result === undefined) {
            result = await callback(args);
            // Do not cache null or undefined
            if (result) {
                // Ensure requested path is included if it was a resolved file
                if (args.namespace === 'file') {
                    result.watchFiles ??= [];
                    if (!result.watchFiles.includes(args.path)) {
                        result.watchFiles.push(args.path);
                    }
                }
                await cache.put(loadCacheKey, result);
            }
        }
        return result;
    };
}
class MemoryLoadResultCache {
    #loadResults = new Map();
    #fileDependencies = new Map();
    #watchFilesPerKey = new Map();
    get(path) {
        return this.#loadResults.get(path);
    }
    async put(path, result) {
        const previousWatchFiles = this.#watchFilesPerKey.get(path);
        if (result.errors && result.errors.length > 0) {
            if (previousWatchFiles) {
                result.watchFiles = Array.from(new Set([...(result.watchFiles ?? []), ...previousWatchFiles]));
            }
        }
        const currentNormalizedWatchFiles = new Set(result.watchFiles?.map(node_path_1.normalize) ?? []);
        // Clean up any previous file dependencies that are no longer referenced
        if (previousWatchFiles) {
            for (const watchFile of previousWatchFiles) {
                const normalizedWatchFile = (0, node_path_1.normalize)(watchFile);
                if (!currentNormalizedWatchFiles.has(normalizedWatchFile)) {
                    const affected = this.#fileDependencies.get(normalizedWatchFile);
                    if (affected) {
                        affected.delete(path);
                        if (affected.size === 0) {
                            this.#fileDependencies.delete(normalizedWatchFile);
                        }
                    }
                }
            }
        }
        if (result.watchFiles && result.watchFiles.length > 0) {
            this.#watchFilesPerKey.set(path, [...result.watchFiles]);
        }
        else {
            this.#watchFilesPerKey.delete(path);
        }
        this.#loadResults.set(path, result);
        if (result.watchFiles) {
            for (const watchFile of result.watchFiles) {
                // Normalize the watch file path to ensure OS consistent paths
                const normalizedWatchFile = (0, node_path_1.normalize)(watchFile);
                let affected = this.#fileDependencies.get(normalizedWatchFile);
                if (affected === undefined) {
                    affected = new Set();
                    this.#fileDependencies.set(normalizedWatchFile, affected);
                }
                affected.add(path);
            }
        }
    }
    invalidate(path) {
        const affectedPaths = this.#fileDependencies.get(path);
        if (!affectedPaths) {
            return false;
        }
        for (const affected of affectedPaths) {
            this.#loadResults.delete(affected);
        }
        return true;
    }
    get watchFiles() {
        // this.#loadResults.keys() is not included here because the keys
        // are namespaced request paths and not disk-based file paths.
        return [...this.#fileDependencies.keys()];
    }
    clear() {
        this.#loadResults.clear();
        this.#fileDependencies.clear();
        this.#watchFilesPerKey.clear();
    }
}
exports.MemoryLoadResultCache = MemoryLoadResultCache;
//# sourceMappingURL=load-result-cache.js.map
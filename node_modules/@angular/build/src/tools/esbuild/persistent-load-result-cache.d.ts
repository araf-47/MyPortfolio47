/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
/**
 * @fileoverview
 * Implements a generic, two-tier (L1 memory + L2 persistent disk store) caching system for
 * esbuild plugin `OnLoadResult` outcomes across the `@angular/build` compiler pipeline.
 *
 * Supported Module Types:
 * 1. **Disk File Modules** (`file:` namespace): Standard disk-based source files (TS, JS, CSS, Sass, Less).
 *    Cache keys are computed using the root `globalConfigHash`, file path, and file content. Validity is
 *    verified via fast-path metadata (`mtimeMs` + `size`) with fallback to content hashing (`sha256`).
 * 2. **Custom Plugin Namespace Modules** (e.g. `angular:script/global`, `sass:`): Modules loaded through
 *    custom esbuild namespaces that resolve to disk source files.
 * 3. **Virtual Modules & Remote Resources** (e.g. `angular:styles/component`, `css-inline-fonts`): Synthetic
 *    in-memory modules or remote asset declarations whose compiled outcomes depend on parent source file
 *    dependencies (`watchFiles`) or global configuration options (`globalConfigHash`).
 *
 * Key Exported Types:
 * - {@link PersistentLoadResultCache}: Primary two-tier cache manager implementing `LoadResultCache`.
 * - {@link CachedLoadResultEntry}: Serialized structure persisted to disk for cached esbuild `OnLoadResult` items.
 * - {@link CachedDependencyMetadata}: Per-dependency file metadata (`hash`, `mtimeMs`, `size`) used for cache validation and healing.
 */
import type { Loader, OnLoadResult, PartialMessage } from 'esbuild';
import type { Cache as PersistentCacheStore } from '../../utils/cache';
import { LoadResultCache } from './load-result-cache';
/**
 * Metadata for a single watch file dependency.
 */
export interface CachedDependencyMetadata {
    hash: string;
    mtimeMs: number;
    size: number;
}
/**
 * Serialized representation of any esbuild load result stored in persistent cache.
 */
export interface CachedLoadResultEntry {
    /** Compiled output string or binary data */
    contents: string | Uint8Array;
    /** esbuild loader type */
    loader?: Loader;
    /** Absolute paths of all imported/watched dependency files */
    watchFiles: string[];
    /** Absolute paths of all watched directories */
    watchDirs?: string[];
    /** Map of watchFile absolute paths to dependency metadata */
    watchFilesMetadata: Record<string, CachedDependencyMetadata>;
    /** Warnings emitted during load processing */
    warnings?: PartialMessage[];
    /** Errors emitted during load processing */
    errors?: PartialMessage[];
}
/**
 * Normalizes a namespaced cache key into a valid disk file path if one exists.
 * Handles 'file:' URIs, OS platform differences, and custom plugin namespaces.
 */
export declare function extractDiskFilePath(path: string): string | undefined;
export declare class PersistentLoadResultCache implements LoadResultCache {
    private readonly persistentStore?;
    private readonly globalConfigHash;
    private readonly memoryCache;
    constructor(persistentStore?: PersistentCacheStore<CachedLoadResultEntry> | undefined, globalConfigHash?: string);
    /**
     * Retrieves a load result from cache.
     * Checks L1 memory cache first for immediate watch-mode speed, falling back to L2 persistent disk
     * store on L1 cache miss. L2 persistent cache entries are validated against dependency metadata.
     */
    get(path: string): Promise<OnLoadResult | undefined>;
    /**
     * Stores a load result in both L1 memory cache and L2 persistent disk store.
     */
    put(path: string, result: OnLoadResult): Promise<void>;
    /**
     * Invalidates cached entries affected by a modified dependency file during watch mode.
     *
     * Note: Invalidation of L1 memory cache is sufficient for active watch mode.
     * Cross-process/cold start stale entries in L2 persistent store are automatically handled
     * during `get()` via dependency metadata verification (`validateAndHealCacheEntry`).
     */
    invalidate(path: string): boolean;
    get watchFiles(): ReadonlyArray<string>;
}

"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.I18nInliner = void 0;
const node_assert_1 = __importDefault(require("node:assert"));
const node_module_1 = require("node:module");
const node_path_1 = require("node:path");
const node_v8_1 = require("node:v8");
const cache_1 = require("../../utils/cache");
const hash_1 = require("../../utils/hash");
const worker_pool_1 = require("../../utils/worker-pool");
const bundler_files_1 = require("../esbuild/bundler-files");
const i18n_translation_encoder_1 = require("./i18n-translation-encoder");
// TODO: Convert to import.meta usage during ESM transition
const localRequire = (0, node_module_1.createRequire)(__filename);
const INLINER_WORKER_PATH = localRequire.resolve('./i18n-inliner-worker');
/**
 * A keyword used to indicate if a JavaScript file may require inlining of translations.
 * This keyword is used to avoid processing files that would not otherwise need i18n processing.
 */
const LOCALIZE_KEYWORD = '$localize';
/**
 * The baseline number of locales to process concurrently in a single sliding window.
 * This caps peak worker memory on low-core machines while maintaining multi-locale batching throughput.
 */
const DEFAULT_LOCALE_WINDOW_SIZE = 8;
/**
 * Minimum byte size threshold for a file to be eligible for multi-batch sharding.
 * Files below this threshold (< 100 KB) are processed in a single batch to minimize IPC overhead.
 */
const SMALL_FILE_FLOOR_BYTES = 100 * 1024;
/**
 * Ratio of the maximum file size in a window to consider a file "dominant".
 * Files within 70% of the largest file are sharded across bounded workers for concurrency.
 */
const DOMINANT_FILE_RATIO = 0.7;
/**
 * Maximum number of worker threads to allocate concurrently across dominant files.
 * Capping concurrency on dominant files (which hold large AST and sourcemap trees)
 * prevents V8 heap and RSS explosion on machines with high CPU core counts.
 */
const MAX_DOMINANT_WORKERS = 4;
/**
 * Serializes the translation messages for a locale for transfer to an inliner Worker.
 *
 * A SharedArrayBuffer is preferred because it enables zero-copy shared memory access
 * and on-demand string decoding across all worker threads. Falls back to a Blob when
 * SharedArrayBuffer is unavailable.
 *
 * @param translation The translation messages for a locale, if the locale has any.
 * @param translationIntegrity Optional content hash of the translation file for cache lookup.
 * @param translationCache Optional Cache instance for binary translation buffers.
 * @returns A SharedArrayBuffer or Blob containing the serialized messages, or undefined if none.
 */
async function serializeTranslation(translation, translationIntegrity, translationCache) {
    if (!translation) {
        return undefined;
    }
    if (typeof SharedArrayBuffer !== 'undefined') {
        if (translationIntegrity && translationCache) {
            // Look up or generate binary translation data in the persistent cache.
            // A Uint8Array view is stored in the cache store to allow binary persistence.
            const binaryData = await translationCache.getOrCreate(translationIntegrity, () => {
                return new Uint8Array((0, i18n_translation_encoder_1.encodeTranslationToBuffer)(translation));
            });
            // On a cache miss, getOrCreate returns the newly created Uint8Array backed by the
            // original SharedArrayBuffer. Return it directly to avoid an unnecessary allocation and copy.
            if (binaryData.buffer instanceof SharedArrayBuffer &&
                binaryData.byteOffset === 0 &&
                binaryData.byteLength === binaryData.buffer.byteLength) {
                return binaryData.buffer;
            }
            // On a warm cache hit, the restored data is backed by a standard ArrayBuffer from disk.
            // Copy it into a SharedArrayBuffer so worker threads can access it via zero-copy shared memory.
            const buffer = new SharedArrayBuffer(binaryData.byteLength);
            new Uint8Array(buffer).set(binaryData);
            return buffer;
        }
        // When persistent caching is not configured, encode directly into a SharedArrayBuffer.
        return (0, i18n_translation_encoder_1.encodeTranslationToBuffer)(translation);
    }
    return new Blob([(0, node_v8_1.serialize)(translation)]);
}
/**
 * A class that performs i18n translation inlining of JavaScript code.
 * A worker pool is used to distribute the transformation actions and allow
 * parallel processing. Inlining is only performed on code that contains the
 * localize function (`$localize`).
 */
class I18nInliner {
    options;
    #cacheInitFailed = false;
    #workerPool;
    #ownsWorkerPool;
    #cacheStore;
    #transformedFileCache;
    #translationCache;
    #generation = 0;
    get #maxConcurrency() {
        return this.options.maxConcurrency ?? (this.#workerPool.maxThreads || 1);
    }
    constructor(options, workerPool) {
        this.options = options;
        if (options.maxConcurrency !== undefined &&
            (!Number.isInteger(options.maxConcurrency) || options.maxConcurrency < 1)) {
            throw new RangeError('options.maxConcurrency must be an integer greater than or equal to 1.');
        }
        this.#ownsWorkerPool = !workerPool;
        // Piscina uses object spread against default options internally. Only define
        // maxThreads when specified to avoid overwriting Piscina's default thread count
        // with undefined.
        this.#workerPool =
            workerPool ??
                new worker_pool_1.WorkerPool({
                    ...(options.maxConcurrency !== undefined && { maxThreads: options.maxConcurrency }),
                });
    }
    #partitionFiles(files) {
        const filenames = [];
        const localizeFiles = new Map();
        const localizeMaps = new Map();
        const unmodifiedFiles = [];
        const pendingMaps = [];
        for (const file of files) {
            if (file.type === bundler_files_1.BuildOutputFileType.Root || file.type === bundler_files_1.BuildOutputFileType.ServerRoot) {
                // Skip also the server entry-point.
                // Skip stats and similar files.
                continue;
            }
            const fileExtension = (0, node_path_1.extname)(file.path);
            if (fileExtension === '.js' || fileExtension === '.mjs') {
                // Check if localizations are present
                const contentBuffer = Buffer.isBuffer(file.contents)
                    ? file.contents
                    : Buffer.from(file.contents.buffer, file.contents.byteOffset, file.contents.byteLength);
                const hasLocalize = contentBuffer.includes(LOCALIZE_KEYWORD);
                if (hasLocalize) {
                    localizeFiles.set(file.path, file);
                    filenames.push(file.path);
                    continue;
                }
            }
            else if (fileExtension === '.map') {
                // The related JS file may not have been checked yet. To ensure that map files are not
                // missed, store any pending map files and check them after all output files.
                pendingMaps.push(file);
                continue;
            }
            unmodifiedFiles.push(file);
        }
        // Check if any pending map files should be processed by checking if the parent JS file is present
        for (const file of pendingMaps) {
            const jsPath = file.path.slice(0, -4);
            if (localizeFiles.has(jsPath)) {
                localizeMaps.set(jsPath, file);
            }
            else {
                unmodifiedFiles.push(file);
            }
        }
        return { filenames, localizeFiles, localizeMaps, unmodifiedFiles };
    }
    /**
     * Performs inlining of translations across multiple locales in parallel.
     *
     * An adaptive 2D task-partitioning algorithm distributes (files x locales) work units
     * across all worker threads while caching AST metadata and sourcemaps in worker memory.
     *
     * @param files The build output files to transform.
     * @param locales The locales and translations to inline.
     * @returns A map of locale names to their inlined output files and diagnostics.
     */
    async inlineAll(files, locales) {
        await this.initCache();
        const generation = ++this.#generation;
        const { missingTranslation, localizeVersion } = this.options;
        const localeList = Array.from(locales);
        if (localeList.length === 0) {
            return new Map();
        }
        const { filenames, localizeFiles, localizeMaps, unmodifiedFiles } = this.#partitionFiles(files);
        const fileResultsByLocale = new Map();
        for (const { locale } of localeList) {
            (0, node_assert_1.default)(!fileResultsByLocale.has(locale), 'Duplicate locale provided to inliner: ' + locale);
            fileResultsByLocale.set(locale, new Map());
        }
        // Process locales in sliding windows to cap peak worker memory.
        // Ensure the window has at least enough locales to saturate all available workers on high-core machines.
        const windowSize = Math.max(DEFAULT_LOCALE_WINDOW_SIZE, this.#maxConcurrency);
        for (let i = 0; i < localeList.length; i += windowSize) {
            const windowLocales = localeList.slice(i, i + windowSize);
            const activeLocales = windowLocales.map((item) => item.locale);
            const isLastWindow = i + windowSize >= localeList.length;
            // Pre-calculate cache key bases and serialized Blobs for each locale in this window
            const localeCacheBases = new Map();
            const localeBlobs = new Map();
            await Promise.all(windowLocales.map(async ({ locale, translation, translationIntegrity }) => {
                const serialized = await serializeTranslation(translation, translationIntegrity, this.#translationCache);
                localeBlobs.set(locale, serialized);
                if (this.#cacheStore) {
                    localeCacheBases.set(locale, (0, hash_1.calculateHash)(JSON.stringify({
                        locale,
                        translation: translationIntegrity || translation,
                        missingTranslation,
                        localizeVersion,
                    })));
                }
            }));
            const uncachedByFile = new Map();
            if (this.#transformedFileCache) {
                const cache = this.#transformedFileCache;
                const cacheChecks = [];
                for (const filename of filenames) {
                    const file = localizeFiles.get(filename);
                    (0, node_assert_1.default)(file !== undefined, 'Localize file must exist: ' + filename);
                    const fileEntriesPromises = windowLocales.map(async ({ locale }) => {
                        const fileCacheKeyBase = localeCacheBases.get(locale);
                        (0, node_assert_1.default)(fileCacheKeyBase !== undefined, 'Cache base must exist for locale: ' + locale);
                        const hasher = (0, hash_1.createContentHash)();
                        hasher.update(file.hash);
                        hasher.update(filename);
                        hasher.update(fileCacheKeyBase);
                        const cacheKey = hasher.digest();
                        try {
                            const result = await cache.get(cacheKey);
                            if (result) {
                                fileResultsByLocale.get(locale)?.set(filename, result);
                                return;
                            }
                        }
                        catch { }
                        return {
                            locale,
                            cacheKey,
                            translation: localeBlobs.get(locale),
                        };
                    });
                    cacheChecks.push(Promise.all(fileEntriesPromises).then((entries) => {
                        const filtered = entries.filter((e) => e !== undefined);
                        if (filtered.length > 0) {
                            uncachedByFile.set(filename, filtered);
                        }
                    }));
                }
                await Promise.all(cacheChecks);
            }
            else {
                for (const filename of filenames) {
                    uncachedByFile.set(filename, windowLocales.map(({ locale }) => ({
                        locale,
                        translation: localeBlobs.get(locale),
                    })));
                }
            }
            // Adaptive 2D Sharding for uncached tasks in this window
            if (uncachedByFile.size > 0) {
                await this.#processUncachedBatches(localizeFiles, localizeMaps, uncachedByFile, fileResultsByLocale, activeLocales, isLastWindow, generation);
            }
        }
        // Assemble final results in deterministic order per locale
        const resultsByLocale = new Map();
        for (const { locale } of localeList) {
            const fileResults = fileResultsByLocale.get(locale);
            const outputFiles = [];
            const errors = [];
            const warnings = [];
            if (fileResults) {
                for (const filename of filenames) {
                    const originalFile = localizeFiles.get(filename);
                    (0, node_assert_1.default)(originalFile !== undefined, 'Localize file must exist: ' + filename);
                    const fileResult = fileResults.get(filename);
                    if (!fileResult) {
                        continue;
                    }
                    const type = originalFile.type;
                    if (fileResult.code != undefined) {
                        outputFiles.push((0, bundler_files_1.createOutputFile)(filename, fileResult.code, type));
                    }
                    else {
                        outputFiles.push(originalFile.clone());
                    }
                    const originalMap = localizeMaps.get(filename);
                    if (fileResult.map !== undefined) {
                        outputFiles.push((0, bundler_files_1.createOutputFile)(filename + '.map', fileResult.map, type));
                    }
                    else if (originalMap !== undefined) {
                        outputFiles.push(originalMap.clone());
                    }
                    for (const message of fileResult.messages) {
                        if (message.type === 'error') {
                            errors.push(message.message);
                        }
                        else {
                            warnings.push(message.message);
                        }
                    }
                }
            }
            // Include cloned unmodified files for every locale
            outputFiles.push(...unmodifiedFiles.map((file) => file.clone()));
            resultsByLocale.set(locale, {
                outputFiles,
                errors,
                warnings,
            });
        }
        return resultsByLocale;
    }
    async #processUncachedBatches(localizeFiles, localizeMaps, uncachedByFile, fileResultsByLocale, activeLocales, isLastWindow = true, generation) {
        const workerCount = this.#maxConcurrency;
        // Extract file data and identify the heaviest file size in a single pass
        let maxFileSize = 0;
        const sortedFiles = Array.from(uncachedByFile, ([filename, entries]) => {
            const codeFile = localizeFiles.get(filename);
            (0, node_assert_1.default)(codeFile !== undefined, 'Localize file must exist: ' + filename);
            const fileSize = codeFile.contents.byteLength;
            if (fileSize > maxFileSize) {
                maxFileSize = fileSize;
            }
            return { filename, entries, codeFile, fileSize };
        });
        // Sort files descending by byte size (Longest Processing Time First / LPT).
        // Heavy files (e.g. main.js) are queued first to saturate all worker threads immediately,
        // while small files act as gap fillers near the window barrier to prevent tail stragglers.
        sortedFiles.sort((a, b) => b.fileSize - a.fileSize);
        const dominantThreshold = Math.max(SMALL_FILE_FLOOR_BYTES, maxFileSize * DOMINANT_FILE_RATIO);
        let dominantCount = 0;
        for (const { fileSize } of sortedFiles) {
            if (fileSize >= dominantThreshold) {
                dominantCount++;
            }
            else {
                break;
            }
        }
        const dominantTargetWorkers = dominantCount > 0
            ? Math.max(1, Math.min(workerCount - 1, Math.floor(MAX_DOMINANT_WORKERS / dominantCount)))
            : 1;
        const workerTasks = [];
        for (const { filename, entries, codeFile, fileSize } of sortedFiles) {
            const mapFile = localizeMaps.get(filename);
            const codeBlob = new Blob([codeFile.contents]);
            const mapBlob = mapFile ? new Blob([mapFile.contents]) : undefined;
            let localesPerBatch;
            if (uncachedByFile.size === 1) {
                // Single file in window: shard across bounded workers to balance throughput and peak memory
                const targetWorkers = Math.min(workerCount, MAX_DOMINANT_WORKERS);
                localesPerBatch = Math.max(1, Math.ceil(entries.length / targetWorkers));
            }
            else if (fileSize < SMALL_FILE_FLOOR_BYTES) {
                // Small chunks (< 100 KB): process all locales in 1 batch to eliminate IPC overhead
                localesPerBatch = entries.length;
            }
            else if (fileSize >= dominantThreshold) {
                // Dominant file(s) with multiple files: shard across bounded workers while always reserving
                // at least one worker to process smaller chunks in parallel without starvation.
                localesPerBatch = Math.max(1, Math.ceil(entries.length / dominantTargetWorkers));
            }
            else if (uncachedByFile.size >= workerCount) {
                // Worker pool is already saturated by file-level concurrency;
                // process all locales in a single batch to avoid duplicate parsing and IPC overhead.
                localesPerBatch = entries.length;
            }
            else {
                // Intermediate files with idle workers: moderate sharding
                localesPerBatch = Math.max(1, Math.ceil(entries.length / 2));
            }
            const ephemeral = isLastWindow && entries.length <= localesPerBatch;
            for (let i = 0; i < entries.length; i += localesPerBatch) {
                const batchEntries = entries.slice(i, i + localesPerBatch);
                const task = (async () => {
                    const batchResult = await this.#runWorkerTask('inlineFileBatch', {
                        filename,
                        code: codeBlob,
                        map: mapBlob,
                        locales: new Map(batchEntries.map((e) => [e.locale, e.translation])),
                        missingTranslation: this.options.missingTranslation,
                        ephemeral,
                        activeLocales,
                        generation,
                    });
                    if (batchResult.unmodified) {
                        const unmodifiedResult = {
                            file: filename,
                            messages: batchResult.messages,
                        };
                        const cachePromises = [];
                        for (const { locale, cacheKey } of batchEntries) {
                            fileResultsByLocale.get(locale)?.set(filename, unmodifiedResult);
                            if (this.#transformedFileCache && cacheKey) {
                                cachePromises.push(this.#transformedFileCache.put(cacheKey, unmodifiedResult));
                            }
                        }
                        await Promise.allSettled(cachePromises);
                    }
                    else {
                        const cachePromises = [];
                        for (const res of batchResult.results) {
                            const matchingEntry = batchEntries.find((e) => e.locale === res.locale);
                            const cacheKey = matchingEntry?.cacheKey;
                            const fileResult = {
                                file: filename,
                                code: res.code,
                                map: res.map,
                                messages: res.messages,
                            };
                            if (this.#transformedFileCache && cacheKey) {
                                cachePromises.push(this.#transformedFileCache.put(cacheKey, fileResult));
                            }
                            fileResultsByLocale.get(res.locale)?.set(filename, fileResult);
                        }
                        await Promise.allSettled(cachePromises);
                    }
                })();
                workerTasks.push(task);
            }
        }
        await Promise.all(workerTasks);
    }
    #runWorkerTask(name, request) {
        return this.#workerPool.run(request, {
            filename: INLINER_WORKER_PATH,
            name,
        });
    }
    /**
     * Performs inlining of translations for the provided locale and translations.
     *
     * @param files The build output files to transform.
     * @param locale The string representing the locale to inline.
     * @param translation The translation messages to use when inlining.
     * @param translationIntegrity An optional integrity value for the translation messages to use for caching.
     * @returns A promise that resolves to an array of OutputFiles representing a translated result.
     */
    async inlineForLocale(files, locale, translation, translationIntegrity) {
        const results = await this.inlineAll(files, [{ locale, translation, translationIntegrity }]);
        const result = results.get(locale);
        (0, node_assert_1.default)(result !== undefined, `Result for locale '${locale}' should be present.`);
        return result;
    }
    async inlineTemplateUpdate(locale, translation, templateCode, templateId, translationIntegrity) {
        const hasLocalize = templateCode.includes(LOCALIZE_KEYWORD);
        if (!hasLocalize) {
            return {
                code: templateCode,
                errors: [],
                warnings: [],
            };
        }
        const { output, messages } = await this.#runWorkerTask('inlineCode', {
            code: templateCode,
            filename: templateId,
            locale,
            missingTranslation: this.options.missingTranslation,
            translation: await serializeTranslation(translation, translationIntegrity, this.#translationCache),
        });
        const errors = [];
        const warnings = [];
        for (const message of messages) {
            if (message.type === 'error') {
                errors.push(message.message);
            }
            else {
                warnings.push(message.message);
            }
        }
        return {
            code: output,
            errors,
            warnings,
        };
    }
    /**
     * Stops all active transformation tasks and shuts down all workers.
     * @returns A void promise that resolves when closing is complete.
     */
    async close() {
        await Promise.allSettled([
            this.#cacheStore?.close(),
            this.#ownsWorkerPool ? this.#workerPool.destroy() : undefined,
        ]);
    }
    /**
     * Initializes the cache for storing translated bundles.
     * If the cache is already initialized, it does nothing.
     *
     * @returns A promise that resolves once the cache initialization process is complete.
     */
    async initCache() {
        if (this.#cacheStore || this.#cacheInitFailed) {
            return;
        }
        const { persistentCachePath } = this.options;
        // Webcontainers currently do not support this persistent cache store.
        if (!persistentCachePath || process.versions.webcontainer) {
            return;
        }
        // Initialize a persistent cache for i18n transformations.
        try {
            const [, cacheStore] = await Promise.all([
                (0, hash_1.initializeHash)(),
                (0, cache_1.createPersistentCacheStore)((0, node_path_1.join)(persistentCachePath, 'angular-i18n')),
            ]);
            this.#cacheStore = cacheStore;
            this.#transformedFileCache = cacheStore.createCache('transforms');
            this.#translationCache = cacheStore.createCache('translations');
        }
        catch {
            this.#cacheInitFailed = true;
            // eslint-disable-next-line no-console
            console.warn('Unable to initialize JavaScript cache storage.\n' +
                'This will not affect the build output content but may result in slower builds.');
        }
    }
}
exports.I18nInliner = I18nInliner;
//# sourceMappingURL=i18n-inliner.js.map
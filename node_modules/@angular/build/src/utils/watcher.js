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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParcelExternalManager = exports.ChangedFiles = void 0;
exports.setupWatcher = setupWatcher;
exports.toPosixPathNormalized = toPosixPathNormalized;
exports.getDirectoryPath = getDirectoryPath;
exports.createWatcher = createWatcher;
exports.isPathInside = isPathInside;
exports.extractNodeModulesPackageDir = extractNodeModulesPackageDir;
const node_events_1 = require("node:events");
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const picomatch_1 = __importDefault(require("picomatch"));
const environment_options_1 = require("./environment-options");
const path_1 = require("./path");
class ChangedFiles {
    added = new Set();
    modified = new Set();
    removed = new Set();
    get all() {
        return Array.from(new Set([...this.added, ...this.modified, ...this.removed]));
    }
    toDebugString() {
        const content = {
            added: Array.from(this.added),
            modified: Array.from(this.modified),
            removed: Array.from(this.removed),
        };
        return JSON.stringify(content, null, 2);
    }
}
exports.ChangedFiles = ChangedFiles;
const NODE_MODULES = 'node_modules';
const NODE_MODULES_SEGMENT = `/${NODE_MODULES}/`;
// Watch workspace for package manager changes
const packageWatchFiles = [
    // manifest can affect module resolution
    'package.json',
    // npm lock file
    'package-lock.json',
    // pnpm lock file
    'pnpm-lock.yaml',
    // yarn lock file including Yarn PnP manifest files (https://yarnpkg.com/advanced/pnp-spec/)
    'yarn.lock',
    '.pnp.cjs',
    '.pnp.data.json',
];
/**
 * Sets up and initializes a file watcher with proper ignore patterns for build outputs and caches.
 */
async function setupWatcher(options) {
    const { workspaceRoot, projectRoot, outputPath, cacheOptions, poll, preserveSymlinks, signal, watchFiles, } = options;
    const normalizedOutputBase = (0, path_1.toPosixPath)(outputPath);
    const normalizedCacheBase = (0, path_1.toPosixPath)(cacheOptions.basePath);
    const ignored = [
        // Ignore the output and cache paths to avoid infinite rebuild cycles
        normalizedOutputBase,
        `${normalizedOutputBase}/**`,
        normalizedCacheBase,
        `${normalizedCacheBase}/**`,
        `${(0, path_1.toPosixPath)(workspaceRoot)}/**/.*/**`,
    ];
    if (cacheOptions.localBasePath && cacheOptions.localBasePath !== cacheOptions.basePath) {
        const normalizedLocalCacheBase = (0, path_1.toPosixPath)(cacheOptions.localBasePath);
        ignored.push(normalizedLocalCacheBase, `${normalizedLocalCacheBase}/**`);
    }
    if (environment_options_1.shouldWatchRoot && !preserveSymlinks) {
        // Ignore all node modules directories to avoid excessive file watchers.
        // Package changes are handled below by watching manifest and lock files.
        // NOTE: this is not enabled when preserveSymlinks is true as this would break `npm link` usages.
        ignored.push(`**/${NODE_MODULES}/**`);
    }
    const watcher = await createWatcher({
        polling: typeof poll === 'number',
        interval: poll,
        followSymlinks: preserveSymlinks,
        ignored,
        cwd: workspaceRoot,
    });
    // Setup abort support
    if (signal) {
        const onAbort = () => void watcher.close();
        signal.addEventListener('abort', onAbort, { once: true });
        const originalClose = watcher.close.bind(watcher);
        watcher.close = async () => {
            signal.removeEventListener('abort', onAbort);
            await originalClose();
        };
    }
    // Watch the entire project root if 'NG_BUILD_WATCH_ROOT' environment variable is set
    if (environment_options_1.shouldWatchRoot) {
        if (!preserveSymlinks) {
            watcher.add(packageWatchFiles
                .map((file) => path.join(workspaceRoot, file))
                .filter((file) => fs.existsSync(file)));
        }
        watcher.add(projectRoot);
    }
    if (watchFiles) {
        watcher.add(Array.isArray(watchFiles) ? watchFiles : Array.from(watchFiles));
    }
    return watcher;
}
/**
 * Probes the filesystem at the specified target directory to determine whether it is case-sensitive.
 */
function isFileSystemCaseSensitive(targetDir = process.cwd()) {
    try {
        const resolved = path.resolve(targetDir);
        if (!fs.existsSync(resolved)) {
            return process.platform !== 'win32' && process.platform !== 'darwin';
        }
        // Invert the casing of the target directory path.
        const altCase = resolved === resolved.toLowerCase() ? resolved.toUpperCase() : resolved.toLowerCase();
        // If the path contains no alphabetic characters (e.g. root '/'), invert-casing
        // produces the exact same string. Fall back to platform-specific defaults in this case.
        if (resolved === altCase) {
            return process.platform !== 'win32' && process.platform !== 'darwin';
        }
        // If both the original path and the inverted-casing path exist on disk,
        // the filesystem is case-insensitive (returns false).
        return !fs.existsSync(altCase);
    }
    catch {
        // If an error occurs (e.g., permission denied), default to the platform-specific
        // behavior (case-insensitive on Windows/macOS, sensitive on Linux/Unix).
        return process.platform !== 'win32' && process.platform !== 'darwin';
    }
}
/**
 * Normalizes a file system path string to POSIX format (forward slashes '/')
 * and strips trailing slashes (except root '/' or Windows drive root 'C:/').
 */
function toPosixPathNormalized(pathString) {
    let posixPath = (0, path_1.toPosixPath)(pathString);
    if (posixPath.length > 1 && posixPath.endsWith('/') && !/^[a-zA-Z]:\/$/.test(posixPath)) {
        posixPath = posixPath.slice(0, -1);
    }
    return posixPath;
}
/**
 * Returns a lookup key for set lookups and matching, lowercasing on case-insensitive file systems.
 */
function toLookupKey(posixPath, isCaseSensitive) {
    return isCaseSensitive ? posixPath : posixPath.toLowerCase();
}
/**
 * Returns the parent directory of a normalized POSIX path, correctly handling Windows drive roots.
 */
function getDirectoryPath(posixPath) {
    const lastSlash = posixPath.lastIndexOf('/');
    if (lastSlash === -1) {
        return '.';
    }
    const dir = posixPath.slice(0, lastSlash);
    if (dir === '' || dir.endsWith(':')) {
        return dir + '/';
    }
    return dir;
}
/**
 * Determines whether a file path lookup key or any of its parent directories are present in watchedFiles.
 */
function isPathWatched(fileLookupKey, watchedFiles) {
    if (watchedFiles.has(fileLookupKey)) {
        return true;
    }
    let current = fileLookupKey;
    while (true) {
        const parent = getDirectoryPath(current);
        if (parent === current) {
            break;
        }
        if (watchedFiles.has(parent)) {
            return true;
        }
        current = parent;
    }
    return false;
}
class WatcherQueue {
    debounceMs;
    maxWaitMs;
    nextQueue = [];
    currentChangedFiles;
    isClosed = false;
    timeoutId;
    firstChangeTime;
    constructor(debounceMs = 100, maxWaitMs = 500) {
        this.debounceMs = debounceMs;
        this.maxWaitMs = maxWaitMs;
    }
    addChange(type, file) {
        if (this.isClosed) {
            return;
        }
        const changedFiles = (this.currentChangedFiles ??= new ChangedFiles());
        changedFiles[type].add(file);
        this.scheduleFlush();
    }
    addChanges(changes) {
        if (this.isClosed || changes.length === 0) {
            return;
        }
        const changedFiles = (this.currentChangedFiles ??= new ChangedFiles());
        for (const { type, file } of changes) {
            changedFiles[type].add(file);
        }
        this.scheduleFlush();
    }
    scheduleFlush() {
        const now = Date.now();
        const firstChangeTime = (this.firstChangeTime ??= now);
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
        const elapsed = now - firstChangeTime;
        const remainingMaxWait = Math.max(0, this.maxWaitMs - elapsed);
        const delay = Math.min(this.debounceMs, remainingMaxWait);
        this.timeoutId = setTimeout(() => {
            this.timeoutId = undefined;
            this.flush();
        }, delay);
    }
    flush() {
        this.firstChangeTime = undefined;
        if (this.currentChangedFiles &&
            this.currentChangedFiles.all.length > 0 &&
            this.nextQueue.length > 0) {
            const next = this.nextQueue.shift();
            if (next) {
                const result = this.currentChangedFiles;
                this.currentChangedFiles = undefined;
                next(result);
            }
        }
    }
    async next() {
        if (this.currentChangedFiles &&
            this.currentChangedFiles.all.length > 0 &&
            this.nextQueue.length === 0 &&
            !this.timeoutId) {
            const result = { value: this.currentChangedFiles };
            this.currentChangedFiles = undefined;
            return result;
        }
        if (this.isClosed) {
            return { done: true, value: undefined };
        }
        return new Promise((resolve) => {
            this.nextQueue.push((value) => resolve(value ? { value } : { done: true, value: undefined }));
        });
    }
    close() {
        if (this.isClosed) {
            return;
        }
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = undefined;
        }
        this.firstChangeTime = undefined;
        this.isClosed = true;
        this.currentChangedFiles = undefined;
        let next;
        while ((next = this.nextQueue.shift()) !== undefined) {
            next();
        }
    }
}
async function createWatcher(options) {
    if (options?.polling || options?.followSymlinks) {
        return createChokidarWatcher(options);
    }
    try {
        const parcelWatcher = await Promise.resolve().then(() => __importStar(require('@parcel/watcher')));
        return await createParcelWatcher(options, parcelWatcher);
    }
    catch {
        return createChokidarWatcher(options);
    }
}
/**
 * Checks whether a file path is located inside a parent directory.
 *
 * Input Expectations:
 * - Both `file` and `dir` must be normalized POSIX-style paths (using forward slashes '/').
 * - Both paths must share the same casing normalization (e.g., lowercased on case-insensitive file systems).
 */
function isPathInside(file, dir) {
    if (file === dir) {
        return false;
    }
    const dirWithSlash = dir.endsWith('/') ? dir : dir + '/';
    return file.startsWith(dirWithSlash);
}
/**
 * Extracts the package directory inside node_modules for a given POSIX path.
 *
 * Input Expectations:
 * - `posixPath` must be a normalized POSIX-style path (using forward slashes '/').
 */
function extractNodeModulesPackageDir(posixPath) {
    const index = posixPath.lastIndexOf(NODE_MODULES_SEGMENT);
    if (index === -1) {
        return undefined;
    }
    const nodeModulesPath = posixPath.slice(0, index + NODE_MODULES_SEGMENT.length - 1);
    const remainder = posixPath.slice(index + NODE_MODULES_SEGMENT.length);
    const segments = remainder.split('/');
    if (segments.length === 0 || !segments[0]) {
        return undefined;
    }
    if (segments[0].startsWith('@')) {
        if (segments.length < 2 || !segments[1]) {
            return undefined;
        }
        return `${nodeModulesPath}/${segments[0]}/${segments[1]}`;
    }
    return `${nodeModulesPath}/${segments[0]}`;
}
/**
 * Maximum number of concurrent external directory subscriptions before coalescing
 * sibling/cousin directories into common ancestor directories.
 * Kept well below macOS's ~512 per-process FSEvents stream limit.
 */
const DEFAULT_MAX_EXTERNAL_SUBSCRIPTIONS = 256;
/**
 * Checks whether any strict ancestor of the given trie node is already marked as a target.
 */
function hasTargetAncestor(node) {
    let current = node.parent;
    while (current) {
        if (current.isTarget) {
            return true;
        }
        current = current.parent;
    }
    return false;
}
/**
 * Manages `@parcel/watcher` directory subscriptions for watched files located outside the
 * primary `workspaceRoot`.
 *
 * Because `@parcel/watcher` watches directories recursively and macOS limits each process to
 * ~512 concurrent `FSEvents` streams, this manager:
 * - Normalizes external `node_modules` file paths to their package root directory.
 * - Batches synchronous `watchFile` and `removeFile` calls within a microtask before subscribing.
 * - Uses a directory prefix tree to subsume nested child directories and iteratively coalesce
 *   deepest branching subdirectories into common ancestors when the subscription budget is exceeded.
 * - Dynamically lowers its subscription budget and coalesces further if `subscribe()` fails on
 *   an existing directory due to OS stream limits.
 */
class ParcelExternalManager {
    /** Active `@parcel/watcher` subscriptions keyed by subscribed directory lookup key. */
    #extraSubscriptions = new Map();
    /** Reference-counted watched files grouped by their target external directory lookup key. */
    #externalDirFiles = new Map();
    /** Reverse lookup mapping each watched file lookup key to its target directory lookup key. */
    #fileToDirKey = new Map();
    /** The `@parcel/watcher` module instance. */
    #parcelWatcher;
    /** Watcher configuration options including ignore patterns. */
    #options;
    /** Normalized POSIX path of the primary watched workspace root. */
    #rootDirPosix;
    /** Case-normalized lookup key of the primary watched workspace root. */
    #rootDirLookupKey;
    /** Whether the underlying filesystem is case-sensitive. */
    #isCaseSensitive;
    /** Callback invoked when `@parcel/watcher` emits filesystem events. */
    #handleEvents;
    /** Current maximum number of concurrent external directory subscriptions allowed before coalescing. */
    #maxSubscriptions;
    /** Whether external directory state has changed and requires a reconciliation pass. */
    #needsReconcile = false;
    /** Whether obsolete subscriptions should be unsubscribed before creating new ones (used after stream limit errors). */
    #shrinkBeforeSubscribe = false;
    /** In-flight promise for the currently scheduled or running reconciliation loop. */
    #reconcilePromise;
    /** Whether this manager has been closed. */
    #isClosed = false;
    /**
     * Creates a new external directory subscription manager for `@parcel/watcher`.
     *
     * @param parcelWatcher The `@parcel/watcher` module.
     * @param options Watcher configuration options.
     * @param rootDirPosix Normalized POSIX path of the primary workspace root.
     * @param rootDirLookupKey Case-normalized lookup key of the primary workspace root.
     * @param isCaseSensitive Whether the filesystem at the workspace root is case-sensitive.
     * @param handleEvents Callback to process incoming `@parcel/watcher` events.
     * @param maxSubscriptions Maximum number of concurrent external directory subscriptions before coalescing.
     */
    constructor(parcelWatcher, options, rootDirPosix, rootDirLookupKey, isCaseSensitive, handleEvents, maxSubscriptions = DEFAULT_MAX_EXTERNAL_SUBSCRIPTIONS) {
        this.#parcelWatcher = parcelWatcher;
        this.#options = options;
        this.#rootDirPosix = rootDirPosix;
        this.#rootDirLookupKey = rootDirLookupKey;
        this.#isCaseSensitive = isCaseSensitive;
        this.#handleEvents = handleEvents;
        this.#maxSubscriptions = Math.max(1, maxSubscriptions);
    }
    /**
     * Registers a file path to be watched if it resides outside the primary workspace root,
     * and schedules an asynchronous subscription reconciliation pass if needed.
     *
     * @param posixPath Normalized POSIX file path preserving original casing.
     * @param lookupKey Case-normalized lookup key for the file path.
     */
    watchFile(posixPath, lookupKey) {
        if (this.#isClosed ||
            isPathInside(lookupKey, this.#rootDirLookupKey) ||
            lookupKey === this.#rootDirLookupKey) {
            return;
        }
        const pkgDir = extractNodeModulesPackageDir(posixPath);
        const dirPath = pkgDir ?? getDirectoryPath(posixPath);
        const dirKey = pkgDir
            ? toLookupKey(pkgDir, this.#isCaseSensitive)
            : getDirectoryPath(lookupKey);
        this.#fileToDirKey.set(lookupKey, dirKey);
        let dirEntry = this.#externalDirFiles.get(dirKey);
        const isNewDir = !dirEntry;
        if (!dirEntry) {
            dirEntry = { dirPath, files: new Set() };
            this.#externalDirFiles.set(dirKey, dirEntry);
        }
        dirEntry.files.add(lookupKey);
        if (isNewDir || !this.#isCoveredByActiveSubscription(dirKey)) {
            this.#scheduleReconcile();
        }
    }
    /**
     * Unregisters a previously watched external file and schedules a reconciliation pass
     * if it was the last watched file in its target directory.
     *
     * @param lookupKey Case-normalized lookup key for the file path to remove.
     */
    removeFile(lookupKey) {
        const dirKey = this.#fileToDirKey.get(lookupKey);
        if (!dirKey) {
            return;
        }
        this.#fileToDirKey.delete(lookupKey);
        const dirEntry = this.#externalDirFiles.get(dirKey);
        if (dirEntry) {
            dirEntry.files.delete(lookupKey);
            if (dirEntry.files.size === 0) {
                this.#externalDirFiles.delete(dirKey);
                this.#scheduleReconcile();
            }
        }
    }
    /**
     * Waits for any scheduled or in-progress subscription reconciliation pass to complete.
     */
    async flush() {
        if (this.#reconcilePromise) {
            await this.#reconcilePromise;
        }
    }
    /**
     * Closes the manager, awaiting any pending reconciliation and unsubscribing all active
     * external directory subscriptions.
     */
    async close() {
        this.#isClosed = true;
        this.#needsReconcile = false;
        try {
            if (this.#reconcilePromise) {
                await this.#reconcilePromise.catch(() => { });
            }
            if (this.#extraSubscriptions.size > 0) {
                await Promise.allSettled(Array.from(this.#extraSubscriptions.values(), (sub) => sub.unsubscribe()));
            }
        }
        finally {
            this.#extraSubscriptions.clear();
            this.#externalDirFiles.clear();
            this.#fileToDirKey.clear();
        }
    }
    /**
     * Schedules a microtask to reconcile active `@parcel/watcher` subscriptions with the
     * current set of external directories.
     */
    #scheduleReconcile() {
        if (this.#isClosed) {
            return;
        }
        this.#needsReconcile = true;
        this.#reconcilePromise ??= Promise.resolve()
            .then(() => this.#runReconcileLoop())
            .finally(() => {
            this.#reconcilePromise = undefined;
        });
    }
    /**
     * Continuously executes reconciliation passes until no further changes are pending.
     */
    async #runReconcileLoop() {
        while (this.#needsReconcile && !this.#isClosed) {
            this.#needsReconcile = false;
            await this.#reconcileOnce();
        }
    }
    /**
     * Performs a single reconciliation pass: computes the desired coalesced directory set,
     * subscribes to newly required directories, unsubscribes obsolete directories, and
     * triggers fallback coalescing if OS stream limits are encountered.
     */
    async #reconcileOnce() {
        const desiredDirs = this.#computeDesiredDirectories();
        if (this.#shrinkBeforeSubscribe) {
            this.#shrinkBeforeSubscribe = false;
            const toUnsubscribe = [];
            for (const [existingKey, sub] of this.#extraSubscriptions.entries()) {
                if (!desiredDirs.has(existingKey)) {
                    this.#extraSubscriptions.delete(existingKey);
                    toUnsubscribe.push(sub.unsubscribe().catch(() => { }));
                }
            }
            if (toUnsubscribe.length > 0) {
                await Promise.allSettled(toUnsubscribe);
            }
        }
        if (this.#isClosed) {
            return;
        }
        const toSubscribe = [];
        for (const [dirKey, dirPath] of desiredDirs.entries()) {
            if (!this.#extraSubscriptions.has(dirKey)) {
                toSubscribe.push([dirKey, dirPath]);
            }
        }
        let hadExistingDirFailure = false;
        if (toSubscribe.length > 0) {
            await Promise.allSettled(toSubscribe.map(async ([dirKey, dirPath]) => {
                const ignore = isPathInside(this.#rootDirLookupKey, dirKey)
                    ? [...(this.#options?.ignored ?? []), this.#rootDirPosix, `${this.#rootDirPosix}/**`]
                    : this.#options?.ignored;
                try {
                    const sub = await this.#parcelWatcher.subscribe(dirPath, (err, events) => {
                        if (!err) {
                            this.#handleEvents(events);
                        }
                    }, { ignore });
                    if (this.#isClosed) {
                        await sub.unsubscribe().catch(() => { });
                        return;
                    }
                    this.#extraSubscriptions.set(dirKey, sub);
                }
                catch {
                    // Ignore errors for missing directories; if the directory exists on disk,
                    // mark failure so the manager can coalesce further if over OS stream limits.
                    if (!this.#isClosed && fs.existsSync(dirPath)) {
                        hadExistingDirFailure = true;
                    }
                }
            }));
        }
        if (this.#isClosed) {
            return;
        }
        // Unsubscribe any previous subscriptions that are no longer desired and whose
        // remaining watched files (if any) are now covered by another active subscription.
        for (const [existingKey, sub] of this.#extraSubscriptions.entries()) {
            if (!desiredDirs.has(existingKey) && this.#canRemoveSubscription(existingKey)) {
                this.#extraSubscriptions.delete(existingKey);
                sub.unsubscribe().catch(() => { });
            }
        }
        // If subscribing to an existing directory failed (e.g. macOS FSEvents per-process limit),
        // dynamically lower the subscription budget and re-reconcile to coalesce into ancestors.
        if (hadExistingDirFailure && desiredDirs.size > 1 && this.#maxSubscriptions > 1) {
            const nextMax = this.#extraSubscriptions.size > 0
                ? Math.max(1, Math.floor(this.#extraSubscriptions.size / 2))
                : Math.max(1, Math.floor(Math.min(this.#maxSubscriptions, desiredDirs.size) / 2));
            if (nextMax < desiredDirs.size && nextMax < this.#maxSubscriptions) {
                this.#maxSubscriptions = nextMax;
                this.#shrinkBeforeSubscribe = true;
                this.#needsReconcile = true;
            }
        }
    }
    /**
     * Checks whether a directory lookup key is already covered by an active subscription.
     */
    #isCoveredByActiveSubscription(dirLookupKey) {
        for (const existingDir of this.#extraSubscriptions.keys()) {
            if (dirLookupKey === existingDir || isPathInside(dirLookupKey, existingDir)) {
                return true;
            }
        }
        return false;
    }
    /**
     * Determines whether an existing subscription can be safely removed without leaving
     * any remaining watched target directories uncovered.
     */
    #canRemoveSubscription(subKey) {
        for (const targetDirKey of this.#externalDirFiles.keys()) {
            if (targetDirKey === subKey || isPathInside(targetDirKey, subKey)) {
                let coveredByOther = false;
                for (const otherSubKey of this.#extraSubscriptions.keys()) {
                    if (otherSubKey !== subKey &&
                        (targetDirKey === otherSubKey || isPathInside(targetDirKey, otherSubKey))) {
                        coveredByOther = true;
                        break;
                    }
                }
                if (!coveredByOther) {
                    return false;
                }
            }
        }
        return true;
    }
    /**
     * Computes the minimal set of external directories to subscribe to (mapped from `dirKey` to `dirPath`),
     * subsuming nested directories and coalescing branching ancestors to stay within `#maxSubscriptions`.
     */
    #computeDesiredDirectories() {
        if (this.#externalDirFiles.size === 0) {
            return new Map();
        }
        const nodesByKey = new Map();
        const roots = [];
        for (const [dirKey, { dirPath }] of this.#externalDirFiles.entries()) {
            const chain = [];
            let currentKey = dirKey;
            let currentPath = dirPath;
            while (true) {
                chain.push({ dirKey: currentKey, dirPath: currentPath });
                const parentKey = getDirectoryPath(currentKey);
                if (parentKey === currentKey) {
                    break;
                }
                currentKey = parentKey;
                currentPath = getDirectoryPath(currentPath);
            }
            let parentNode;
            for (let i = chain.length - 1; i >= 0; i--) {
                const { dirKey: nodeKey, dirPath: nodePath } = chain[i];
                const depth = chain.length - 1 - i;
                let node = nodesByKey.get(nodeKey);
                if (!node) {
                    node = {
                        dirKey: nodeKey,
                        dirPath: nodePath,
                        depth,
                        parent: parentNode,
                        children: new Map(),
                        isTarget: false,
                        leafCount: 0,
                    };
                    nodesByKey.set(nodeKey, node);
                    if (parentNode) {
                        parentNode.children.set(nodeKey, node);
                    }
                    else {
                        roots.push(node);
                    }
                }
                parentNode = node;
            }
            if (parentNode) {
                parentNode.isTarget = true;
            }
        }
        const initSubtree = (node) => {
            if (node.isTarget) {
                node.children.clear();
                node.leafCount = 1;
                return 1;
            }
            let count = 0;
            for (const child of node.children.values()) {
                count += initSubtree(child);
            }
            node.leafCount = count;
            return count;
        };
        let totalLeaves = 0;
        for (const root of roots) {
            totalLeaves += initSubtree(root);
        }
        if (totalLeaves > this.#maxSubscriptions) {
            // Tier 1: non-ancestors of workspaceRoot (e.g., <monorepo>/libs, <monorepo>/node_modules)
            // Tier 2: ancestors of workspaceRoot (e.g., <monorepo> when sibling apps/libs are directly under it)
            const tier1ByDepth = new Map();
            const tier2ByDepth = new Map();
            const collectInternalNodes = (node) => {
                if (node.isTarget) {
                    return;
                }
                if (node.parent !== undefined && node.leafCount > 1) {
                    const isWorkspaceAncestor = isPathInside(this.#rootDirLookupKey, node.dirKey);
                    const bucketMap = isWorkspaceAncestor ? tier2ByDepth : tier1ByDepth;
                    let bucket = bucketMap.get(node.depth);
                    if (!bucket) {
                        bucket = [];
                        bucketMap.set(node.depth, bucket);
                    }
                    bucket.push(node);
                }
                for (const child of node.children.values()) {
                    collectInternalNodes(child);
                }
            };
            for (const root of roots) {
                collectInternalNodes(root);
            }
            const collapseTier = (byDepth) => {
                const sortedLevels = Array.from(byDepth.entries()).sort(([a], [b]) => b - a);
                for (const [, nodes] of sortedLevels) {
                    if (totalLeaves <= this.#maxSubscriptions) {
                        return;
                    }
                    const candidates = nodes
                        .filter((n) => n.leafCount > 1 && !hasTargetAncestor(n))
                        .sort((a, b) => b.leafCount - a.leafCount || a.dirKey.localeCompare(b.dirKey));
                    for (const candidate of candidates) {
                        if (totalLeaves <= this.#maxSubscriptions) {
                            return;
                        }
                        if (candidate.leafCount <= 1 || hasTargetAncestor(candidate)) {
                            continue;
                        }
                        const reduction = candidate.leafCount - 1;
                        candidate.isTarget = true;
                        candidate.children.clear();
                        candidate.leafCount = 1;
                        totalLeaves -= reduction;
                        let ancestor = candidate.parent;
                        while (ancestor) {
                            ancestor.leafCount -= reduction;
                            ancestor = ancestor.parent;
                        }
                    }
                }
            };
            collapseTier(tier1ByDepth);
            if (totalLeaves > this.#maxSubscriptions) {
                collapseTier(tier2ByDepth);
            }
        }
        const desired = new Map();
        const collectTargets = (node) => {
            if (node.isTarget) {
                desired.set(node.dirKey, node.dirPath);
                return;
            }
            for (const child of node.children.values()) {
                collectTargets(child);
            }
        };
        for (const root of roots) {
            collectTargets(root);
        }
        return desired;
    }
}
exports.ParcelExternalManager = ParcelExternalManager;
async function createParcelWatcher(options, parcelWatcher) {
    const watchedFiles = new Set();
    const queue = new WatcherQueue();
    const isCaseSensitive = isFileSystemCaseSensitive(options?.cwd);
    const rootDirPosix = toPosixPathNormalized(options?.cwd ?? process.cwd());
    const rootDirLookupKey = toLookupKey(rootDirPosix, isCaseSensitive);
    const initTime = Date.now();
    const handleEvents = (events) => {
        const changes = [];
        for (const event of events) {
            const posixPath = toPosixPathNormalized(event.path);
            const lookupKey = toLookupKey(posixPath, isCaseSensitive);
            if (!isPathWatched(lookupKey, watchedFiles)) {
                continue;
            }
            if (event.type !== 'delete') {
                const stat = fs.statSync(event.path, { throwIfNoEntry: false });
                // Ignore historical events from before watcher initialization, but allow a 1000 ms window
                // to account for coarse filesystem timestamp resolution (e.g., ext4/overlayfs integer second
                // mtime truncation on Linux) where files modified during startup may have truncated .000 ms mtimes.
                if (stat && stat.mtimeMs < initTime - 1000) {
                    continue;
                }
            }
            const type = event.type === 'create' ? 'added' : event.type === 'delete' ? 'removed' : 'modified';
            changes.push({ type, file: event.path });
        }
        if (changes.length > 0) {
            queue.addChanges(changes);
        }
    };
    const subscription = await parcelWatcher.subscribe(rootDirPosix, (err, events) => {
        if (!err) {
            handleEvents(events);
        }
    }, {
        ignore: options?.ignored,
    });
    const externalManager = new ParcelExternalManager(parcelWatcher, options, rootDirPosix, rootDirLookupKey, isCaseSensitive, handleEvents);
    const buildWatcher = {
        [Symbol.asyncIterator]() {
            return this;
        },
        next() {
            return queue.next();
        },
        add(paths) {
            const targets = typeof paths === 'string' ? [paths] : paths;
            for (const file of targets) {
                const posixPath = toPosixPathNormalized(file);
                const lookupKey = toLookupKey(posixPath, isCaseSensitive);
                if (!watchedFiles.has(lookupKey)) {
                    watchedFiles.add(lookupKey);
                    externalManager.watchFile(posixPath, lookupKey);
                }
            }
        },
        remove(paths) {
            const targets = typeof paths === 'string' ? [paths] : paths;
            for (const file of targets) {
                const posixPath = toPosixPathNormalized(file);
                const lookupKey = toLookupKey(posixPath, isCaseSensitive);
                if (watchedFiles.delete(lookupKey)) {
                    externalManager.removeFile(lookupKey);
                }
            }
        },
        async close() {
            try {
                if (subscription) {
                    await subscription.unsubscribe();
                }
                await externalManager.close();
            }
            finally {
                queue.close();
            }
        },
    };
    return buildWatcher;
}
/**
 * Manages selective node_modules watching for Chokidar.
 *
 * During Chokidar's initial scan, the allowed packages set is empty, causing Chokidar to prune the entire
 * node_modules directory immediately and avoid blocking the 'ready' event for minutes.
 * Packages are dynamically allowed and watched at the package root level as files are added via `watcher.add`.
 * Tracking files per package allows reference-counting so that package directories are unwatched when no
 * longer needed.
 */
class ChokidarNodeModulesManager {
    isCaseSensitive;
    allowedPackages = new Map();
    constructor(isCaseSensitive) {
        this.isCaseSensitive = isCaseSensitive;
    }
    registerPackage(posixPath, lookupKey) {
        const packageDir = extractNodeModulesPackageDir(posixPath);
        if (!packageDir) {
            return { isPackage: false };
        }
        const packageKey = toLookupKey(packageDir, this.isCaseSensitive);
        let watchedInPkg = this.allowedPackages.get(packageKey);
        if (!watchedInPkg) {
            watchedInPkg = new Set();
            this.allowedPackages.set(packageKey, watchedInPkg);
            watchedInPkg.add(lookupKey);
            return { isPackage: true, newPkgDir: packageDir };
        }
        watchedInPkg.add(lookupKey);
        return { isPackage: true };
    }
    removePackageFile(posixPath, lookupKey) {
        const packageDir = extractNodeModulesPackageDir(posixPath);
        if (!packageDir) {
            return { isPackage: false };
        }
        const packageKey = toLookupKey(packageDir, this.isCaseSensitive);
        const watchedInPkg = this.allowedPackages.get(packageKey);
        if (watchedInPkg) {
            watchedInPkg.delete(lookupKey);
            if (watchedInPkg.size === 0) {
                this.allowedPackages.delete(packageKey);
                return { isPackage: true, unwatchPkgDir: packageDir };
            }
        }
        return { isPackage: true };
    }
    isIgnored(filePath) {
        // Fast path: avoid expensive normalization for non-node_modules files
        if (!filePath.includes(NODE_MODULES)) {
            return false;
        }
        const posixPath = toPosixPathNormalized(filePath);
        const lookupKey = toLookupKey(posixPath, this.isCaseSensitive);
        if (!`${lookupKey}/`.includes(NODE_MODULES_SEGMENT)) {
            return false;
        }
        if (this.allowedPackages.has(lookupKey)) {
            return false;
        }
        for (const pkg of this.allowedPackages.keys()) {
            if (isPathInside(lookupKey, pkg)) {
                return false;
            }
        }
        return true;
    }
}
async function createChokidarWatcher(options, chokidarModule) {
    const chokidar = chokidarModule ?? (await Promise.resolve().then(() => __importStar(require('chokidar'))));
    const watchedFiles = new Set();
    const fileStats = new Map();
    let queue;
    if (options?.polling) {
        const pollingInterval = options.interval ?? 100;
        const debounceMs = Math.min(250, Math.max(100, Math.ceil(pollingInterval * 1.5)));
        const maxWaitMs = Math.max(500, debounceMs * 3);
        queue = new WatcherQueue(debounceMs, maxWaitMs);
    }
    else {
        queue = new WatcherQueue();
    }
    const rootDir = options?.cwd ?? process.cwd();
    const isCaseSensitive = isFileSystemCaseSensitive(rootDir);
    const rootDirPosix = toPosixPathNormalized(rootDir);
    const rootDirLookupKey = toLookupKey(rootDirPosix, isCaseSensitive);
    const nodeModulesManager = new ChokidarNodeModulesManager(isCaseSensitive);
    // Strip static node_modules ignore patterns (e.g. `**/node_modules/**` from setupWatcher).
    // If left in place, picomatch would unconditionally ignore all node_modules files and override
    // our dynamic package allowlist above.
    const customIgnored = options?.ignored
        ?.filter((pattern) => !pattern.includes(NODE_MODULES))
        .map((pattern) => {
        if (/[*?[\]{}()]/.test(pattern)) {
            const isMatch = (0, picomatch_1.default)(pattern, { dot: true });
            return (filePath) => isMatch(toPosixPathNormalized(filePath));
        }
        return { path: toPosixPathNormalized(pattern), recursive: true };
    }) ?? [];
    const ignored = [...customIgnored, (filePath) => nodeModulesManager.isIgnored(filePath)];
    const watcher = chokidar.watch(rootDir, {
        ignoreInitial: true,
        ignored,
        followSymlinks: options?.followSymlinks,
        usePolling: !!options?.polling,
        interval: options?.interval,
    });
    const initTime = Date.now();
    // Wait for the watcher to complete its initial filesystem scan before returning.
    // With `ignoreInitial: true`, any file visited during the initial scan is treated as the initial baseline
    // and will not emit 'add' or 'change' events. Awaiting 'ready' ensures that rapid file modifications
    // made right after watcher setup (e.g. in rebuild tests) are not swallowed as initial files.
    await (0, node_events_1.once)(watcher, 'ready');
    const handleEvent = (type, rawPath) => {
        const posixPath = toPosixPathNormalized(rawPath);
        const lookupKey = toLookupKey(posixPath, isCaseSensitive);
        if (!isPathWatched(lookupKey, watchedFiles)) {
            return;
        }
        if (type === 'removed') {
            fileStats.delete(lookupKey);
            queue.addChange(type, rawPath);
            return;
        }
        const stat = fs.statSync(rawPath, { throwIfNoEntry: false });
        if (!stat) {
            return;
        }
        // Ignore historical events from before watcher initialization, but allow a 1000 ms window
        // to account for coarse filesystem timestamp resolution (e.g., ext4/overlayfs integer second
        // mtime truncation on Linux) where files modified during startup may have truncated .000 ms mtimes.
        if (stat.mtimeMs < initTime - 1000) {
            return;
        }
        const previousStat = fileStats.get(lookupKey);
        if (type === 'modified' &&
            previousStat &&
            previousStat.mtimeMs === stat.mtimeMs &&
            previousStat.size === stat.size) {
            return;
        }
        fileStats.set(lookupKey, { mtimeMs: stat.mtimeMs, size: stat.size });
        queue.addChange(type, rawPath);
    };
    watcher.on('add', (path) => handleEvent('added', path));
    watcher.on('change', (path) => handleEvent('modified', path));
    watcher.on('unlink', (path) => handleEvent('removed', path));
    const buildWatcher = {
        [Symbol.asyncIterator]() {
            return this;
        },
        async next() {
            const result = await queue.next();
            if (result.value) {
                const files = [...result.value.added, ...result.value.modified];
                await Promise.all(files.map(async (file) => {
                    const stat = await fs.promises.stat(file).catch(() => undefined);
                    if (stat?.isFile()) {
                        const posixPath = toPosixPathNormalized(file);
                        const lookupKey = toLookupKey(posixPath, isCaseSensitive);
                        fileStats.set(lookupKey, { mtimeMs: stat.mtimeMs, size: stat.size });
                    }
                }));
            }
            return result;
        },
        add(paths) {
            const targets = typeof paths === 'string' ? [paths] : paths;
            const newPaths = [];
            for (const p of targets) {
                const posixPath = toPosixPathNormalized(p);
                const lookupKey = toLookupKey(posixPath, isCaseSensitive);
                if (!watchedFiles.has(lookupKey)) {
                    watchedFiles.add(lookupKey);
                    // For files inside node_modules, register their package directory. Only newly encountered
                    // package directories need to be added to Chokidar.
                    const { isPackage, newPkgDir } = nodeModulesManager.registerPackage(posixPath, lookupKey);
                    if (newPkgDir) {
                        newPaths.push(newPkgDir);
                    }
                    else if (!isPackage &&
                        !isPathInside(lookupKey, rootDirLookupKey) &&
                        lookupKey !== rootDirLookupKey) {
                        newPaths.push(posixPath);
                    }
                }
            }
            if (newPaths.length > 0) {
                watcher.add(newPaths);
            }
        },
        remove(paths) {
            const targets = typeof paths === 'string' ? [paths] : paths;
            const removePaths = [];
            for (const p of targets) {
                const posixPath = toPosixPathNormalized(p);
                const lookupKey = toLookupKey(posixPath, isCaseSensitive);
                if (watchedFiles.has(lookupKey)) {
                    watchedFiles.delete(lookupKey);
                    fileStats.delete(lookupKey);
                    // When the last watched file in a package is removed, unwatch the package directory.
                    const { isPackage, unwatchPkgDir } = nodeModulesManager.removePackageFile(posixPath, lookupKey);
                    if (unwatchPkgDir) {
                        removePaths.push(unwatchPkgDir);
                    }
                    else if (!isPackage &&
                        !isPathInside(lookupKey, rootDirLookupKey) &&
                        lookupKey !== rootDirLookupKey) {
                        removePaths.push(posixPath);
                    }
                }
            }
            if (removePaths.length > 0) {
                watcher.unwatch(removePaths);
            }
        },
        async close() {
            try {
                await watcher.close();
            }
            finally {
                queue.close();
            }
        },
    };
    return buildWatcher;
}
//# sourceMappingURL=watcher.js.map
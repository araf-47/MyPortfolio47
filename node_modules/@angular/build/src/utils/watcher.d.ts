/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type * as ParcelWatcher from '@parcel/watcher';
export declare class ChangedFiles {
    readonly added: Set<string>;
    readonly modified: Set<string>;
    readonly removed: Set<string>;
    get all(): string[];
    toDebugString(): string;
}
export interface BuildWatcher extends AsyncIterableIterator<ChangedFiles> {
    add(paths: string | readonly string[]): void;
    remove(paths: string | readonly string[]): void;
    close(): Promise<void>;
}
export interface WatcherOptions {
    polling?: boolean;
    interval?: number;
    ignored?: string[];
    followSymlinks?: boolean;
    cwd?: string;
}
export interface SetupWatcherOptions {
    workspaceRoot: string;
    projectRoot: string;
    outputPath: string;
    cacheOptions: {
        basePath: string;
        localBasePath?: string;
    };
    poll?: number;
    preserveSymlinks?: boolean;
    signal?: AbortSignal;
    watchFiles?: Iterable<string>;
}
/**
 * Sets up and initializes a file watcher with proper ignore patterns for build outputs and caches.
 */
export declare function setupWatcher(options: SetupWatcherOptions): Promise<BuildWatcher>;
/**
 * Normalizes a file system path string to POSIX format (forward slashes '/')
 * and strips trailing slashes (except root '/' or Windows drive root 'C:/').
 */
export declare function toPosixPathNormalized(pathString: string): string;
/**
 * Returns the parent directory of a normalized POSIX path, correctly handling Windows drive roots.
 */
export declare function getDirectoryPath(posixPath: string): string;
export declare function createWatcher(options?: WatcherOptions): Promise<BuildWatcher>;
/**
 * Checks whether a file path is located inside a parent directory.
 *
 * Input Expectations:
 * - Both `file` and `dir` must be normalized POSIX-style paths (using forward slashes '/').
 * - Both paths must share the same casing normalization (e.g., lowercased on case-insensitive file systems).
 */
export declare function isPathInside(file: string, dir: string): boolean;
/**
 * Extracts the package directory inside node_modules for a given POSIX path.
 *
 * Input Expectations:
 * - `posixPath` must be a normalized POSIX-style path (using forward slashes '/').
 */
export declare function extractNodeModulesPackageDir(posixPath: string): string | undefined;
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
export declare class ParcelExternalManager {
    #private;
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
    constructor(parcelWatcher: typeof ParcelWatcher, options: WatcherOptions | undefined, rootDirPosix: string, rootDirLookupKey: string, isCaseSensitive: boolean, handleEvents: (events: ParcelWatcher.Event[]) => void, maxSubscriptions?: number);
    /**
     * Registers a file path to be watched if it resides outside the primary workspace root,
     * and schedules an asynchronous subscription reconciliation pass if needed.
     *
     * @param posixPath Normalized POSIX file path preserving original casing.
     * @param lookupKey Case-normalized lookup key for the file path.
     */
    watchFile(posixPath: string, lookupKey: string): void;
    /**
     * Unregisters a previously watched external file and schedules a reconciliation pass
     * if it was the last watched file in its target directory.
     *
     * @param lookupKey Case-normalized lookup key for the file path to remove.
     */
    removeFile(lookupKey: string): void;
    /**
     * Waits for any scheduled or in-progress subscription reconciliation pass to complete.
     */
    flush(): Promise<void>;
    /**
     * Closes the manager, awaiting any pending reconciliation and unsubscribing all active
     * external directory subscriptions.
     */
    close(): Promise<void>;
}

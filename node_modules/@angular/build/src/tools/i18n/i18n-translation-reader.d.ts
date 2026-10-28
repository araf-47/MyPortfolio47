/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type { ɵParsedTranslation } from '@angular/localize';
/**
 * A zero-copy reader that queries translation messages directly from a SharedArrayBuffer
 * using binary search over a sorted key index.
 */
export declare class SharedTranslationDictionary<T = ɵParsedTranslation> {
    private readonly entryCount;
    private readonly uint32Index;
    private readonly uint8Pool;
    private readonly decoder;
    private readonly encoder;
    private readonly lazyCache;
    constructor(buffer: SharedArrayBuffer);
    /**
     * Looks up a translation message by key.
     * Performs a binary search over the index table if not previously cached in the lazy cache.
     *
     * @param targetKey The message key ID to search for.
     * @returns The parsed translation message, or undefined if not found.
     */
    get(targetKey: string): T | undefined;
}
/**
 * Creates a JavaScript object Proxy wrapping a SharedTranslationDictionary so it can be passed
 * directly to `@angular/localize` inliner functions as a standard translation Record.
 *
 * Traps `get`, `has`, and `getOwnPropertyDescriptor` to fulfill all `@angular/localize` `translate()`
 * lookup requirements (`translations[id]`, `translations[legacyId]`, `Object.hasOwn(translations, id)`).
 * The `ownKeys` trap is intentionally omitted so keys are not eagerly decoded upfront upon reflection.
 *
 * @param buffer The SharedArrayBuffer containing binary encoded translation catalog.
 * @returns A Proxy object that intercepts property reads and queries the SharedTranslationDictionary.
 */
export declare function createSharedTranslationProxy<T = ɵParsedTranslation>(buffer: SharedArrayBuffer): Record<string, T>;

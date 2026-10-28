/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
/**
 * Initializes the xxHash WASM instance early to ensure synchronous hashing uses xxHash.
 */
export declare function initializeHash(): Promise<void>;
/**
 * Calculates a fast 64-bit non-cryptographic hash of the provided content.
 * Suitable for cache keys, ETags, and change detection.
 */
export declare function calculateHash(data: string | Uint8Array): string;
export interface ContentHasher {
    update(data: string | Uint8Array): ContentHasher;
    digest(): string;
}
/**
 * Creates a streaming 64-bit non-cryptographic content hasher.
 */
export declare function createContentHash(): ContentHasher;

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type { EncodedSourceMap } from '@ampproject/remapping';
export declare const SOURCEMAP_COMMENT_PREFIX = "//# sourceMappingURL=";
export declare const SOURCEMAP_COMMENT_BYTES: Buffer<ArrayBuffer>;
/**
 * Checks for a single trailing `//# sourceMappingURL=` comment on a raw buffer.
 *
 * @param data The raw byte buffer to inspect.
 * @returns An object containing the sliced code buffer and URL snippet if a single trailing comment exists,
 *          `null` if no sourcemap comment exists in the buffer, or `undefined` if multiple/non-trailing comments exist.
 */
export declare function findTrailingSourceMapComment(data: Uint8Array): {
    code: Uint8Array;
    urlLine: string;
} | null | undefined;
/**
 * Removes `//# sourceMappingURL=` comments safely from the given JavaScript code,
 * ignoring any occurrences that are inside string literals, template literals, or block comments.
 *
 * For raw Uint8Array / Buffer inputs, it optimizes performance by inspecting trailing byte sequences
 * to slice the buffer directly without full string decoding.
 *
 * @param code The JavaScript source code as a string or Uint8Array.
 * @returns The code with top-level sourcemap comments removed.
 */
export declare function removeSourceMappingURL(code: string): string;
export declare function removeSourceMappingURL(code: Uint8Array): Uint8Array;
/**
 * Checks whether a `//# sourceMappingURL=` URL line snippet represents a valid trailing comment at the end of the file.
 */
export declare function isTrailingSourceMapComment(urlLine: string): boolean;
/**
 * Resolves and loads the input sourcemap referenced in a `//# sourceMappingURL=` URL line snippet.
 * Supports inline base64 data URIs, local absolute file URLs, and relative/absolute filesystem paths.
 */
export declare function loadInputSourceMapFromUrl(filename: string, urlLine: string): EncodedSourceMap | undefined;
/**
 * Finds, resolves, and loads the input sourcemap referenced in the code's trailing
 * sourceMappingURL comment, if present. Supports inline base64 data URIs, local absolute
 * file URLs, and relative/absolute filesystem paths.
 */
export declare function loadInputSourceMap(filename: string, code: string): EncodedSourceMap | undefined;

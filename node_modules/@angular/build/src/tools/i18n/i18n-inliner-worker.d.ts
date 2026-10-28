/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
/**
 * The options passed to the inliner for each code request
 */
export interface InlineCodeRequest {
    /**
     * The code that should be processed.
     */
    code: string;
    /**
     * The filename to use in error and warning messages for the provided code.
     */
    filename: string;
    /**
     * The locale specifier that should be used during the inlining process of the file.
     */
    locale: string;
    /**
     * The serialized translation messages for the locale that should be used during the inlining
     * process of the file. A SharedArrayBuffer or Blob is used so that the messages are shared with
     * the Worker by reference instead of being copied into it for every request.
     */
    translation?: Blob | SharedArrayBuffer;
    /**
     * How to handle missing translations.
     */
    missingTranslation?: 'error' | 'warning' | 'ignore';
}
/**
 * The response returned from a code request.
 */
export interface InlineCodeResult {
    output: string;
    messages: {
        type: 'error' | 'warning';
        message: string;
    }[];
}
/**
 * The options passed to the inliner for a batch file request
 */
export interface InlineFileBatchRequest {
    /**
     * The filename that should be processed.
     */
    filename: string;
    /**
     * The file content as a Blob.
     */
    code: Blob;
    /**
     * Optional sourcemap content as a Blob.
     */
    map?: Blob;
    /**
     * The locale specifiers and optional translations to use during the inlining process of the file.
     */
    locales: ReadonlyMap<string, Blob | SharedArrayBuffer | undefined>;
    /**
     * How to handle missing translations.
     */
    missingTranslation?: 'error' | 'warning' | 'ignore';
    /**
     * Whether the file data should be treated as ephemeral and not cached long-term in the Worker.
     * Typically true when all remaining locales for the file are processed in a single batch.
     */
    ephemeral?: boolean;
    /**
     * The list of active locales in the current inlining window. Any cached translation dictionaries
     * not present in this list will be evicted from the Worker's memory cache.
     */
    activeLocales?: string[];
    /**
     * The current inlining generation counter. When a request with a new generation is received,
     * all long-term worker caches are cleared.
     */
    generation?: number;
}
/**
 * The result for a single locale within a batch file request.
 */
export interface InlineLocaleResult {
    locale: string;
    code?: string;
    map?: string;
    messages: {
        type: 'error' | 'warning';
        message: string;
    }[];
}
/**
 * The response returned from a batch file request.
 */
export type InlineFileBatchResult = {
    file: string;
    unmodified: true;
    messages: {
        type: 'error' | 'warning';
        message: string;
    }[];
} | {
    file: string;
    unmodified?: false;
    results: InlineLocaleResult[];
};
/**
 * Inlines multiple locales and translations into a JavaScript file that contains `$localize` usage.
 *
 * @param request An InlineFileBatchRequest object representing the options for inlining.
 * @returns An object containing the inlined results for each requested locale.
 */
export declare function inlineFileBatch(request: InlineFileBatchRequest): Promise<InlineFileBatchResult>;
/**
 * Inlines the provided locale and translation into JavaScript code that contains `$localize` usage.
 * This function is a secondary entry primarily for use with component HMR update modules.
 *
 * @param request An InlineRequest object representing the options for inlining
 * @returns An object containing the inlined code.
 */
export declare function inlineCode(request: InlineCodeRequest): Promise<InlineCodeResult>;

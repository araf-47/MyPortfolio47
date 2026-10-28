/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { Cache } from '../../utils/cache';
/**
 * Transformation options that should apply to all transformed files and data.
 */
export interface JavaScriptTransformerOptions {
    sourcemap: boolean;
    thirdPartySourcemaps?: boolean;
    advancedOptimizations?: boolean;
    jit?: boolean;
    /**
     * The maximum number of concurrent transformation operations.
     * When omitted, concurrency defaults to the available worker pool threads.
     */
    maxConcurrency?: number;
}
/**
 * Transformation options for an individual file or data transform request.
 */
export interface TransformOptions {
    /** If true, bypass all Angular linker processing; if false, attempt linking. */
    skipLinker?: boolean;
    /**
     * An optional lazy resolver callback that returns whether the file has side-effects.
     * If it resolves to false, top-level pure function annotations and decorator wrapping may be applied.
     */
    sideEffects?: () => Promise<boolean | undefined>;
    /** If true, instrument the code for test coverage. */
    instrumentForCoverage?: boolean;
}
/**
 * A class that performs transformation of JavaScript files and raw data.
 * A worker pool is used to distribute the transformation actions and allow
 * parallel processing. Transformation behavior is based on the filename and
 * data. Transformations may include: async downleveling, Angular linking,
 * and advanced optimizations.
 */
export declare class JavaScriptTransformer {
    #private;
    private readonly options;
    private readonly cache?;
    constructor(options: JavaScriptTransformerOptions, cache?: Cache<Uint8Array> | undefined);
    /**
     * Performs JavaScript transformations on a file from the filesystem.
     * If no transformations are required, the data for the original file will be returned.
     * @param filename The full path to the file.
     * @param options Transformation options specific to this file.
     * @returns A promise that resolves to a UTF-8 encoded Uint8Array containing the result.
     */
    transformFile(filename: string, options?: TransformOptions): Promise<Uint8Array>;
    /**
     * Performs JavaScript transformations on the provided data of a file. The file does not need
     * to exist on the filesystem.
     * @param filename The full path of the file represented by the data.
     * @param data The data of the file that should be transformed.
     * @param options Transformation options specific to this file data.
     * @returns A promise that resolves to a UTF-8 encoded Uint8Array containing the result.
     */
    transformData(filename: string, data: string | Uint8Array, options?: TransformOptions): Promise<Uint8Array>;
    /**
     * Stops all active transformation tasks and shuts down all workers.
     * @returns A void promise that resolves when closing is complete.
     */
    close(): Promise<void>;
}

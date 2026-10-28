/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
/**
 * Maximum number of concurrent file system read/stat operations to prevent OS file descriptor exhaustion.
 */
export declare const MAX_CONCURRENT_READS = 16;
/**
 * Executes an asynchronous function for each item in an array concurrently up to a specified limit.
 *
 * If any task fails, processing of subsequent items stops and the first encountered error is re-thrown
 * after all currently in-flight tasks have settled.
 *
 * @param items Array of items to process.
 * @param limit Maximum number of concurrent tasks in flight.
 * @param fn Async task function.
 */
export declare function runConcurrent<T>(items: readonly T[], limit: number, fn: (item: T, index: number) => Promise<void>): Promise<void>;
/**
 * Maps an array asynchronously with a sliding worker pool up to a specified concurrency limit.
 *
 * If any task fails, processing of subsequent items stops and the first encountered error is re-thrown
 * after all currently in-flight tasks have settled.
 *
 * @param items Array of items to map.
 * @param limit Maximum number of concurrent tasks in flight.
 * @param fn Async mapper function.
 * @returns Array of mapped results in the original item order.
 */
export declare function mapConcurrent<T, R>(items: readonly T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]>;

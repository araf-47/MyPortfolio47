/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type { Plugin } from 'esbuild';
import { LoadResultCache } from '../load-result-cache';
/**
 * Creates an esbuild {@link Plugin} that loads all CSS url token references using the
 * built-in esbuild `file` loader. A plugin is used to allow for all file extensions
 * and types to be supported without needing to manually specify all extensions
 * within the build configuration.
 *
 * @param cache An optional load result cache.
 * @param dataurl If true, resources will be loaded with the 'dataurl' loader to inline them as base64 data URIs.
 * @returns An esbuild {@link Plugin} instance.
 */
export declare function createCssResourcePlugin(cache?: LoadResultCache, dataurl?: boolean): Plugin;

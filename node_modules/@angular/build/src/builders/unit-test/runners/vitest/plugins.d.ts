/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type { BrowserConfigOptions, Vite } from 'vitest/node';
import type { ResultFile } from '../../../application/results';
import type { NormalizedUnitTestBuilderOptions } from '../../options';
interface PluginOptions {
    workspaceRoot: string;
    projectSourceRoot: string;
    projectName: string;
    buildResultFiles: ReadonlyMap<string, ResultFile>;
    testFileToEntryPoint: ReadonlyMap<string, string>;
    setupFiles: readonly string[];
}
interface VitestConfigPluginOptions {
    browser: BrowserConfigOptions | undefined;
    coverage: NormalizedUnitTestBuilderOptions['coverage'];
    projectName: string;
    projectSourceRoot: string;
    reporters?: string[] | [string, object][];
    setupFiles: string[];
    projectPlugins: Vite.PluginOption[];
    include: string[];
    optimizeDepsInclude: string[];
    watch: boolean;
    isolate: boolean | undefined;
    preserveSymlinks?: boolean;
}
export declare function createVitestConfigPlugin(options: VitestConfigPluginOptions): Promise<Vite.Plugin>;
export declare function createVitestPlugins(pluginOptions: PluginOptions): Vite.Plugin[];
export {};

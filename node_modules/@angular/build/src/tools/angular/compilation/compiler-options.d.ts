/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type * as ng from '@angular/compiler-cli';
import type { PartialMessage } from 'esbuild';
import type ts from 'typescript';
export interface CompilerOptionOverrides {
    sourcemap?: boolean;
    preserveSymlinks?: boolean;
    cachePath?: string;
    externalRuntimeStyles?: boolean;
    enableHmr?: boolean;
    instrumentForCoverage?: boolean;
    includeTestMetadata?: boolean;
    customConditions?: string[];
    rootFiles?: string[];
}
export declare function transformCompilerOptions(typeScript: typeof ts, baseCompilerOptions: ng.CompilerOptions, overrides?: CompilerOptionOverrides, tsconfig?: string): {
    compilerOptions: ng.CompilerOptions;
    warnings: PartialMessage[];
};

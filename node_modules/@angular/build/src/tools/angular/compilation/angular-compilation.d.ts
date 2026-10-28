/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type { PartialMessage } from 'esbuild';
import type { AngularHostOptions } from '../angular-host';
import type { CompilerOptionOverrides } from './compiler-options';
export interface EmitFileResult {
    filename: string;
    contents: string;
    dependencies?: readonly string[];
}
export interface FileTransformResult {
    contents: string;
    watchFiles?: readonly string[];
}
export interface AngularCompilationOptions {
    allowJs?: boolean;
    isolatedModules?: boolean;
    sourceMap?: boolean;
    inlineSourceMap?: boolean;
    _useTypeScriptTranspilation?: boolean;
    [key: string]: unknown;
}
export interface AngularCompilationResult {
    compilerOptions: AngularCompilationOptions;
    referencedFiles: readonly string[];
    externalStylesheets?: ReadonlyMap<string, string>;
    templateUpdates?: ReadonlyMap<string, string>;
    componentResourcesDependencies?: ReadonlyMap<string, readonly string[]>;
    warnings?: readonly PartialMessage[];
}
export declare enum DiagnosticModes {
    None = 0,
    Option = 1,
    Syntactic = 2,
    Semantic = 4,
    All = 7
}
export declare abstract class AngularCompilation {
    abstract initialize(tsconfig: string, hostOptions: AngularHostOptions, compilerOptionOverrides?: CompilerOptionOverrides): Promise<AngularCompilationResult>;
    emitAffectedFiles(): Iterable<EmitFileResult> | Promise<Iterable<EmitFileResult>>;
    transformFile?(filename: string, content: string): Promise<FileTransformResult | null>;
    diagnoseFiles(modes?: DiagnosticModes): Promise<{
        errors?: PartialMessage[];
        warnings?: PartialMessage[];
    }>;
    update?(files: Set<string>): Promise<void>;
    close?(): Promise<void>;
}

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type * as ng from '@angular/compiler-cli';
import type { PartialMessage } from 'esbuild';
import ts from 'typescript';
import { AngularCompilation, DiagnosticModes } from './angular-compilation';
import { type CompilerOptionOverrides } from './compiler-options';
export interface TransformedConfiguration {
    compilerOptions: ng.CompilerOptions;
    rootNames: string[];
    errors: ts.Diagnostic[];
    warnings: PartialMessage[];
}
export declare abstract class TypeScriptCompilation extends AngularCompilation {
    #private;
    static loadCompilerCli(): Promise<typeof ng>;
    protected loadConfiguration(tsconfig: string, compilerOptionOverrides?: CompilerOptionOverrides): Promise<TransformedConfiguration>;
    protected readonly sourceFiles: Map<string, ts.SourceFile>;
    protected invalidateFiles(files: Iterable<string>): void;
    update(files: Set<string>): Promise<void>;
    protected abstract collectDiagnostics(modes: DiagnosticModes): Iterable<ts.Diagnostic> | Promise<Iterable<ts.Diagnostic>>;
    diagnoseFiles(modes?: DiagnosticModes): Promise<{
        errors?: PartialMessage[];
        warnings?: PartialMessage[];
    }>;
}

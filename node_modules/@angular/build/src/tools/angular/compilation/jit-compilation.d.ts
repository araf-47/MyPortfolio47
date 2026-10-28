/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import ts from 'typescript';
import { AngularHostOptions } from '../angular-host';
import { type AngularCompilationResult, DiagnosticModes, type EmitFileResult } from './angular-compilation';
import type { CompilerOptionOverrides } from './compiler-options';
import { TypeScriptCompilation } from './typescript-compilation';
export declare class JitCompilation extends TypeScriptCompilation {
    #private;
    private readonly browserOnlyBuild;
    constructor(browserOnlyBuild: boolean);
    initialize(tsconfig: string, hostOptions: AngularHostOptions, compilerOptionOverrides?: CompilerOptionOverrides): Promise<AngularCompilationResult>;
    protected collectDiagnostics(modes: DiagnosticModes): Iterable<ts.Diagnostic>;
    emitAffectedFiles(): Iterable<EmitFileResult>;
}

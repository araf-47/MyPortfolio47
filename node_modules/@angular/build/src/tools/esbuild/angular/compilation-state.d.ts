/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type { CompilerOptions } from '@angular/compiler-cli';
import type { AngularCompilation } from '../../angular/compilation';
export declare abstract class AngularCompilationContext {
    abstract readonly compilation?: AngularCompilation;
    abstract isPrimary(): this is PrimaryCompilationContext;
    abstract readonly waitUntilReady: Promise<boolean>;
    abstract getCompilerOptions(): Promise<CompilerOptions>;
    abstract dispose(): Promise<void>;
    createSecondaryContext(): AngularCompilationContext;
}
export declare class PrimaryCompilationContext extends AngularCompilationContext {
    #private;
    constructor(compilation: AngularCompilation);
    isPrimary(): this is PrimaryCompilationContext;
    get compilation(): AngularCompilation;
    get waitUntilReady(): Promise<boolean>;
    getCompilerOptions(): Promise<CompilerOptions>;
    setCompilerOptions(options: CompilerOptions): void;
    markAsReady(hasErrors: boolean): void;
    markAsInProgress(): void;
    dispose(): Promise<void>;
}
export declare class SecondaryCompilationContext extends AngularCompilationContext {
    private readonly primaryContext?;
    constructor(primaryContext?: AngularCompilationContext | undefined);
    isPrimary(): this is PrimaryCompilationContext;
    get compilation(): undefined;
    get waitUntilReady(): Promise<boolean>;
    getCompilerOptions(): Promise<CompilerOptions>;
    dispose(): Promise<void>;
}

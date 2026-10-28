"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecondaryCompilationContext = exports.PrimaryCompilationContext = exports.AngularCompilationContext = void 0;
class AngularCompilationContext {
    createSecondaryContext() {
        return new SecondaryCompilationContext(this);
    }
}
exports.AngularCompilationContext = AngularCompilationContext;
class PrimaryCompilationContext extends AngularCompilationContext {
    #compilation;
    #pendingCompilation = true;
    #resolveCompilationReady;
    #compilationReadyPromise;
    #hasErrors = true;
    #compilerOptions;
    #resolveCompilerOptions;
    #compilerOptionsPromise;
    constructor(compilation) {
        super();
        this.#compilation = compilation;
    }
    isPrimary() {
        return true;
    }
    get compilation() {
        return this.#compilation;
    }
    get waitUntilReady() {
        if (!this.#pendingCompilation) {
            return Promise.resolve(this.#hasErrors);
        }
        this.#compilationReadyPromise ??= new Promise((resolve) => {
            this.#resolveCompilationReady = resolve;
        });
        return this.#compilationReadyPromise;
    }
    getCompilerOptions() {
        if (this.#compilerOptions) {
            return Promise.resolve(this.#compilerOptions);
        }
        if (!this.#pendingCompilation) {
            return Promise.resolve({});
        }
        this.#compilerOptionsPromise ??= new Promise((resolve) => {
            this.#resolveCompilerOptions = resolve;
        });
        return this.#compilerOptionsPromise;
    }
    setCompilerOptions(options) {
        this.#compilerOptions = options;
        this.#resolveCompilerOptions?.(options);
        this.#resolveCompilerOptions = undefined;
        this.#compilerOptionsPromise = undefined;
    }
    markAsReady(hasErrors) {
        this.#hasErrors = hasErrors;
        this.#resolveCompilationReady?.(hasErrors);
        this.#resolveCompilationReady = undefined;
        this.#compilationReadyPromise = undefined;
        this.#pendingCompilation = false;
        if (this.#resolveCompilerOptions) {
            this.#resolveCompilerOptions(this.#compilerOptions ?? {});
            this.#resolveCompilerOptions = undefined;
            this.#compilerOptionsPromise = undefined;
        }
    }
    markAsInProgress() {
        this.#pendingCompilation = true;
        this.#compilerOptions = undefined;
    }
    #disposal;
    dispose() {
        // Reuse any in progress disposal to ensure all callers can await completion
        return (this.#disposal ??= this.#close());
    }
    async #close() {
        this.markAsReady(true);
        try {
            await this.#compilation.close?.();
        }
        catch {
            // Suppress closure errors to avoid unhandled rejections during teardown.
        }
    }
}
exports.PrimaryCompilationContext = PrimaryCompilationContext;
class SecondaryCompilationContext extends AngularCompilationContext {
    primaryContext;
    constructor(primaryContext) {
        super();
        this.primaryContext = primaryContext;
    }
    isPrimary() {
        return false;
    }
    get compilation() {
        return undefined;
    }
    get waitUntilReady() {
        return this.primaryContext?.waitUntilReady ?? Promise.resolve(false);
    }
    getCompilerOptions() {
        return this.primaryContext?.getCompilerOptions() ?? Promise.resolve({});
    }
    async dispose() {
        // No-op for secondary context to avoid disposing the primary compilation worker
    }
}
exports.SecondaryCompilationContext = SecondaryCompilationContext;
//# sourceMappingURL=compilation-state.js.map
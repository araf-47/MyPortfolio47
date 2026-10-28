"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initialize = initialize;
exports.diagnose = diagnose;
exports.emit = emit;
exports.update = update;
const node_assert_1 = __importDefault(require("node:assert"));
const node_crypto_1 = require("node:crypto");
const node_worker_threads_1 = require("node:worker_threads");
const hash_1 = require("../../../utils/hash");
const profiling_1 = require("../../../utils/profiling");
const aot_compilation_1 = require("./aot-compilation");
const jit_compilation_1 = require("./jit-compilation");
let compilation;
let activeWebWorkerPort;
const modifiedFiles = new Set();
async function initialize(request) {
    activeWebWorkerPort?.close();
    activeWebWorkerPort = request.webWorkerPort;
    const currentModifiedFiles = new Set(modifiedFiles);
    modifiedFiles.clear();
    let success = false;
    try {
        await (0, hash_1.initializeHash)();
        compilation ??= request.jit
            ? new jit_compilation_1.JitCompilation(request.browserOnlyBuild)
            : new aot_compilation_1.AotCompilation(request.browserOnlyBuild);
        const stylesheetRequests = new Map();
        request.stylesheetPort.on('message', ({ requestId, value, error }) => {
            const handlers = stylesheetRequests.get(requestId);
            if (handlers) {
                stylesheetRequests.delete(requestId);
                if (error) {
                    handlers[1](error);
                }
                else {
                    handlers[0](value);
                }
            }
        });
        const { compilerOptions, referencedFiles, externalStylesheets, templateUpdates, componentResourcesDependencies, warnings, } = await compilation.initialize(request.tsconfig, {
            fileReplacements: request.fileReplacements,
            modifiedFiles: currentModifiedFiles,
            transformStylesheet(data, containingFile, stylesheetFile, order, className) {
                const requestId = (0, node_crypto_1.randomUUID)();
                const resultPromise = new Promise((resolve, reject) => stylesheetRequests.set(requestId, [resolve, reject]));
                request.stylesheetPort.postMessage({
                    requestId,
                    data,
                    containingFile,
                    stylesheetFile,
                    order,
                    className,
                });
                return resultPromise;
            },
            processWebWorker(workerFile, containingFile) {
                Atomics.store(request.webWorkerSignal, 0, 0);
                request.webWorkerPort.postMessage({ workerFile, containingFile });
                Atomics.wait(request.webWorkerSignal, 0, 0);
                const result = (0, node_worker_threads_1.receiveMessageOnPort)(request.webWorkerPort)?.message;
                if (result?.error) {
                    throw result.error;
                }
                return result?.workerCodeFile ?? workerFile;
            },
        }, request.compilerOptionOverrides);
        success = true;
        return {
            externalStylesheets,
            templateUpdates,
            referencedFiles,
            warnings,
            // TODO: Expand? `allowJs`, `isolatedModules`, `sourceMap`, `inlineSourceMap` are the only fields needed currently.
            compilerOptions: {
                allowJs: compilerOptions.allowJs,
                isolatedModules: compilerOptions.isolatedModules,
                sourceMap: compilerOptions.sourceMap,
                inlineSourceMap: compilerOptions.inlineSourceMap,
                _useTypeScriptTranspilation: compilerOptions['_useTypeScriptTranspilation'],
            },
            componentResourcesDependencies,
        };
    }
    finally {
        request.stylesheetPort.close();
        if (!success) {
            activeWebWorkerPort?.close();
            activeWebWorkerPort = undefined;
        }
    }
}
async function diagnose(modes) {
    (0, node_assert_1.default)(compilation);
    const diagnostics = await compilation.diagnoseFiles(modes);
    const timings = (0, profiling_1.getAndClearCumulativeDurations)();
    return {
        ...diagnostics,
        timings,
    };
}
async function emit() {
    (0, node_assert_1.default)(compilation);
    try {
        const files = await compilation.emitAffectedFiles();
        return [...files];
    }
    finally {
        activeWebWorkerPort?.close();
        activeWebWorkerPort = undefined;
    }
}
async function update(files) {
    for (const file of files) {
        modifiedFiles.add(file);
    }
    await compilation?.update?.(files);
}
//# sourceMappingURL=parallel-worker.js.map
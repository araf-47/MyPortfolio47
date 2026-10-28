"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParallelCompilation = void 0;
const node_module_1 = require("node:module");
const node_worker_threads_1 = require("node:worker_threads");
const profiling_1 = require("../../../utils/profiling");
const worker_pool_1 = require("../../../utils/worker-pool");
const angular_compilation_1 = require("./angular-compilation");
/**
 * An Angular compilation which uses a Node.js Worker thread to load and execute
 * the TypeScript and Angular compilers. This allows for longer synchronous actions
 * such as semantic and template diagnostics to be calculated in parallel to the
 * other aspects of the application bundling process. The worker thread also has
 * a separate memory pool which significantly reduces the need for adjusting the
 * main Node.js CLI process memory settings with large application code sizes.
 */
class ParallelCompilation extends angular_compilation_1.AngularCompilation {
    jit;
    browserOnlyBuild;
    #worker;
    #webWorkerChannel;
    constructor(jit, browserOnlyBuild) {
        super();
        this.jit = jit;
        this.browserOnlyBuild = browserOnlyBuild;
        // TODO: Convert to import.meta usage during ESM transition
        const localRequire = (0, node_module_1.createRequire)(__filename);
        this.#worker = new worker_pool_1.WorkerPool({
            maxThreads: 1,
            idleTimeout: Infinity,
            filename: localRequire.resolve('./parallel-worker'),
        });
    }
    async initialize(tsconfig, hostOptions, compilerOptionOverrides) {
        const stylesheetChannel = new node_worker_threads_1.MessageChannel();
        // The request identifier is required because Angular can issue multiple concurrent requests
        stylesheetChannel.port1.on('message', ({ requestId, data, containingFile, stylesheetFile, order, className }) => {
            hostOptions
                .transformStylesheet(data, containingFile, stylesheetFile, order, className)
                .then((value) => stylesheetChannel.port1.postMessage({ requestId, value }))
                .catch((error) => stylesheetChannel.port1.postMessage({ requestId, error }));
        });
        this.#webWorkerChannel?.port1.close();
        // The web worker processing is a synchronous operation and uses shared memory combined with
        // the Atomics API to block execution here until a response is received.
        const webWorkerChannel = new node_worker_threads_1.MessageChannel();
        this.#webWorkerChannel = webWorkerChannel;
        const webWorkerSignal = new Int32Array(new SharedArrayBuffer(4));
        webWorkerChannel.port1.on('message', ({ workerFile, containingFile }) => {
            try {
                const workerCodeFile = hostOptions.processWebWorker(workerFile, containingFile);
                webWorkerChannel.port1.postMessage({ workerCodeFile });
            }
            catch (error) {
                webWorkerChannel.port1.postMessage({ error });
            }
            finally {
                Atomics.store(webWorkerSignal, 0, 1);
                Atomics.notify(webWorkerSignal, 0);
            }
        });
        let success = false;
        try {
            // Execute the initialize function in the worker thread
            const result = await this.#worker.run({
                fileReplacements: hostOptions.fileReplacements,
                tsconfig,
                jit: this.jit,
                browserOnlyBuild: this.browserOnlyBuild,
                compilerOptionOverrides,
                stylesheetPort: stylesheetChannel.port2,
                webWorkerPort: webWorkerChannel.port2,
                webWorkerSignal,
            }, {
                name: 'initialize',
                transferList: [stylesheetChannel.port2, webWorkerChannel.port2],
            });
            success = true;
            return result;
        }
        finally {
            stylesheetChannel.port1.close();
            if (!success) {
                this.#webWorkerChannel?.port1.close();
                this.#webWorkerChannel = undefined;
            }
        }
    }
    async diagnoseFiles(modes = angular_compilation_1.DiagnosticModes.All) {
        const { timings, ...result } = await this.#worker.run(modes, { name: 'diagnose' });
        if (timings) {
            (0, profiling_1.mergeCumulativeDurations)(timings);
        }
        return result;
    }
    async emitAffectedFiles() {
        try {
            return await this.#worker.run(undefined, { name: 'emit' });
        }
        finally {
            this.#webWorkerChannel?.port1.close();
            this.#webWorkerChannel = undefined;
        }
    }
    update(files) {
        return this.#worker.run(files, { name: 'update' });
    }
    close() {
        this.#webWorkerChannel?.port1.close();
        this.#webWorkerChannel = undefined;
        return this.#worker.destroy();
    }
}
exports.ParallelCompilation = ParallelCompilation;
//# sourceMappingURL=parallel-compilation.js.map
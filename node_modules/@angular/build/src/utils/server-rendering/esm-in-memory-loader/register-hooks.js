"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const node_module_1 = require("node:module");
const node_worker_threads_1 = require("node:worker_threads");
const loader_hooks_1 = require("./loader-hooks");
(0, loader_hooks_1.initialize)(node_worker_threads_1.workerData);
(0, node_module_1.registerHooks)({ resolve: loader_hooks_1.resolve, load: loader_hooks_1.load });
//# sourceMappingURL=register-hooks.js.map
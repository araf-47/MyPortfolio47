"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = transformJavaScript;
const node_module_1 = require("node:module");
const node_worker_threads_1 = require("node:worker_threads");
const piscina_1 = __importDefault(require("piscina"));
const environment_options_js_1 = require("../../utils/environment-options.js");
const source_map_1 = require("../../utils/source-map");
const oxc_transform_js_1 = require("../oxc/oxc-transform.js");
const { sourcemap = false, thirdPartySourcemaps = false, advancedOptimizations = false, jit = false, } = (node_worker_threads_1.workerData || {});
let babelLinkerDeps;
let remapping;
const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();
async function instrumentCoverage(filename, data, useInputSourcemap) {
    try {
        let resolvedPath = 'istanbul-lib-instrument';
        try {
            const requireFn = (0, node_module_1.createRequire)(filename);
            resolvedPath = requireFn.resolve('istanbul-lib-instrument');
        }
        catch {
            // Fallback to pool worker import traversal
        }
        const { createInstrumenter } = (await Promise.resolve(`${resolvedPath}`).then(s => __importStar(require(s))));
        const instrumenter = createInstrumenter({
            produceSourceMap: useInputSourcemap,
            esModules: true,
        });
        const inputSourceMap = useInputSourcemap ? (0, source_map_1.loadInputSourceMap)(filename, data) : undefined;
        const instrumentedCode = instrumenter.instrumentSync(data, filename, inputSourceMap);
        const lastMap = useInputSourcemap
            ? instrumenter.lastSourceMap()
            : undefined;
        return {
            code: instrumentedCode,
            map: lastMap ?? undefined,
        };
    }
    catch (error) {
        throw new Error(`The 'istanbul-lib-instrument' package is required for code coverage but was not found. Please install the package.`, { cause: error });
    }
}
async function transformJavaScript(request) {
    const { filename, data, ...options } = request;
    const useInputSourcemap = sourcemap && (!!thirdPartySourcemaps || !/[\\/]node_modules[\\/]/.test(filename));
    let textData;
    let inputSourceMap;
    let isAlreadyStripped = false;
    if (typeof data !== 'string') {
        const trailing = (0, source_map_1.findTrailingSourceMapComment)(data);
        if (trailing === null) {
            // 0 comments: fast path, no sourcemap to load or strip
            textData = textDecoder.decode(data);
            isAlreadyStripped = true;
        }
        else if (trailing !== undefined) {
            if (useInputSourcemap) {
                inputSourceMap = (0, source_map_1.loadInputSourceMapFromUrl)(filename, trailing.urlLine);
                if (inputSourceMap !== undefined) {
                    // Valid trailing sourcemap comment confirmed: safe to slice code buffer for transformation passes.
                    // Note: If no passes modify the code, the untouched original `data` buffer is returned below.
                    textData = textDecoder.decode(trailing.code);
                    isAlreadyStripped = true;
                }
                else {
                    // Not a valid trailing sourcemap (e.g. inside template literal): fallback to full decode
                    textData = textDecoder.decode(data);
                }
            }
            else if ((0, source_map_1.isTrailingSourceMapComment)(trailing.urlLine)) {
                // Valid trailing sourcemap comment confirmed: safe to slice code buffer
                textData = textDecoder.decode(trailing.code);
                isAlreadyStripped = true;
            }
            else {
                // Fallback to full decode and state-machine stripping
                textData = textDecoder.decode(data);
            }
        }
        else {
            // Multiple comments or comment not at line start: fall back to full decode and string parser
            textData = textDecoder.decode(data);
        }
    }
    else {
        textData = data;
    }
    const transformedData = await transformJavaScriptImpl(filename, textData, {
        ...options,
        inputSourceMap,
        isAlreadyStripped,
    });
    // If no transformations modified the code, return the original untouched data buffer via `move`.
    // This preserves any original trailing sourcemap comment and avoids re-encoding.
    if (transformedData === textData && typeof data !== 'string') {
        return piscina_1.default.move(data);
    }
    return piscina_1.default.move(textEncoder.encode(transformedData));
}
async function transformJavaScriptImpl(filename, data, options) {
    const shouldLink = !options.skipLinker;
    const useInputSourcemap = sourcemap && (!!thirdPartySourcemaps || !/[\\/]node_modules[\\/]/.test(filename));
    let code = data;
    const maps = [];
    let coverageMap;
    if (options.instrumentForCoverage) {
        const result = await instrumentCoverage(filename, code, useInputSourcemap);
        code = result.code;
        coverageMap = result.map;
    }
    if (shouldLink && environment_options_js_1.useBabelLinker) {
        babelLinkerDeps ??= Promise.all([
            Promise.resolve().then(() => __importStar(require('@angular/compiler-cli/linker/babel'))),
            Promise.resolve().then(() => __importStar(require('@angular/compiler-cli'))),
            Promise.resolve().then(() => __importStar(require('@babel/core'))),
        ]);
        const [{ createEs2015LinkerPlugin }, { ConsoleLogger, LogLevel }, { transformAsync }] = await babelLinkerDeps;
        const result = await transformAsync(code, {
            filename,
            inputSourceMap: false,
            sourceMaps: !!useInputSourcemap,
            compact: false,
            configFile: false,
            babelrc: false,
            browserslistConfigFile: false,
            plugins: [
                createEs2015LinkerPlugin({
                    fileSystem: {
                        exists: () => false,
                        readFile: () => '',
                        resolve: (...paths) => paths.join('/'),
                        dirname: (path) => path.split('/').slice(0, -1).join('/'),
                        relative: (_from, to) => to,
                    },
                    logger: new ConsoleLogger(LogLevel.info),
                    linkerJitMode: jit,
                    // This is a workaround until https://github.com/angular/angular/issues/42769 is fixed.
                    sourceMapping: false,
                }),
            ],
        });
        code = result?.code ?? code;
        if (result?.map) {
            maps.push(result.map);
        }
    }
    // Run Oxc linking and/or advanced optimizations in a single unified AST traversal pass
    const oxcLink = shouldLink && !environment_options_js_1.useBabelLinker;
    if (oxcLink || advancedOptimizations) {
        const sideEffectFree = options.sideEffects === false;
        const safeAngularPackage = sideEffectFree && /[\\/]node_modules[\\/]@angular[\\/]/.test(filename);
        const topLevelSafeMode = !safeAngularPackage;
        const result = (0, oxc_transform_js_1.transform)(filename, code, {
            link: oxcLink,
            jit,
            advancedOptimizations,
            sourcemap: useInputSourcemap,
            sideEffects: options.sideEffects,
            topLevelSafeMode,
        });
        code = result.code;
        if (result.map) {
            maps.push(result.map);
        }
    }
    if (useInputSourcemap) {
        const baseMap = coverageMap ?? options.inputSourceMap ?? (0, source_map_1.loadInputSourceMap)(filename, data);
        if (maps.length > 0 || coverageMap) {
            if (!options.isAlreadyStripped) {
                code = (0, source_map_1.removeSourceMappingURL)(code);
            }
            const remappingChain = maps.reverse();
            if (baseMap) {
                remappingChain.push(baseMap);
            }
            if (remappingChain.length > 0) {
                remapping ??= (await Promise.resolve().then(() => __importStar(require('@ampproject/remapping')))).default;
                const finalMap = remapping(remappingChain, () => null).toString();
                const base64Map = Buffer.from(finalMap).toString('base64');
                code += `\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,${base64Map}`;
            }
        }
        return code;
    }
    // Strip sourcemaps if they should not be used
    return options.isAlreadyStripped ? code : (0, source_map_1.removeSourceMappingURL)(code);
}
//# sourceMappingURL=javascript-transformer-worker.js.map
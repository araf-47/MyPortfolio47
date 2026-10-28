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
exports.DEFAULT_ASSET_IGNORE = void 0;
exports.resolveAssets = resolveAssets;
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const tinyglobby_1 = require("tinyglobby");
const concurrency_1 = require("./concurrency");
const path_1 = require("./path");
/**
 * Default glob ignore patterns for assets.
 */
exports.DEFAULT_ASSET_IGNORE = ['.gitkeep', '**/.DS_Store', '**/Thumbs.db'];
async function resolveAssets(entries, root) {
    const resolvedEntries = await (0, concurrency_1.mapConcurrent)(entries, concurrency_1.MAX_CONCURRENT_READS, async (entry) => {
        if (!(0, path_1.isSubDirectory)(root, entry.input)) {
            throw new Error(`The ${entry.input} asset path must be within the workspace root.`);
        }
        const cwd = node_path_1.default.resolve(root, entry.input);
        if (!entry.ignore?.length && !(0, tinyglobby_1.isDynamicPattern)(entry.glob)) {
            const src = node_path_1.default.join(cwd, entry.glob);
            if ((0, path_1.isSubDirectory)(cwd, src)) {
                try {
                    const stats = await (entry.followSymlinks ? (0, promises_1.stat)(src) : (0, promises_1.lstat)(src));
                    if (stats.isFile()) {
                        const filePath = entry.flatten ? node_path_1.default.basename(entry.glob) : entry.glob;
                        return [{ source: src, destination: node_path_1.default.join(entry.output, filePath) }];
                    }
                    if (!stats.isSymbolicLink()) {
                        return [];
                    }
                }
                catch {
                    // File does not exist or cannot be accessed.
                    return [];
                }
            }
        }
        const files = await (0, tinyglobby_1.glob)(entry.glob, {
            cwd,
            dot: true,
            ignore: entry.ignore ? [...exports.DEFAULT_ASSET_IGNORE, ...entry.ignore] : exports.DEFAULT_ASSET_IGNORE,
            followSymbolicLinks: entry.followSymlinks,
        });
        return files.map((file) => ({
            source: node_path_1.default.join(cwd, file),
            destination: node_path_1.default.join(entry.output, entry.flatten ? node_path_1.default.basename(file) : file),
        }));
    });
    return resolvedEntries.flat();
}
//# sourceMappingURL=resolve-assets.js.map
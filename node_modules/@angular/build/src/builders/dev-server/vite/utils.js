"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateResultRecord = updateResultRecord;
exports.isAbsoluteUrl = isAbsoluteUrl;
const internal_1 = require("../internal");
function updateResultRecord(file, normalizePath, htmlIndexPath, generatedFiles, assetFiles, componentStyles, initial = false) {
    if (file.origin === 'disk') {
        assetFiles.set('/' + normalizePath(file.path), {
            source: normalizePath(file.inputPath),
            updated: !initial,
        });
        return;
    }
    let filePath;
    if (file.path === htmlIndexPath) {
        // Convert custom index output path to standard index path for dev-server usage.
        // This mimics the Webpack dev-server behavior.
        filePath = '/index.html';
    }
    else {
        filePath = '/' + normalizePath(file.path);
    }
    const servable = file.type === internal_1.BuildOutputFileType.Browser || file.type === internal_1.BuildOutputFileType.Media;
    // Skip analysis of sourcemaps
    if (filePath.endsWith('.map')) {
        generatedFiles.set(filePath, {
            contents: file.contents,
            servable,
            size: file.contents.byteLength,
            hash: file.hash,
            type: file.type,
            updated: false,
        });
        return;
    }
    // Avoid overwriting a servable browser file with a non-servable server file of the same path (e.g. CSS chunks)
    const existing = generatedFiles.get(filePath);
    if (existing?.servable && !servable) {
        return;
    }
    // New or updated file
    generatedFiles.set(filePath, {
        contents: file.contents,
        size: file.contents.byteLength,
        hash: file.hash,
        // Consider the files updated except on the initial build result
        updated: !initial,
        type: file.type,
        servable,
    });
    // Record any external component styles
    if (filePath.endsWith('.css') && /^\/[a-f0-9]{64}\.css$/.test(filePath)) {
        const componentStyle = componentStyles.get(filePath);
        if (componentStyle) {
            componentStyle.rawContent = file.contents;
        }
        else {
            componentStyles.set(filePath, {
                rawContent: file.contents,
            });
        }
    }
}
/**
 * Checks if the given value is an absolute URL.
 *
 * This function helps in avoiding Vite's prebundling from processing absolute URLs (http://, https://, //) as files.
 *
 * @param value - The URL or path to check.
 * @returns `true` if the value is not an absolute URL; otherwise, `false`.
 */
function isAbsoluteUrl(value) {
    return /^(?:https?:)?\/\//.test(value);
}
//# sourceMappingURL=utils.js.map
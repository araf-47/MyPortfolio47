"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOCALE_DATA_BASE_MODULE = exports.LOCALE_DATA_NAMESPACE = void 0;
exports.resolveLocaleDataPath = resolveLocaleDataPath;
exports.loadLocaleData = loadLocaleData;
const promises_1 = require("node:fs/promises");
const resolve_project_1 = require("../../utils/resolve-project");
/**
 * The internal namespace used by generated locale import statements and Angular locale data plugin.
 */
exports.LOCALE_DATA_NAMESPACE = 'angular:locale/data';
/**
 * The base module location used to search for locale specific data.
 */
exports.LOCALE_DATA_BASE_MODULE = '@angular/common/locales/global';
const localeDataCache = new Map();
/**
 * Resolves the path to the Angular locale data file for a given locale tag.
 *
 * @param rawLocaleTag The raw locale identifier (e.g. "fr-CA", "de", "en-US").
 * @param projectResolve A function that attempts to resolve a path string to an absolute file path.
 * @returns Resolution result with file path, or warning/error diagnostics if applicable.
 */
function resolveLocaleDataPath(rawLocaleTag, projectResolve) {
    let partialLocaleTag;
    try {
        const locale = new Intl.Locale(rawLocaleTag);
        partialLocaleTag = locale.baseName;
    }
    catch {
        return {
            error: `Invalid or unsupported locale provided in configuration: "${rawLocaleTag}"`,
        };
    }
    let exact = true;
    while (partialLocaleTag) {
        // Angular embeds the `en`/`en-US` locale into the framework and it does not need to be included again here.
        if (partialLocaleTag === 'en' || partialLocaleTag === 'en-US') {
            return {};
        }
        const potentialPath = `${exports.LOCALE_DATA_BASE_MODULE}/${partialLocaleTag}`;
        try {
            const resolvedPath = projectResolve(potentialPath);
            if (resolvedPath) {
                return {
                    path: resolvedPath,
                    warning: exact
                        ? undefined
                        : `Locale data for '${rawLocaleTag}' cannot be found. Using locale data for '${partialLocaleTag}'.`,
                };
            }
        }
        catch { }
        // Remove the last subtag and try again with a less specific locale.
        const parts = partialLocaleTag.split('-');
        partialLocaleTag = parts.slice(0, -1).join('-');
        exact = false;
    }
    return {
        warning: `Locale data for '${rawLocaleTag}' cannot be found. No locale data will be included for this locale.`,
    };
}
/**
 * Loads the Angular global locale data script for a specified locale tag.
 *
 * @param rawLocaleTag The raw locale identifier (e.g. "fr-CA", "de", "en-US").
 * @param projectRoot Optional project root for module resolution.
 * @returns A promise resolving to the loaded locale data script code and any diagnostic warnings.
 */
function loadLocaleData(rawLocaleTag, projectRoot) {
    let cached = localeDataCache.get(rawLocaleTag);
    if (!cached) {
        cached = (async () => {
            const projectResolve = (0, resolve_project_1.createProjectResolver)(projectRoot ?? process.cwd());
            const resolution = resolveLocaleDataPath(rawLocaleTag, (potentialPath) => {
                try {
                    return projectResolve(potentialPath);
                }
                catch {
                    return undefined;
                }
            });
            if (resolution.error) {
                return { error: resolution.error };
            }
            if (resolution.path) {
                try {
                    const code = await (0, promises_1.readFile)(resolution.path, 'utf8');
                    return { code, warning: resolution.warning };
                }
                catch (e) {
                    return { error: `Failed to read locale data file: ${e.message}` };
                }
            }
            return { warning: resolution.warning };
        })();
        localeDataCache.set(rawLocaleTag, cached);
    }
    return cached;
}
//# sourceMappingURL=locale-data.js.map
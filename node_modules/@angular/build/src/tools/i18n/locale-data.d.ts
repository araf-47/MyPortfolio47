/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
/**
 * The internal namespace used by generated locale import statements and Angular locale data plugin.
 */
export declare const LOCALE_DATA_NAMESPACE = "angular:locale/data";
/**
 * The base module location used to search for locale specific data.
 */
export declare const LOCALE_DATA_BASE_MODULE = "@angular/common/locales/global";
/**
 * Result of resolving locale data for a given locale tag.
 */
export interface LocaleDataResolution {
    path?: string;
    warning?: string;
    error?: string;
}
/**
 * Result of loading locale data for a given locale tag.
 */
export interface LoadedLocaleData {
    code?: string;
    warning?: string;
    error?: string;
}
/**
 * Resolves the path to the Angular locale data file for a given locale tag.
 *
 * @param rawLocaleTag The raw locale identifier (e.g. "fr-CA", "de", "en-US").
 * @param projectResolve A function that attempts to resolve a path string to an absolute file path.
 * @returns Resolution result with file path, or warning/error diagnostics if applicable.
 */
export declare function resolveLocaleDataPath(rawLocaleTag: string, projectResolve: (potentialPath: string) => string | undefined): LocaleDataResolution;
/**
 * Loads the Angular global locale data script for a specified locale tag.
 *
 * @param rawLocaleTag The raw locale identifier (e.g. "fr-CA", "de", "en-US").
 * @param projectRoot Optional project root for module resolution.
 * @returns A promise resolving to the loaded locale data script code and any diagnostic warnings.
 */
export declare function loadLocaleData(rawLocaleTag: string, projectRoot?: string): Promise<LoadedLocaleData>;

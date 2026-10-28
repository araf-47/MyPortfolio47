/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type { Plugin } from 'esbuild';
export { LOCALE_DATA_NAMESPACE, LOCALE_DATA_BASE_MODULE, type LoadedLocaleData, type LocaleDataResolution, loadLocaleData, resolveLocaleDataPath, } from '../i18n/locale-data';
/**
 * Creates an esbuild plugin that resolves Angular locale data files from `@angular/common`.
 *
 * @returns An esbuild plugin.
 */
export declare function createAngularLocaleDataPlugin(): Plugin;

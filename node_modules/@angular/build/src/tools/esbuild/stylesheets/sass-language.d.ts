/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { StylesheetLanguage } from './stylesheet-plugin-factory';
export declare function resetSassWorkerPoolCaches(): void;
export declare function shutdownSassWorkerPool(): void;
export declare const SassStylesheetLanguage: Readonly<StylesheetLanguage>;
export declare function isPackageUrl(url: string): boolean;
/**
 * Returns the scope that qualifies the cached package resolutions of a stylesheet. A stylesheet
 * within `node_modules` uses the root of its enclosing package, since every file of a package
 * resolves its dependencies against the same `node_modules` directories. All other stylesheets use
 * the working directory, allowing component stylesheets to share package resolutions.
 */
export declare function getPackageScope(containingPath: string | undefined, workingDirectory: string | undefined): string;

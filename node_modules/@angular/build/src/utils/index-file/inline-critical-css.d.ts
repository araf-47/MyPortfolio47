/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
/**
 * Generates a stylesheet containing the critical CSS for the given HTML content.
 *
 * @param html - The HTML content to process.
 * @param outputPath - The output path for the generated stylesheet.
 * @param deployUrl - The deploy URL for the generated stylesheet.
 * @param minify - Whether to minify the generated stylesheet.
 * @param readAsset - A function that reads an asset from the given file path.
 * @returns A promise that resolves to an object containing the generated stylesheet content,
 * warnings, and errors.
 */
export declare function inlineCriticalCss(html: string, outputPath: string, deployUrl: string | undefined, minify: boolean, readAsset: (file: string) => Promise<string>): Promise<{
    content: string;
    warnings: string[];
    errors: string[];
}>;

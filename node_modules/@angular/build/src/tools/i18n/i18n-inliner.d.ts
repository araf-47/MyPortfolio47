/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type { ɵParsedTranslation } from '@angular/localize';
import { WorkerPool } from '../../utils/worker-pool';
import { type BuildOutputFile } from '../esbuild/bundler-files';
/**
 * Inlining options that should apply to all transformed code.
 */
export interface I18nInlinerOptions {
    missingTranslation: 'error' | 'warning' | 'ignore';
    /**
     * The maximum number of concurrent translation inlining operations.
     * When omitted, concurrency defaults to the available worker pool threads.
     */
    maxConcurrency?: number;
    persistentCachePath?: string;
    localizeVersion?: string;
}
/**
 * Options for inlining a specific locale.
 */
export interface LocaleInlineOptions {
    /**
     * The locale specifier string.
     */
    locale: string;
    /**
     * The translation messages for the locale, or undefined for the source/untranslated locale.
     */
    translation?: Record<string, ɵParsedTranslation>;
    /**
     * An optional content integrity hash of the translation file(s) for fast cache key calculation.
     */
    translationIntegrity?: string;
}
/**
 * Result of inlining for a specific locale.
 */
export interface LocaleInlineResult {
    outputFiles: BuildOutputFile[];
    errors: string[];
    warnings: string[];
}
/**
 * A class that performs i18n translation inlining of JavaScript code.
 * A worker pool is used to distribute the transformation actions and allow
 * parallel processing. Inlining is only performed on code that contains the
 * localize function (`$localize`).
 */
export declare class I18nInliner {
    #private;
    private readonly options;
    constructor(options: I18nInlinerOptions, workerPool?: WorkerPool);
    /**
     * Performs inlining of translations across multiple locales in parallel.
     *
     * An adaptive 2D task-partitioning algorithm distributes (files x locales) work units
     * across all worker threads while caching AST metadata and sourcemaps in worker memory.
     *
     * @param files The build output files to transform.
     * @param locales The locales and translations to inline.
     * @returns A map of locale names to their inlined output files and diagnostics.
     */
    inlineAll(files: Iterable<BuildOutputFile>, locales: Iterable<LocaleInlineOptions>): Promise<Map<string, LocaleInlineResult>>;
    /**
     * Performs inlining of translations for the provided locale and translations.
     *
     * @param files The build output files to transform.
     * @param locale The string representing the locale to inline.
     * @param translation The translation messages to use when inlining.
     * @param translationIntegrity An optional integrity value for the translation messages to use for caching.
     * @returns A promise that resolves to an array of OutputFiles representing a translated result.
     */
    inlineForLocale(files: Iterable<BuildOutputFile>, locale: string, translation: Record<string, ɵParsedTranslation> | undefined, translationIntegrity?: string): Promise<LocaleInlineResult>;
    inlineTemplateUpdate(locale: string, translation: Record<string, ɵParsedTranslation> | undefined, templateCode: string, templateId: string, translationIntegrity?: string): Promise<{
        code: string;
        errors: string[];
        warnings: string[];
    }>;
    /**
     * Stops all active transformation tasks and shuts down all workers.
     * @returns A void promise that resolves when closing is complete.
     */
    close(): Promise<void>;
    /**
     * Initializes the cache for storing translated bundles.
     * If the cache is already initialized, it does nothing.
     *
     * @returns A promise that resolves once the cache initialization process is complete.
     */
    private initCache;
}

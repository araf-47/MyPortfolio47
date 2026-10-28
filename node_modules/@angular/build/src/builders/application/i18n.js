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
exports.inlineI18n = inlineI18n;
exports.loadActiveTranslations = loadActiveTranslations;
const node_assert_1 = __importDefault(require("node:assert"));
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const bundler_files_1 = require("../../tools/esbuild/bundler-files");
const i18n_1 = require("../../tools/i18n");
const environment_options_1 = require("../../utils/environment-options");
const i18n_options_1 = require("../../utils/i18n-options");
const load_translations_1 = require("../../utils/load-translations");
const resolve_project_1 = require("../../utils/resolve-project");
const execute_post_bundle_1 = require("./execute-post-bundle");
const options_1 = require("./options");
/**
 * Inlines all active locales as specified by the application build options into all
 * application JavaScript files created during the build.
 * @param metafile An esbuild metafile object.
 * @param options The normalized application builder options used to create the build.
 * @param executionResult The result of an executed build.
 * @param initialFiles A map containing initial file information for the executed build.
 * @param workerPool An optional worker pool to use for running transformation tasks.
 */
async function inlineI18n(metafile, options, executionResult, initialFiles, workerPool) {
    const { i18nOptions, baseHref, cacheOptions } = options;
    // Create the multi-threaded inliner with common options.
    const inliner = new i18n_1.I18nInliner({
        missingTranslation: i18nOptions.missingTranslationBehavior ?? 'warning',
        maxConcurrency: workerPool
            ? Math.min(workerPool.maxThreads, environment_options_1.maxInlinerWorkers)
            : environment_options_1.maxInlinerWorkers,
        persistentCachePath: cacheOptions.enabled ? cacheOptions.path : undefined,
        localizeVersion: i18nOptions.localizeVersion,
    }, workerPool);
    const inlineResult = {
        errors: [],
        warnings: [],
        prerenderedRoutes: {},
    };
    // For each active locale, use the inliner to process the output files of the build.
    const updatedOutputFiles = [];
    const updatedAssetFiles = [];
    // Root and SSR entry files are not modified.
    const unModifiedOutputFiles = executionResult.outputFiles.filter(({ type }) => type === bundler_files_1.BuildOutputFileType.Root || type === bundler_files_1.BuildOutputFileType.ServerRoot);
    try {
        const localesToInline = Array.from(i18nOptions.inlineLocales, (locale) => {
            const localeDescription = i18nOptions.locales[locale];
            let translationIntegrity = '';
            for (const file of localeDescription.files) {
                if (!file.integrity) {
                    translationIntegrity = undefined;
                    break;
                }
                translationIntegrity += (translationIntegrity ? '|' : '') + file.integrity;
            }
            return {
                locale,
                translation: localeDescription.translation,
                translationIntegrity,
            };
        });
        const inlinedLocales = await inliner.inlineAll(executionResult.outputFiles, localesToInline);
        for (const locale of i18nOptions.inlineLocales) {
            const localeInlineResult = inlinedLocales.get(locale);
            (0, node_assert_1.default)(localeInlineResult !== undefined, 'Inlined result must exist for locale: ' + locale);
            const localeOutputFiles = localeInlineResult.outputFiles;
            inlineResult.errors.push(...localeInlineResult.errors);
            inlineResult.warnings.push(...localeInlineResult.warnings);
            const { errors, warnings, additionalAssets, additionalOutputFiles, prerenderedRoutes: generatedRoutes, } = await (0, execute_post_bundle_1.executePostBundleSteps)(metafile, {
                ...options,
                baseHref: (0, options_1.getLocaleBaseHref)(baseHref, i18nOptions, locale) ?? baseHref,
            }, [...unModifiedOutputFiles, ...localeOutputFiles], executionResult.assetFiles, initialFiles, locale);
            localeOutputFiles.push(...additionalOutputFiles);
            inlineResult.errors.push(...errors);
            inlineResult.warnings.push(...warnings);
            // Update directory with locale base or subPath
            const subPath = i18nOptions.locales[locale].subPath;
            if (i18nOptions.flatOutput !== true) {
                localeOutputFiles.forEach((file) => {
                    file.path = (0, node_path_1.join)(subPath, file.path);
                });
                for (const assetFile of [...executionResult.assetFiles, ...additionalAssets]) {
                    updatedAssetFiles.push({
                        source: assetFile.source,
                        destination: (0, node_path_1.join)(subPath, assetFile.destination),
                    });
                }
            }
            else {
                executionResult.assetFiles.push(...additionalAssets);
            }
            inlineResult.prerenderedRoutes = { ...inlineResult.prerenderedRoutes, ...generatedRoutes };
            updatedOutputFiles.push(...localeOutputFiles);
        }
        // Update the result with all localized files.
        executionResult.outputFiles = [
            // Root and SSR entry files are not modified.
            ...unModifiedOutputFiles,
            // Updated files for each locale.
            ...updatedOutputFiles,
        ];
        // Assets are only changed if not using the flat output option
        if (!i18nOptions.flatOutput) {
            executionResult.assetFiles = updatedAssetFiles;
        }
        // Inline any template updates if present
        if (executionResult.templateUpdates?.size) {
            // The development server only allows a single locale but issue a warning if used programmatically (experimental)
            // with multiple locales and template HMR.
            if (localesToInline.length > 1) {
                inlineResult.warnings.push(`Component HMR updates can only be inlined with a single locale. The first locale will be used.`);
            }
            const targetLocale = localesToInline[0];
            for (const [id, content] of executionResult.templateUpdates) {
                const templateUpdateResult = await inliner.inlineTemplateUpdate(targetLocale.locale, targetLocale.translation, content, id, targetLocale.translationIntegrity);
                executionResult.templateUpdates.set(id, templateUpdateResult.code);
                inlineResult.errors.push(...templateUpdateResult.errors);
                inlineResult.warnings.push(...templateUpdateResult.warnings);
            }
        }
        return inlineResult;
    }
    finally {
        await inliner.close();
    }
}
/**
 * Loads all active translations using the translation loaders from the `@angular/localize` package.
 * @param context The architect builder context for the current build.
 * @param i18n The normalized i18n options to use.
 */
async function loadActiveTranslations(context, i18n) {
    if (!i18n.localizeVersion) {
        try {
            const projectResolve = (0, resolve_project_1.createProjectResolver)(context.workspaceRoot);
            const manifestPath = projectResolve('@angular/localize/package.json');
            const manifest = JSON.parse(await (0, promises_1.readFile)(manifestPath, 'utf-8'));
            i18n.localizeVersion = manifest.version;
        }
        catch { }
    }
    // Load locale data and translations (if present)
    let loader;
    for (const [locale, desc] of Object.entries(i18n.locales)) {
        if (!i18n.inlineLocales.has(locale) && locale !== i18n.sourceLocale) {
            continue;
        }
        if (!desc.files.length) {
            continue;
        }
        loader ??= await (0, load_translations_1.createTranslationLoader)();
        (0, i18n_options_1.loadTranslations)(locale, desc, context.workspaceRoot, loader, {
            warn(message) {
                context.logger.warn(message);
            },
            error(message) {
                throw new Error(message);
            },
        }, undefined, i18n.duplicateTranslationBehavior);
    }
}
//# sourceMappingURL=i18n.js.map
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.inlineFileBatch = inlineFileBatch;
exports.inlineCode = inlineCode;
const localize_1 = require("@angular/localize");
const magic_string_1 = require("magic-string");
const node_v8_1 = require("node:v8");
const oxc_parser_1 = require("oxc-parser");
const traversal_1 = require("../oxc/traversal");
const i18n_translation_reader_1 = require("./i18n-translation-reader");
const locale_data_1 = require("./locale-data");
/**
 * Cache of file data promises keyed by filename.
 */
const fileDataCache = new Map();
/**
 * Cache of deserialized translation messages keyed by locale.
 */
const deserializedTranslations = new Map();
/**
 * The current inlining generation for this worker.
 */
let currentGeneration;
let remapping;
/**
 * Retrieves the file data for a filename, loading and extracting localization metadata.
 * If `cache` is true, the result is cached in `fileDataCache` across requests in this Worker.
 * If `cache` is false (ephemeral), the result is not retained in `fileDataCache`, allowing it
 * to be garbage-collected once the batch request finishes.
 *
 * @param filename The name of the file to load.
 * @param codeBlob The source code file as a Blob.
 * @param cache Whether to cache the loaded file data in the Worker's long-term cache.
 * @returns The cached or newly extracted code and localization metadata.
 */
function loadFileData(filename, codeBlob, cache = true) {
    const existing = fileDataCache.get(filename);
    if (existing) {
        if (!cache) {
            fileDataCache.delete(filename);
        }
        return existing;
    }
    const fileDataPromise = (async () => {
        const code = await codeBlob.text();
        const metadata = extractLocalizeMetadata(filename, code);
        return { code, metadata };
    })();
    if (cache) {
        fileDataPromise.catch(() => {
            fileDataCache.delete(filename);
        });
        fileDataCache.set(filename, fileDataPromise);
    }
    return fileDataPromise;
}
/**
 * Deserializes or wraps the translation messages for a locale, reusing the result for any
 * subsequent request that targets the same locale.
 * @param locale The locale identifier.
 * @param translation Optional serialized translation messages (SharedArrayBuffer or Blob).
 * @returns The translation messages, or undefined if the locale has no translations.
 */
function loadTranslation(locale, translation) {
    if (!translation) {
        return undefined;
    }
    let messagesPromise = deserializedTranslations.get(locale);
    if (!messagesPromise) {
        if (translation instanceof Blob) {
            messagesPromise = translation
                .arrayBuffer()
                .then((buffer) => (0, node_v8_1.deserialize)(new Uint8Array(buffer)))
                .catch((error) => {
                deserializedTranslations.delete(locale);
                throw error;
            });
        }
        else {
            messagesPromise = Promise.resolve((0, i18n_translation_reader_1.createSharedTranslationProxy)(translation));
        }
        deserializedTranslations.set(locale, messagesPromise);
    }
    return messagesPromise;
}
/**
 * Inlines multiple locales and translations into a JavaScript file that contains `$localize` usage.
 *
 * @param request An InlineFileBatchRequest object representing the options for inlining.
 * @returns An object containing the inlined results for each requested locale.
 */
async function inlineFileBatch(request) {
    if (request.generation !== undefined && request.generation !== currentGeneration) {
        currentGeneration = request.generation;
        fileDataCache.clear();
        deserializedTranslations.clear();
    }
    if (request.activeLocales) {
        const activeSet = new Set(request.activeLocales);
        for (const locale of deserializedTranslations.keys()) {
            if (!activeSet.has(locale)) {
                deserializedTranslations.delete(locale);
            }
        }
    }
    const { code, metadata } = await loadFileData(request.filename, request.code, !request.ephemeral);
    // Fast path: file has no $localize call sites or locale insert sites
    if (metadata.callSites.length === 0 && metadata.localeInsertSites.length === 0) {
        return {
            file: request.filename,
            unmodified: true,
            messages: (metadata.diagnostics ?? []).map((message) => ({
                type: 'error',
                message,
            })),
        };
    }
    // Parse the sourcemap once for the entire batch if provided.
    // It will naturally be garbage-collected after this batch action returns.
    let map;
    if (request.map) {
        const rawMap = await request.map.text();
        map = rawMap ? JSON.parse(rawMap) : undefined;
    }
    const results = [];
    for (const [locale, translation] of request.locales) {
        const result = await inlineLocalize(code, map, metadata, locale, await loadTranslation(locale, translation), request.filename, request.missingTranslation);
        results.push({
            locale,
            code: result.code,
            map: result.map,
            messages: result.diagnostics,
        });
    }
    return {
        file: request.filename,
        results,
    };
}
/**
 * Inlines the provided locale and translation into JavaScript code that contains `$localize` usage.
 * This function is a secondary entry primarily for use with component HMR update modules.
 *
 * @param request An InlineRequest object representing the options for inlining
 * @returns An object containing the inlined code.
 */
async function inlineCode(request) {
    const metadata = extractLocalizeMetadata(request.filename, request.code);
    const result = await inlineLocalize(request.code, undefined, metadata, request.locale, await loadTranslation(request.locale, request.translation), request.filename, request.missingTranslation);
    return {
        output: result.code ?? request.code,
        messages: result.diagnostics,
    };
}
/**
 * Translates a $localize message using @angular/localize low-level runtime functions.
 * Handles missing translations and errors without requiring @angular/localize/tools.
 */
function translateMessage(diagnostics, translations, messageParts, substitutions, missingTranslation) {
    // Fast path: untranslated locale (e.g. source locale without a translation dictionary).
    // Directly parse the message parts to strip metadata and placeholder markers without
    // throwing and catching a MissingTranslationError exception.
    if (translations === undefined) {
        const message = (0, localize_1.ɵparseMessage)(messageParts, substitutions);
        return [(0, localize_1.ɵmakeTemplateObject)(message.messageParts, message.messageParts), substitutions];
    }
    try {
        return (0, localize_1.ɵtranslate)(translations, messageParts, substitutions);
    }
    catch (error) {
        if ((0, localize_1.ɵisMissingTranslationError)(error)) {
            if (missingTranslation !== 'ignore') {
                diagnostics.push({ type: missingTranslation, message: error.message });
            }
            return [
                (0, localize_1.ɵmakeTemplateObject)(error.parsedMessage.messageParts, error.parsedMessage.messageParts),
                substitutions,
            ];
        }
        else {
            const message = error instanceof Error ? error.message : String(error);
            diagnostics.push({ type: 'error', message });
            return [messageParts, substitutions];
        }
    }
}
/**
 * Extracts localization call sites and locale insertion points from JavaScript code using OXC.
 *
 * @param filename The name of the file being processed.
 * @param code The JavaScript source code.
 * @returns The extracted localization metadata.
 */
function extractLocalizeMetadata(filename, code) {
    const { program } = (0, oxc_parser_1.parseSync)(filename, code, {
        sourceType: 'unambiguous',
    });
    if (!program) {
        throw new Error(`Unknown error occurred parsing file "${filename}" with OXC.`);
    }
    const callSites = [];
    const localeInsertSites = [];
    let diagnostics;
    (0, traversal_1.traversePostOrder)(program, (node) => {
        if (node.type === 'Literal') {
            if (typeof node.value === 'string' && node.value === '___NG_LOCALE_INSERT___') {
                localeInsertSites.push({ start: node.start, end: node.end });
            }
        }
        else if (node.type === 'TaggedTemplateExpression') {
            if (node.tag.type === 'Identifier' && node.tag.name === '$localize') {
                const cooked = [];
                const raw = [];
                let hasMalformedEscape = false;
                for (const q of node.quasi.quasis) {
                    if (q.value.cooked === null || q.value.cooked === undefined) {
                        hasMalformedEscape = true;
                        (diagnostics ??= []).push(`Malformed escape sequence in $localize template literal in file "${filename}".`);
                        break;
                    }
                    cooked.push(q.value.cooked);
                    raw.push(q.value.raw);
                }
                if (!hasMalformedEscape) {
                    const messageParts = Object.assign(cooked, { raw });
                    const expressions = node.quasi.expressions.map((expr) => ({
                        start: expr.start,
                        end: expr.end,
                    }));
                    const expressionIndexes = expressions.map((_, index) => index);
                    callSites.push({
                        start: node.start,
                        end: node.end,
                        messageParts,
                        expressions,
                        expressionIndexes,
                    });
                }
            }
        }
    });
    return { callSites, localeInsertSites, diagnostics };
}
/**
 * Escapes a template literal string part for insertion into an ES template literal (backticks).
 * Uses JSON.stringify for base escaping of control characters and backslashes, then unescapes
 * double quotes and escapes backticks and `${` expression delimiters in a single pass.
 */
function escapeTemplatePart(part) {
    return JSON.stringify(part)
        .slice(1, -1)
        .replace(/\\"|`|\$\{/g, (match) => (match === '\\"' ? '"' : '\\' + match));
}
/**
 * Inlines translations into code using previously extracted localization metadata.
 *
 * @param code The source code to transform.
 * @param map Optional source map for the source code.
 * @param metadata Extracted localization metadata.
 * @param locale The target locale identifier.
 * @param translation The translation messages dictionary, or undefined for untranslated locale.
 * @param filename The name of the file being transformed.
 * @param missingTranslation How to handle missing translations.
 * @returns The transformed code, optional remapped source map, and diagnostics.
 */
async function inlineLocalize(code, map, metadata, locale, translation, filename, missingTranslation = 'warning') {
    const magicString = new magic_string_1.MagicString(code);
    const diagnostics = [];
    if (metadata.diagnostics) {
        for (const message of metadata.diagnostics) {
            diagnostics.push({ type: 'error', message });
        }
    }
    if (metadata.localeInsertSites.length > 0) {
        const localeData = await (0, locale_data_1.loadLocaleData)(locale);
        if (localeData.error) {
            diagnostics.push({ type: 'error', message: localeData.error });
        }
        else if (localeData.warning) {
            diagnostics.push({ type: 'warning', message: localeData.warning });
        }
        let injected = false;
        for (const site of metadata.localeInsertSites) {
            magicString.overwrite(site.start, site.end, JSON.stringify(locale) + (localeData.code && !injected ? `;\n${localeData.code}\n;` : ''));
            injected = true;
        }
    }
    for (const callSite of metadata.callSites) {
        const [translatedParts, translatedSubstitutions] = translateMessage(diagnostics, translation, callSite.messageParts, callSite.expressionIndexes, translation === undefined ? 'ignore' : missingTranslation);
        // Reconstruct the new template/string literal replacement
        let replacement;
        if (translatedSubstitutions.length === 0) {
            replacement = JSON.stringify(translatedParts[0]);
        }
        else {
            replacement = '`';
            for (let i = 0; i < translatedParts.length; i++) {
                replacement += escapeTemplatePart(translatedParts[i]);
                if (i < translatedSubstitutions.length) {
                    const originalIndex = translatedSubstitutions[i];
                    const expr = callSite.expressions[originalIndex];
                    const exprCode = magicString.slice(expr.start, expr.end);
                    replacement += '${' + exprCode + '}';
                }
            }
            replacement += '`';
        }
        magicString.overwrite(callSite.start, callSite.end, replacement);
    }
    if (!magicString.hasChanged()) {
        return {
            code: undefined,
            map: undefined,
            diagnostics,
        };
    }
    const outputCode = magicString.toString();
    let outputMap;
    if (map) {
        // A decoded map is generated here rather than an encoded one because remapping decodes its
        // inputs. Encoding the mappings only for remapping to immediately decode them again doubles
        // the peak memory of the largest structure involved in inlining a file.
        const rawMap = magicString.generateDecodedMap({
            source: filename,
            includeContent: true,
            hires: 'boundary',
        });
        remapping ??= (await Promise.resolve().then(() => __importStar(require('@ampproject/remapping')))).default;
        outputMap = remapping([{ ...rawMap, version: 3 }, map], () => null);
    }
    return {
        code: outputCode,
        map: outputMap && JSON.stringify(outputMap),
        diagnostics,
    };
}
//# sourceMappingURL=i18n-inliner-worker.js.map
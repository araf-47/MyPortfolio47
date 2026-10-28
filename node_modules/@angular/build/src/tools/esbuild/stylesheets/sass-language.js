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
exports.SassStylesheetLanguage = void 0;
exports.resetSassWorkerPoolCaches = resetSassWorkerPoolCaches;
exports.shutdownSassWorkerPool = shutdownSassWorkerPool;
exports.isPackageUrl = isPackageUrl;
exports.getPackageScope = getPackageScope;
const node_path_1 = require("node:path");
const node_url_1 = require("node:url");
const cache_1 = require("../../../utils/cache");
let sassService;
let sassServicePromise;
let resolutionCache;
let packageRootCache;
function isSassException(error) {
    return !!error && typeof error === 'object' && 'sassMessage' in error;
}
function resetSassWorkerPoolCaches() {
    resolutionCache?.clear();
    packageRootCache?.clear();
    if (sassService) {
        sassService.clearCache();
    }
    else if (sassServicePromise) {
        void sassServicePromise.then((service) => service.clearCache());
    }
}
function shutdownSassWorkerPool() {
    resetSassWorkerPoolCaches();
    if (sassService) {
        void sassService.close();
        sassService = undefined;
    }
    else if (sassServicePromise) {
        void sassServicePromise.then(shutdownSassWorkerPool);
    }
    sassServicePromise = undefined;
}
exports.SassStylesheetLanguage = Object.freeze({
    name: 'sass',
    componentFilter: /^s[ac]ss;/,
    fileFilter: /\.s[ac]ss$/,
    process(data, file, format, options, build) {
        const syntax = format === 'sass' ? 'indented' : 'scss';
        const resolveUrl = async (url, resolveDir) => {
            const path = url.startsWith('pkg:') ? url.slice(4) : url;
            const result = await build.resolve(path, {
                kind: 'import-rule',
                resolveDir,
            });
            return result;
        };
        return compileString(data, file, syntax, options, resolveUrl, build.initialOptions.absWorkingDir);
    },
});
function isPackageUrl(url) {
    if (url.startsWith('pkg:')) {
        return true;
    }
    return (url.length > 0 &&
        !url.startsWith('.') &&
        !url.startsWith('/') &&
        !url.startsWith('\\') &&
        !url.includes(':'));
}
function parsePackageName(url) {
    const parts = (url.startsWith('pkg:') ? url.slice(4) : url).split('/');
    const hasScope = parts.length >= 2 && parts[0][0] === '@';
    const [nameOrScope, nameOrFirstPath, ...pathPart] = parts;
    const packageName = hasScope ? `${nameOrScope}/${nameOrFirstPath}` : nameOrScope;
    return {
        packageName,
        get pathSegments() {
            return !hasScope && nameOrFirstPath ? [nameOrFirstPath, ...pathPart] : pathPart;
        },
    };
}
/**
 * Returns the scope that qualifies the cached package resolutions of a stylesheet. A stylesheet
 * within `node_modules` uses the root of its enclosing package, since every file of a package
 * resolves its dependencies against the same `node_modules` directories. All other stylesheets use
 * the working directory, allowing component stylesheets to share package resolutions.
 */
function getPackageScope(containingPath, workingDirectory) {
    // The directory segments of the stylesheet, excluding the file name
    const segments = containingPath?.split(/[\\/]/).slice(0, -1) ?? [];
    const index = segments.lastIndexOf('node_modules');
    if (index === -1) {
        return workingDirectory ?? '';
    }
    const packageNameLength = segments[index + 1]?.[0] === '@' ? 2 : 1;
    return segments.slice(0, index + 1 + packageNameLength).join('/');
}
async function compileString(data, filePath, syntax, options, resolveUrl, workingDirectory) {
    // Lazily load Sass when a Sass file is found
    if (sassService === undefined) {
        if (sassServicePromise === undefined) {
            sassServicePromise = Promise.resolve().then(() => __importStar(require('../../sass/sass-service'))).then((sassService) => new sassService.SassCompiler(true));
        }
        try {
            sassService = await sassServicePromise;
        }
        finally {
            sassServicePromise = undefined;
        }
    }
    // Caching follows Sass behavior where a given package url will always resolve to the same value
    // regardless of its importer's path, except for importers within `node_modules`, which are
    // scoped to their enclosing package. Relative paths are qualified with the containing URL.
    // A null value indicates that the cached resolution attempt failed to find a location and
    // later stage resolution should be attempted. This avoids potentially expensive repeat
    // failing resolution attempts.
    resolutionCache ??= new cache_1.MemoryCache();
    packageRootCache ??= new cache_1.MemoryCache();
    const currentResolutionCache = resolutionCache;
    const currentPackageRootCache = packageRootCache;
    const warnings = [];
    const { silenceDeprecations, futureDeprecations, fatalDeprecations } = options.sass ?? {};
    try {
        const { css, sourceMap, loadedUrls } = await sassService.compileStringAsync(data, {
            url: (0, node_url_1.pathToFileURL)(filePath),
            style: 'expanded',
            syntax,
            loadPaths: options.includePaths,
            sourceMap: options.sourcemap,
            sourceMapIncludeSources: options.sourcemap,
            silenceDeprecations,
            fatalDeprecations,
            futureDeprecations,
            quietDeps: true,
            importers: [
                {
                    findFileUrl: (url, options) => {
                        const containingPath = options.containingUrl?.protocol === 'file:'
                            ? (0, node_url_1.fileURLToPath)(options.containingUrl)
                            : undefined;
                        const resolveDir = containingPath ? (0, node_path_1.dirname)(containingPath) : workingDirectory;
                        const isPackage = isPackageUrl(url);
                        const scope = getPackageScope(containingPath, workingDirectory);
                        const cacheKey = isPackage
                            ? `${scope}:${url}`
                            : `${options.containingUrl?.href ?? ''}:${url}`;
                        return currentResolutionCache.getOrCreate(cacheKey, async () => {
                            const result = await resolveUrl(url, resolveDir);
                            if (result.path) {
                                return (0, node_url_1.pathToFileURL)(result.path);
                            }
                            // Check for package deep imports
                            if (!isPackage) {
                                return null;
                            }
                            const { packageName, pathSegments } = parsePackageName(url);
                            // Caching package root locations is particularly beneficial for `@material/*` packages
                            // which extensively use deep imports.
                            const packageRoot = await currentPackageRootCache.getOrCreate(`${scope}:${packageName}`, async () => {
                                // Use the required presence of a package root `package.json` file to resolve the location
                                const packageResult = await resolveUrl(packageName + '/package.json', resolveDir);
                                return packageResult.path ? (0, node_path_1.dirname)(packageResult.path) : null;
                            });
                            // Package not found could be because of an error or the specifier is intended to be found
                            // via a later stage of the resolution process (`loadPaths`, etc.).
                            // Errors are reported after the full completion of the resolution process. Exceptions for
                            // not found packages should not be raised here.
                            if (packageRoot) {
                                return (0, node_url_1.pathToFileURL)((0, node_path_1.join)(packageRoot, ...pathSegments));
                            }
                            // Not found
                            return null;
                        });
                    },
                },
            ],
            logger: {
                warn: (text, { deprecation, stack, span }) => {
                    const notes = [];
                    if (deprecation) {
                        notes.push({ text });
                    }
                    if (stack && !span) {
                        notes.push({ text: stack });
                    }
                    warnings.push({
                        text: deprecation ? 'Deprecation' : text,
                        location: span && {
                            file: span.url && (0, node_url_1.fileURLToPath)(span.url),
                            lineText: span.context,
                            // Sass line numbers are 0-based while esbuild's are 1-based
                            line: span.start.line + 1,
                            column: span.start.column,
                        },
                        notes,
                    });
                },
            },
        });
        return {
            loader: 'css',
            contents: sourceMap ? `${css}\n${sourceMapToUrlComment(sourceMap)}` : css,
            watchFiles: loadedUrls.map((url) => (0, node_url_1.fileURLToPath)(url)),
            warnings,
        };
    }
    catch (error) {
        if (isSassException(error)) {
            const fileWithError = error.span.url ? (0, node_url_1.fileURLToPath)(error.span.url) : undefined;
            const watchFiles = [filePath, ...extractFilesFromStack(error.sassStack)];
            if (fileWithError) {
                watchFiles.push(fileWithError);
            }
            return {
                loader: 'css',
                errors: [
                    {
                        text: error.message,
                    },
                ],
                warnings,
                watchFiles,
            };
        }
        throw error;
    }
}
function sourceMapToUrlComment(sourceMap) {
    const urlSourceMap = Buffer.from(JSON.stringify(sourceMap), 'utf-8').toString('base64');
    return `/*# sourceMappingURL=data:application/json;charset=utf-8;base64,${urlSourceMap} */`;
}
function* extractFilesFromStack(stack) {
    const lines = stack.split('\n');
    const cwd = process.cwd();
    // Stack line has format of "<file> <location> <identifier>"
    for (const line of lines) {
        const segments = line.split(' ');
        if (segments.length < 3) {
            break;
        }
        // Extract path from stack line.
        // Paths may contain spaces. All segments before location are part of the file path.
        let path = '';
        let index = 0;
        while (!segments[index].match(/\d+:\d+/)) {
            path += segments[index++];
        }
        if (path) {
            // Stack paths from sass are relative to the current working directory (not input file or workspace root)
            yield (0, node_path_1.join)(cwd, path);
        }
    }
}
//# sourceMappingURL=sass-language.js.map
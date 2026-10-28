"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveLocaleDataPath = exports.loadLocaleData = exports.LOCALE_DATA_BASE_MODULE = exports.LOCALE_DATA_NAMESPACE = void 0;
exports.createAngularLocaleDataPlugin = createAngularLocaleDataPlugin;
const resolve_project_1 = require("../../utils/resolve-project");
const locale_data_1 = require("../i18n/locale-data");
var locale_data_2 = require("../i18n/locale-data");
Object.defineProperty(exports, "LOCALE_DATA_NAMESPACE", { enumerable: true, get: function () { return locale_data_2.LOCALE_DATA_NAMESPACE; } });
Object.defineProperty(exports, "LOCALE_DATA_BASE_MODULE", { enumerable: true, get: function () { return locale_data_2.LOCALE_DATA_BASE_MODULE; } });
Object.defineProperty(exports, "loadLocaleData", { enumerable: true, get: function () { return locale_data_2.loadLocaleData; } });
Object.defineProperty(exports, "resolveLocaleDataPath", { enumerable: true, get: function () { return locale_data_2.resolveLocaleDataPath; } });
/**
 * Creates an esbuild plugin that resolves Angular locale data files from `@angular/common`.
 *
 * @returns An esbuild plugin.
 */
function createAngularLocaleDataPlugin() {
    return {
        name: 'angular-locale-data',
        setup(build) {
            build.onResolve({ filter: /^angular:locale\/data:/ }, async ({ path }) => {
                const rawLocaleTag = path.split(':', 3)[2];
                const { absWorkingDir } = build.initialOptions;
                let projectResolve;
                const resolution = (0, locale_data_1.resolveLocaleDataPath)(rawLocaleTag, (potentialPath) => {
                    projectResolve ??= (0, resolve_project_1.createProjectResolver)(absWorkingDir ?? process.cwd());
                    try {
                        return projectResolve(potentialPath);
                    }
                    catch {
                        return undefined;
                    }
                });
                if (resolution.error) {
                    return {
                        path: rawLocaleTag,
                        namespace: locale_data_1.LOCALE_DATA_NAMESPACE,
                        errors: [{ text: resolution.error }],
                    };
                }
                if (!resolution.path) {
                    return {
                        path: rawLocaleTag,
                        namespace: locale_data_1.LOCALE_DATA_NAMESPACE,
                        warnings: resolution.warning
                            ? [{ location: null, text: resolution.warning }]
                            : undefined,
                    };
                }
                return {
                    path: resolution.path,
                    warnings: resolution.warning ? [{ location: null, text: resolution.warning }] : undefined,
                };
            });
            // Locales that cannot be found or are en/en-US will be loaded as empty content
            build.onLoad({ filter: /./, namespace: locale_data_1.LOCALE_DATA_NAMESPACE }, () => ({
                contents: '',
                loader: 'empty',
            }));
        },
    };
}
//# sourceMappingURL=i18n-locale-plugin.js.map
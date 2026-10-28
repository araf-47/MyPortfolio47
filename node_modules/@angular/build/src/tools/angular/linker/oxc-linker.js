"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OxcLinker = void 0;
const linker_1 = require("@angular/compiler-cli/linker");
const oxc_ast_host_1 = require("./oxc-ast-host");
const string_ast_factory_1 = require("./string-ast-factory");
/**
 * A declaration scope that instructs the Angular compiler to emit constant pools
 * inside a local IIFE around each linked declaration rather than hoisting shared
 * constants to the module level.
 *
 * Preferred due to:
 * - In-Place String Replacement: Enables fast in-place string replacements in
 *   `MagicString` without parsing or mutating surrounding ES module statements.
 * - Better Tree-Shaking Locality: Component constants are strictly encapsulated
 *   within the component's `@__PURE__` IIFE closure (`(function() { ... })()`). If a
 *   bundler tree-shakes an unused component from a library FESM, all of its associated
 *   constants are automatically eliminated without leaving orphan top-level variables.
 * - Negligible Wire Size Impact: LZ77/Brotli compression deduplicates repeated IIFE
 *   wrappers and array literals over the wire to near-zero marginal cost.
 */
class InlineDeclarationScope {
    getConstantScopeRef() {
        return null;
    }
}
const noopFileSystem = {
    exists: () => false,
    readFile: () => '',
    resolve: (...paths) => paths.join('/'),
    dirname: (path) => path.split('/').slice(0, -1).join('/'),
    relative: (_from, to) => to,
};
const defaultLogger = {
    level: 1, // LogLevel.info
    debug(...args) {
        if (this.level <= 0) {
            // eslint-disable-next-line no-console
            console.debug(...args);
        }
    },
    info(...args) {
        if (this.level <= 1) {
            // eslint-disable-next-line no-console
            console.info(...args);
        }
    },
    warn(...args) {
        if (this.level <= 2) {
            // eslint-disable-next-line no-console
            console.warn(...args);
        }
    },
    error(...args) {
        if (this.level <= 3) {
            // eslint-disable-next-line no-console
            console.error(...args);
        }
    },
};
let SHARED_AST_HOST;
let SHARED_DECLARATION_SCOPE;
/**
 * Manages Angular partial declaration linking using Oxc AST nodes.
 */
class OxcLinker {
    #fileLinker;
    constructor(filename, code, jit = false) {
        SHARED_AST_HOST ??= new oxc_ast_host_1.OxcAstHost();
        SHARED_DECLARATION_SCOPE ??= new InlineDeclarationScope();
        const astFactory = new string_ast_factory_1.StringAstFactory(code);
        const linkerEnvironment = linker_1.LinkerEnvironment.create(noopFileSystem, defaultLogger, SHARED_AST_HOST, astFactory, { linkerJitMode: jit, sourceMapping: false });
        this.#fileLinker = new linker_1.FileLinker(linkerEnvironment, filename, code);
    }
    /**
     * Attempts to link an Angular partial declaration CallExpression.
     *
     * @param node The CallExpression AST node to check and link.
     * @returns The linked code string if the node is a partial declaration, or undefined otherwise.
     */
    linkCallExpression(node) {
        const calleeName = SHARED_AST_HOST.getSymbolName(node.callee);
        if (!calleeName || !this.#fileLinker.isPartialDeclaration(calleeName)) {
            return undefined;
        }
        const args = SHARED_AST_HOST.parseArguments(node);
        const linkedCode = this.#fileLinker.linkPartialDeclaration(calleeName, args, SHARED_DECLARATION_SCOPE);
        return linkedCode;
    }
}
exports.OxcLinker = OxcLinker;
//# sourceMappingURL=oxc-linker.js.map
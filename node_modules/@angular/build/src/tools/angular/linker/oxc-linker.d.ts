/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type { CallExpression } from '@oxc-project/types';
/**
 * Manages Angular partial declaration linking using Oxc AST nodes.
 */
export declare class OxcLinker {
    #private;
    constructor(filename: string, code: string, jit?: boolean);
    /**
     * Attempts to link an Angular partial declaration CallExpression.
     *
     * @param node The CallExpression AST node to check and link.
     * @returns The linked code string if the node is a partial declaration, or undefined otherwise.
     */
    linkCallExpression(node: CallExpression): string | undefined;
}

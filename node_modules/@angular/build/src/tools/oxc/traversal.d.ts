/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type { Node } from '@oxc-project/types';
/**
 * Contextual scope information provided to AST visitor callbacks during traversal.
 */
export interface TraversalContext {
    /**
     * The current function nesting depth. Top-level code has depth 0.
     */
    functionDepth: number;
    /**
     * The current class nesting depth. Top-level code has depth 0.
     */
    classDepth: number;
    /**
     * The immediate enclosing function AST node, if currently inside a function.
     */
    parentFunc?: Node;
}
/**
 * Traverses ESTree AST nodes in post-order (bottom-up) without recursion.
 *
 * @param root The root AST node to traverse.
 * @param visit Callback invoked on each AST node in post-order.
 */
export declare function traversePostOrder(root: Node, visit: (node: Node, context: TraversalContext) => void): void;

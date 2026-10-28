/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type { AstHost, Range } from '@angular/compiler-cli/linker';
import type { ArrayExpression, ArrowFunctionExpression, BooleanLiteral, CallExpression, Function as FunctionNode, NullLiteral, NumericLiteral, ObjectExpression, StringLiteral, UnaryExpression } from '@oxc-project/types';
/**
 * An implementation of `AstHost` that queries information from `oxc-parser` AST nodes.
 */
export declare class OxcAstHost implements AstHost<unknown> {
    getSymbolName(node: unknown): string | null;
    isStringLiteral(node: unknown): node is StringLiteral;
    parseStringLiteral(str: unknown): string;
    isNumericLiteral(node: unknown): node is NumericLiteral;
    parseNumericLiteral(num: unknown): number;
    isBooleanLiteral(node: unknown): node is BooleanLiteral | UnaryExpression;
    parseBooleanLiteral(bool: unknown): boolean;
    isNull(node: unknown): node is NullLiteral;
    isArrayLiteral(node: unknown): node is ArrayExpression;
    parseArrayLiteral(array: unknown): unknown[];
    isObjectLiteral(node: unknown): node is ObjectExpression;
    parseObjectLiteral(obj: unknown): Map<string, unknown>;
    isFunctionExpression(node: unknown): node is FunctionNode | ArrowFunctionExpression;
    parseReturnValue(fn: unknown): unknown;
    parseParameters(fn: unknown): unknown[];
    isCallExpression(node: unknown): node is CallExpression;
    parseCallee(call: unknown): unknown;
    parseArguments(call: unknown): unknown[];
    getRange(node: unknown): Range;
}

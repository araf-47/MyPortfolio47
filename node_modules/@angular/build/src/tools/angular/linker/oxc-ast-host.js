"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OxcAstHost = void 0;
const linker_1 = require("@angular/compiler-cli/linker");
function isNode(node) {
    return typeof node === 'object' && node !== null && 'type' in node;
}
function unwrapParentheses(node) {
    while (isNode(node) && node.type === 'ParenthesizedExpression') {
        node = node.expression;
    }
    return node;
}
/**
 * An implementation of `AstHost` that queries information from `oxc-parser` AST nodes.
 */
class OxcAstHost {
    getSymbolName(node) {
        node = unwrapParentheses(node);
        if (!isNode(node)) {
            return null;
        }
        if (node.type === 'Identifier') {
            return node.name;
        }
        else if (node.type === 'MemberExpression') {
            if (!node.computed && node.property.type === 'Identifier') {
                return node.property.name;
            }
        }
        return null;
    }
    isStringLiteral(node) {
        node = unwrapParentheses(node);
        return isNode(node) && node.type === 'Literal' && typeof node.value === 'string';
    }
    parseStringLiteral(str) {
        str = unwrapParentheses(str);
        if (!this.isStringLiteral(str)) {
            throw new linker_1.FatalLinkerError(str, 'Unsupported syntax, expected a string literal.');
        }
        return str.value;
    }
    isNumericLiteral(node) {
        node = unwrapParentheses(node);
        return isNode(node) && node.type === 'Literal' && typeof node.value === 'number';
    }
    parseNumericLiteral(num) {
        num = unwrapParentheses(num);
        if (!this.isNumericLiteral(num)) {
            throw new linker_1.FatalLinkerError(num, 'Unsupported syntax, expected a numeric literal.');
        }
        return num.value;
    }
    isBooleanLiteral(node) {
        node = unwrapParentheses(node);
        if (!isNode(node)) {
            return false;
        }
        return ((node.type === 'Literal' && typeof node.value === 'boolean') || isMinifiedBooleanLiteral(node));
    }
    parseBooleanLiteral(bool) {
        bool = unwrapParentheses(bool);
        if (isNode(bool)) {
            if (bool.type === 'Literal' && typeof bool.value === 'boolean') {
                return bool.value;
            }
            if (isMinifiedBooleanLiteral(bool)) {
                return !bool.argument.value;
            }
        }
        throw new linker_1.FatalLinkerError(bool, 'Unsupported syntax, expected a boolean literal.');
    }
    isNull(node) {
        node = unwrapParentheses(node);
        return isNode(node) && node.type === 'Literal' && node.value === null;
    }
    isArrayLiteral(node) {
        node = unwrapParentheses(node);
        return isNode(node) && node.type === 'ArrayExpression';
    }
    parseArrayLiteral(array) {
        array = unwrapParentheses(array);
        if (!this.isArrayLiteral(array)) {
            throw new linker_1.FatalLinkerError(array, 'Unsupported syntax, expected an array literal.');
        }
        const result = [];
        for (const element of array.elements) {
            if (element === null) {
                throw new linker_1.FatalLinkerError(array, 'Unsupported syntax, element in array not to be empty.');
            }
            const unwrappedElement = unwrapParentheses(element);
            if (isNode(unwrappedElement) && unwrappedElement.type === 'SpreadElement') {
                throw new linker_1.FatalLinkerError(unwrappedElement, 'Unsupported syntax, element in array not to use spread syntax.');
            }
            result.push(unwrappedElement);
        }
        return result;
    }
    isObjectLiteral(node) {
        node = unwrapParentheses(node);
        return isNode(node) && node.type === 'ObjectExpression';
    }
    parseObjectLiteral(obj) {
        obj = unwrapParentheses(obj);
        if (!this.isObjectLiteral(obj)) {
            throw new linker_1.FatalLinkerError(obj, 'Unsupported syntax, expected an object literal.');
        }
        const result = new Map();
        for (const property of obj.properties) {
            if (property.type !== 'Property') {
                throw new linker_1.FatalLinkerError(property, 'Unsupported syntax, expected a property assignment.');
            }
            const keyNode = unwrapParentheses(property.key);
            if (!isNode(keyNode)) {
                throw new linker_1.FatalLinkerError(property.key, 'Unsupported syntax, expected a property name.');
            }
            let key;
            if (keyNode.type === 'Identifier') {
                key = keyNode.name;
            }
            else if (this.isStringLiteral(keyNode)) {
                key = keyNode.value;
            }
            else if (this.isNumericLiteral(keyNode)) {
                key = String(keyNode.value);
            }
            else {
                throw new linker_1.FatalLinkerError(keyNode, 'Unsupported syntax, expected a property name.');
            }
            result.set(key, unwrapParentheses(property.value));
        }
        return result;
    }
    isFunctionExpression(node) {
        node = unwrapParentheses(node);
        if (!isNode(node)) {
            return false;
        }
        return (node.type === 'FunctionDeclaration' ||
            node.type === 'FunctionExpression' ||
            node.type === 'ArrowFunctionExpression');
    }
    parseReturnValue(fn) {
        fn = unwrapParentheses(fn);
        if (!this.isFunctionExpression(fn)) {
            throw new linker_1.FatalLinkerError(fn, 'Unsupported syntax, expected a function.');
        }
        const body = fn.body;
        if (!body || !isNode(body)) {
            throw new linker_1.FatalLinkerError(fn, 'Unsupported syntax, expected a function body.');
        }
        if (body.type !== 'BlockStatement') {
            return unwrapParentheses(body);
        }
        const statements = body.body;
        if (statements.length !== 1) {
            throw new linker_1.FatalLinkerError(body, 'Unsupported syntax, expected a function body with a single return statement.');
        }
        const stmt = statements[0];
        if (stmt.type !== 'ReturnStatement') {
            throw new linker_1.FatalLinkerError(stmt, 'Unsupported syntax, expected a function body with a single return statement.');
        }
        if (!stmt.argument) {
            throw new linker_1.FatalLinkerError(stmt, 'Unsupported syntax, expected function to return a value.');
        }
        return unwrapParentheses(stmt.argument);
    }
    parseParameters(fn) {
        fn = unwrapParentheses(fn);
        if (!this.isFunctionExpression(fn)) {
            throw new linker_1.FatalLinkerError(fn, 'Unsupported syntax, expected a function.');
        }
        return fn.params;
    }
    isCallExpression(node) {
        node = unwrapParentheses(node);
        return isNode(node) && node.type === 'CallExpression';
    }
    parseCallee(call) {
        call = unwrapParentheses(call);
        if (!this.isCallExpression(call)) {
            throw new linker_1.FatalLinkerError(call, 'Unsupported syntax, expected a call expression.');
        }
        return unwrapParentheses(call.callee);
    }
    parseArguments(call) {
        call = unwrapParentheses(call);
        if (!this.isCallExpression(call)) {
            throw new linker_1.FatalLinkerError(call, 'Unsupported syntax, expected a call expression.');
        }
        const result = [];
        for (const arg of call.arguments) {
            const unwrappedArg = unwrapParentheses(arg);
            if (isNode(unwrappedArg) && unwrappedArg.type === 'SpreadElement') {
                throw new linker_1.FatalLinkerError(unwrappedArg, 'Unsupported syntax, argument not to use spread syntax.');
            }
            result.push(unwrappedArg);
        }
        return result;
    }
    getRange(node) {
        node = unwrapParentheses(node);
        if (!isNode(node) || typeof node.start !== 'number' || typeof node.end !== 'number') {
            throw new linker_1.FatalLinkerError(node, 'Unable to read range for node - it is missing location information.');
        }
        return {
            startPos: node.start,
            startLine: 0,
            startCol: 0,
            endPos: node.end,
        };
    }
}
exports.OxcAstHost = OxcAstHost;
function isMinifiedBooleanLiteral(node) {
    if (node.type !== 'UnaryExpression') {
        return false;
    }
    const arg = node.argument;
    return (node.prefix === true &&
        node.operator === '!' &&
        arg.type === 'Literal' &&
        typeof arg.value === 'number' &&
        (arg.value === 0 || arg.value === 1));
}
//# sourceMappingURL=oxc-ast-host.js.map
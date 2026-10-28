"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StringAstFactory = void 0;
const OBJECT_LITERAL_PREFIX = '\0obj_';
/**
 * An implementation of `AstFactory` that generates JavaScript code strings directly.
 */
class StringAstFactory {
    sourceCode;
    constructor(sourceCode = '') {
        this.sourceCode = sourceCode;
    }
    render(expr) {
        let rendered;
        if (typeof expr === 'string') {
            rendered = expr;
        }
        else if (typeof expr === 'object' &&
            expr !== null &&
            typeof expr.start === 'number' &&
            typeof expr.end === 'number') {
            const { start, end } = expr;
            rendered = this.sourceCode.slice(start, end);
        }
        else {
            rendered = String(expr);
        }
        if (rendered.startsWith(OBJECT_LITERAL_PREFIX)) {
            return rendered.slice(OBJECT_LITERAL_PREFIX.length);
        }
        return rendered;
    }
    /**
     * Wraps an expression in parentheses if it has syntax or operator precedence
     * traps when used as the receiver/callee of property access, element access,
     * call chains, `new` expressions, or tagged templates.
     *
     * For example, arrow functions (`(() => {}).foo`), numbers (`(5).foo`), object
     * literals (`({ a: 1 }).foo`), and unary operators (`(void 0)()`) require
     * parenthesization when used as receivers.
     */
    wrapReceiver(receiver) {
        let rendered = this.render(receiver);
        if (rendered.startsWith('function') ||
            rendered.startsWith('{') ||
            rendered.includes('=>') ||
            /^(?:typeof|void|delete|new|await|throw|return)\b/.test(rendered) ||
            /^[!~+-]/.test(rendered) ||
            /^\d/.test(rendered)) {
            rendered = `(${rendered})`;
        }
        return rendered;
    }
    /**
     * Wraps an expression in parentheses if it is an un-parenthesized complex
     * operand (such as an un-parenthesized binary, logical, or assignment expression)
     * to prevent operator precedence inversion when embedded inside an outer expression.
     *
     * Atomic expressions (identifiers, member/element access chains, and simple
     * literals matching `/^[a-zA-Z0-9_$.[\]"'`]+$/`) and already-parenthesized
     * expressions are returned as-is.
     */
    wrapOperand(expr) {
        const rendered = this.render(expr);
        if ((rendered.startsWith('(') && rendered.endsWith(')')) ||
            /^[a-zA-Z0-9_$.[\]"'`]+$/.test(rendered)) {
            return rendered;
        }
        return `(${rendered})`;
    }
    /**
     * Attaching statement-level comments is a no-op in `StringAstFactory`.
     *
     * Why this is safe:
     * - Load-bearing tree-shaking annotations (`@__PURE__` markers) are explicitly prepended by
     *   `createCallExpression` and `createCallChain` whenever `pure: true`.
     * - In `@angular/compiler`, `LeadingComment` is only used for `@ts-ignore` (suppressing
     *   TypeScript checker errors in generated `.ts` code) and `webpackChunkName` (in dynamic
     *   imports), neither of which occur during `.js`/`.mjs` library partial linking.
     */
    attachComments(_statement, _leadingComments) { }
    createArrayLiteral(elements) {
        return `[${elements.map((e) => this.render(e)).join(', ')}]`;
    }
    createAssignment(target, operator, value) {
        return `(${this.render(target)} ${operator} ${this.render(value)})`;
    }
    createBinaryExpression(leftOperand, operator, rightOperand) {
        return `(${this.wrapOperand(leftOperand)} ${operator} ${this.wrapOperand(rightOperand)})`;
    }
    createBlock(body) {
        return `{\n${body.join('\n')}\n}`;
    }
    createCallExpression(callee, args, pure) {
        const annotation = pure ? '/*@__PURE__*/ ' : '';
        return `${annotation}${this.wrapReceiver(callee)}(${args.map((a) => this.render(a)).join(', ')})`;
    }
    createCallChain(callee, args, pure, isOptional) {
        const annotation = pure ? '/*@__PURE__*/ ' : '';
        const operator = isOptional ? '?.' : '';
        return `${annotation}${this.wrapReceiver(callee)}${operator}(${args.map((a) => this.render(a)).join(', ')})`;
    }
    createConditional(condition, thenExpression, elseExpression) {
        return `(${this.render(condition)} ? ${this.render(thenExpression)} : ${this.render(elseExpression)})`;
    }
    createElementAccess(expression, element) {
        return `${this.wrapReceiver(expression)}[${this.render(element)}]`;
    }
    createElementAccessChain(expression, element, isOptional) {
        const operator = isOptional ? '?.' : '';
        return `${this.wrapReceiver(expression)}${operator}[${this.render(element)}]`;
    }
    createExpressionStatement(expression) {
        return `${this.render(expression)};`;
    }
    createFunctionDeclaration(functionName, parameters, body) {
        const params = parameters.map((p) => p.name).join(', ');
        return `function ${functionName}(${params}) ${body}`;
    }
    createFunctionExpression(functionName, parameters, body) {
        const name = functionName ? ` ${functionName}` : '';
        const params = parameters.map((p) => p.name).join(', ');
        return `function${name}(${params}) ${body}`;
    }
    createArrowFunctionExpression(parameters, body) {
        const params = parameters.map((p) => p.name).join(', ');
        const isObjectLiteral = typeof body === 'string' && body.startsWith(OBJECT_LITERAL_PREFIX);
        const renderedBody = this.render(body);
        const formattedBody = isObjectLiteral ? `(${renderedBody})` : renderedBody;
        return `(${params}) => ${formattedBody}`;
    }
    createDynamicImport(url) {
        return `import(${this.render(url)})`;
    }
    createIdentifier(name) {
        return name;
    }
    createIfStatement(condition, thenStatement, elseStatement) {
        const elseClause = elseStatement ? ` else ${elseStatement}` : '';
        return `if (${this.render(condition)}) ${thenStatement}${elseClause}`;
    }
    createLiteral(value) {
        return typeof value === 'string' ? JSON.stringify(value) : String(value);
    }
    createNewExpression(expression, args) {
        return `new ${this.wrapReceiver(expression)}(${args.map((a) => this.render(a)).join(', ')})`;
    }
    createObjectLiteral(properties) {
        const props = properties.map((p) => {
            if (p.kind === 'spread') {
                return `...${this.render(p.expression)}`;
            }
            const key = p.quoted ? JSON.stringify(p.propertyName) : p.propertyName;
            return `${key}: ${this.render(p.value)}`;
        });
        return `${OBJECT_LITERAL_PREFIX}{\n${props.join(',\n')}\n}`;
    }
    createParenthesizedExpression(expression) {
        return `(${this.render(expression)})`;
    }
    createPropertyAccess(expression, propertyName) {
        return `${this.wrapReceiver(expression)}.${propertyName}`;
    }
    createPropertyAccessChain(expression, propertyName, isOptional) {
        const operator = isOptional ? '?.' : '.';
        return `${this.wrapReceiver(expression)}${operator}${propertyName}`;
    }
    createReturnStatement(expression) {
        return `return${expression !== null ? ` ${this.render(expression)}` : ''};`;
    }
    createTaggedTemplate(tag, template) {
        return `${this.wrapReceiver(tag)}${this.createTemplateLiteral(template)}`;
    }
    createTemplateLiteral(template) {
        let result = '`';
        for (let i = 0; i < template.elements.length; i++) {
            result += template.elements[i].raw;
            if (i < template.expressions.length) {
                result += `\${${this.render(template.expressions[i])}}`;
            }
        }
        result += '`';
        return result;
    }
    createThrowStatement(expression) {
        return `throw ${this.render(expression)};`;
    }
    createTypeOfExpression(expression) {
        return `typeof ${this.wrapOperand(expression)}`;
    }
    createVoidExpression(expression) {
        return `void ${this.wrapOperand(expression)}`;
    }
    createUnaryExpression(operator, operand) {
        return `${operator}${this.wrapOperand(operand)}`;
    }
    createVariableDeclaration(variableName, initializer, variableType, _type = null) {
        const init = initializer !== null ? ` = ${this.render(initializer)}` : '';
        return `${variableType} ${variableName}${init};`;
    }
    createRegularExpressionLiteral(body, flags) {
        return `/${body}/${flags ?? ''}`;
    }
    createSpreadElement(expression) {
        return `...${this.render(expression)}`;
    }
    createBuiltInType(_type) {
        return '';
    }
    createExpressionType(_expression, _typeParams) {
        return '';
    }
    createArrayType(_elementType) {
        return '';
    }
    createMapType(_valueType) {
        return '';
    }
    transplantType(_type) {
        return '';
    }
    setSourceMapRange(node, _sourceMapRange) {
        return node;
    }
}
exports.StringAstFactory = StringAstFactory;
//# sourceMappingURL=string-ast-factory.js.map
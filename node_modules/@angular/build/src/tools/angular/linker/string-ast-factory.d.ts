/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type { AstFactory, BinaryOperator, LeadingComment, ObjectLiteralProperty, SourceMapRange, TemplateLiteral, UnaryOperator, VariableDeclarationType } from '@angular/compiler-cli/src/ngtsc/translator';
import type { BuiltInType, Parameter } from '@angular/compiler-cli/src/ngtsc/translator/src/api/ast_factory';
/**
 * An implementation of `AstFactory` that generates JavaScript code strings directly.
 */
export declare class StringAstFactory implements AstFactory<string, unknown, string> {
    private readonly sourceCode;
    constructor(sourceCode?: string);
    private render;
    /**
     * Wraps an expression in parentheses if it has syntax or operator precedence
     * traps when used as the receiver/callee of property access, element access,
     * call chains, `new` expressions, or tagged templates.
     *
     * For example, arrow functions (`(() => {}).foo`), numbers (`(5).foo`), object
     * literals (`({ a: 1 }).foo`), and unary operators (`(void 0)()`) require
     * parenthesization when used as receivers.
     */
    private wrapReceiver;
    /**
     * Wraps an expression in parentheses if it is an un-parenthesized complex
     * operand (such as an un-parenthesized binary, logical, or assignment expression)
     * to prevent operator precedence inversion when embedded inside an outer expression.
     *
     * Atomic expressions (identifiers, member/element access chains, and simple
     * literals matching `/^[a-zA-Z0-9_$.[\]"'`]+$/`) and already-parenthesized
     * expressions are returned as-is.
     */
    private wrapOperand;
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
    attachComments(_statement: string, _leadingComments: LeadingComment[]): void;
    createArrayLiteral(elements: unknown[]): string;
    createAssignment(target: unknown, operator: BinaryOperator, value: unknown): string;
    createBinaryExpression(leftOperand: unknown, operator: BinaryOperator, rightOperand: unknown): string;
    createBlock(body: string[]): string;
    createCallExpression(callee: unknown, args: unknown[], pure: boolean): string;
    createCallChain(callee: unknown, args: unknown[], pure: boolean, isOptional: boolean): string;
    createConditional(condition: unknown, thenExpression: unknown, elseExpression: unknown): string;
    createElementAccess(expression: unknown, element: unknown): string;
    createElementAccessChain(expression: unknown, element: unknown, isOptional: boolean): string;
    createExpressionStatement(expression: unknown): string;
    createFunctionDeclaration(functionName: string, parameters: Parameter<string>[], body: string): string;
    createFunctionExpression(functionName: string | null, parameters: Parameter<string>[], body: string): string;
    createArrowFunctionExpression(parameters: Parameter<string>[], body: unknown): string;
    createDynamicImport(url: unknown): string;
    createIdentifier(name: string): string;
    createIfStatement(condition: unknown, thenStatement: string, elseStatement: string | null): string;
    createLiteral(value: string | number | boolean | null | undefined): string;
    createNewExpression(expression: unknown, args: unknown[]): string;
    createObjectLiteral(properties: ObjectLiteralProperty<unknown>[]): string;
    createParenthesizedExpression(expression: unknown): string;
    createPropertyAccess(expression: unknown, propertyName: string): string;
    createPropertyAccessChain(expression: unknown, propertyName: string, isOptional: boolean): string;
    createReturnStatement(expression: unknown | null): string;
    createTaggedTemplate(tag: unknown, template: TemplateLiteral<unknown>): string;
    createTemplateLiteral(template: TemplateLiteral<unknown>): string;
    createThrowStatement(expression: unknown): string;
    createTypeOfExpression(expression: unknown): string;
    createVoidExpression(expression: unknown): string;
    createUnaryExpression(operator: UnaryOperator, operand: unknown): string;
    createVariableDeclaration(variableName: string, initializer: unknown | null, variableType: VariableDeclarationType, _type?: string | null): string;
    createRegularExpressionLiteral(body: string, flags: string | null): string;
    createSpreadElement(expression: unknown): string;
    createBuiltInType(_type: BuiltInType): string;
    createExpressionType(_expression: unknown, _typeParams: string[] | null): string;
    createArrayType(_elementType: string): string;
    createMapType(_valueType: string): string;
    transplantType(_type: string): string;
    setSourceMapRange<T extends string | unknown>(node: T, _sourceMapRange: SourceMapRange | null): T;
}

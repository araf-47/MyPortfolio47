/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
interface JavaScriptTransformRequest {
    filename: string;
    data: string | Uint8Array;
    skipLinker?: boolean;
    sideEffects?: boolean;
    instrumentForCoverage?: boolean;
}
export default function transformJavaScript(request: JavaScriptTransformRequest): Promise<unknown>;
export {};

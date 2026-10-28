/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
/**
 * Finds the `ngCspNonce` value and copies it to all `<style>` and `<script>` tags,
 * as well as stylesheet and modulepreload `<link>` tags.
 * @param html Markup that should be processed.
 */
export declare function addNonce(html: string): Promise<string>;
/** Finds the Angular nonce in an HTML string. */
export declare function findNonce(html: string): Promise<string | null>;

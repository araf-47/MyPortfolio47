/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type { ɵParsedTranslation } from '@angular/localize';
/**
 * Magic header identifier for i18n SharedArrayBuffer translation tables ('I18N').
 */
export declare const I18N_MAGIC_ID = 1227962446;
/**
 * Encodes a JavaScript translation dictionary into a contiguous SharedArrayBuffer.
 * The buffer contains a header, a sorted index table (by key for fast O(log N) binary search),
 * and a UTF-8 string pool.
 *
 * @param translation The translation dictionary object.
 * @returns A SharedArrayBuffer containing the binary encoded translation catalog.
 */
export declare function encodeTranslationToBuffer<T = ɵParsedTranslation>(translation: Record<string, T>): SharedArrayBuffer;

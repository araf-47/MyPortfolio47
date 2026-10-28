"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeHash = initializeHash;
exports.calculateHash = calculateHash;
exports.createContentHash = createContentHash;
const node_assert_1 = __importDefault(require("node:assert"));
let xxhashInstance;
let xxhashPromise;
/**
 * Initializes the xxHash WASM instance early to ensure synchronous hashing uses xxHash.
 */
async function initializeHash() {
    if (xxhashInstance) {
        return;
    }
    xxhashPromise ??= Promise.resolve().then(() => __importStar(require('xxhash-wasm'))).then((m) => m.default());
    xxhashInstance = await xxhashPromise;
}
function getXxhash() {
    (0, node_assert_1.default)(xxhashInstance, 'Hash utility must be initialized by awaiting `initializeHash()` before use.');
    return xxhashInstance;
}
/**
 * Calculates a fast 64-bit non-cryptographic hash of the provided content.
 * Suitable for cache keys, ETags, and change detection.
 */
function calculateHash(data) {
    const instance = getXxhash();
    if (typeof data === 'string') {
        return instance.h64ToString(data);
    }
    return instance.h64Raw(data).toString(16).padStart(16, '0');
}
/**
 * Creates a streaming 64-bit non-cryptographic content hasher.
 */
function createContentHash() {
    const instance = getXxhash();
    const hasher = instance.create64();
    const contentHasher = {
        update(data) {
            hasher.update(data);
            return contentHasher;
        },
        digest() {
            return hasher.digest().toString(16).padStart(16, '0');
        },
    };
    return contentHasher;
}
//# sourceMappingURL=hash.js.map
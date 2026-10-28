"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOutputPathObject = isOutputPathObject;
function isOutputPathObject(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return false;
    }
    const obj = value;
    if (typeof obj.base !== 'string' || obj.base === '') {
        return false;
    }
    if ('browser' in obj && typeof obj.browser !== 'string') {
        return false;
    }
    return true;
}
//# sourceMappingURL=interfaces.js.map
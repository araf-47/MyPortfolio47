"use strict";
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareOptions = exports.injectTokenIntoRepoUrl = exports.appendCIMetadata = exports.warnDeprecatedParameters = exports.handleUserCredentials = exports.mapNegatedBooleans = exports.setupMonkeypatch = exports.deployToGHPages = exports.defaults = exports.isOutputPathObject = exports.angularDeploy = void 0;
__exportStar(require("./ng-add"), exports);
var actions_1 = require("./deploy/actions");
Object.defineProperty(exports, "angularDeploy", { enumerable: true, get: function () { return __importDefault(actions_1).default; } });
__exportStar(require("./deploy/builder"), exports);
var interfaces_1 = require("./interfaces");
Object.defineProperty(exports, "isOutputPathObject", { enumerable: true, get: function () { return interfaces_1.isOutputPathObject; } });
var defaults_1 = require("./engine/defaults");
Object.defineProperty(exports, "defaults", { enumerable: true, get: function () { return defaults_1.defaults; } });
var engine_1 = require("./engine/engine");
Object.defineProperty(exports, "deployToGHPages", { enumerable: true, get: function () { return engine_1.run; } });
var engine_prepare_options_helpers_1 = require("./engine/engine.prepare-options-helpers");
Object.defineProperty(exports, "setupMonkeypatch", { enumerable: true, get: function () { return engine_prepare_options_helpers_1.setupMonkeypatch; } });
Object.defineProperty(exports, "mapNegatedBooleans", { enumerable: true, get: function () { return engine_prepare_options_helpers_1.mapNegatedBooleans; } });
Object.defineProperty(exports, "handleUserCredentials", { enumerable: true, get: function () { return engine_prepare_options_helpers_1.handleUserCredentials; } });
Object.defineProperty(exports, "warnDeprecatedParameters", { enumerable: true, get: function () { return engine_prepare_options_helpers_1.warnDeprecatedParameters; } });
Object.defineProperty(exports, "appendCIMetadata", { enumerable: true, get: function () { return engine_prepare_options_helpers_1.appendCIMetadata; } });
Object.defineProperty(exports, "injectTokenIntoRepoUrl", { enumerable: true, get: function () { return engine_prepare_options_helpers_1.injectTokenIntoRepoUrl; } });
var engine_2 = require("./engine/engine");
Object.defineProperty(exports, "prepareOptions", { enumerable: true, get: function () { return engine_2.prepareOptions; } });
//# sourceMappingURL=public_api.js.map
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
exports.executeDeploy = executeDeploy;
const architect_1 = require("@angular-devkit/architect");
const engine = __importStar(require("../engine/engine"));
const actions_1 = __importDefault(require("./actions"));
async function executeDeploy(options, context) {
    if (options.browserTarget) {
        context.logger.error('❌ The "browserTarget" option is not supported.');
        context.logger.error('   Use "buildTarget" instead.');
        return { success: false };
    }
    if (!context.target) {
        throw new Error('Cannot deploy the application without a target');
    }
    const staticBuildTarget = {
        name: options.buildTarget || `${context.target.project}:build:production`
    };
    let prerenderBuildTarget;
    if (options.prerenderTarget) {
        prerenderBuildTarget = {
            name: options.prerenderTarget
        };
    }
    const finalBuildTarget = prerenderBuildTarget
        ? prerenderBuildTarget
        : staticBuildTarget;
    try {
        await (0, actions_1.default)(engine, context, finalBuildTarget, options);
    }
    catch (e) {
        context.logger.error('❌ An error occurred when trying to deploy:');
        const message = e instanceof Error ? e.message : String(e);
        context.logger.error(message);
        return { success: false };
    }
    return { success: true };
}
exports.default = (0, architect_1.createBuilder)(executeDeploy);
//# sourceMappingURL=builder.js.map
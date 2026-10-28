"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = deploy;
const architect_1 = require("@angular-devkit/architect");
const path_1 = __importDefault(require("path"));
const interfaces_1 = require("../interfaces");
async function deploy(engine, context, buildTarget, options) {
    if (options.noBuild) {
        context.logger.info(`📦 Skipping build`);
    }
    else {
        if (!context.target) {
            throw new Error('Cannot execute the build target');
        }
        const overrides = {
            ...(options.baseHref && { baseHref: options.baseHref })
        };
        context.logger.info(`📦 Building "${context.target.project}"`);
        context.logger.info(`📦 Build target "${buildTarget.name}"`);
        const build = await context.scheduleTarget((0, architect_1.targetFromTargetString)(buildTarget.name), {
            ...buildTarget.options,
            ...overrides
        });
        const buildResult = await build.result;
        if (!buildResult.success) {
            throw new Error('Error while building the app.');
        }
    }
    let dir;
    if (options.dir) {
        dir = options.dir;
    }
    else {
        const buildOptions = await context.getTargetOptions((0, architect_1.targetFromTargetString)(buildTarget.name));
        const outputPath = buildOptions.outputPath;
        if (outputPath === undefined) {
            const projectName = buildTarget.name.split(':')[0];
            dir = path_1.default.join('dist', projectName, 'browser');
        }
        else if (typeof outputPath === 'string') {
            dir = path_1.default.join(outputPath, 'browser');
        }
        else if ((0, interfaces_1.isOutputPathObject)(outputPath)) {
            dir = path_1.default.join(outputPath.base, outputPath.browser ?? 'browser');
        }
        else {
            throw new Error(`Unsupported outputPath configuration in angular.json for '${buildTarget.name}'. ` +
                `Expected string or {base, browser} object.`);
        }
    }
    await engine.run(dir, options, context.logger);
}
//# sourceMappingURL=actions.js.map
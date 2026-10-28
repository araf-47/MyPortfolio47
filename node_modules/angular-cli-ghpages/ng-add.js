"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ngAdd = void 0;
const core_1 = require("@angular-devkit/core");
const schematics_1 = require("@angular-devkit/schematics");
const utils_1 = require("./utils");
const ngAdd = (options) => async (tree, context) => {
    const host = (0, utils_1.createHost)(tree);
    const { workspace } = await core_1.workspaces.readWorkspace('/', host);
    if (!options.project) {
        if (workspace.projects.size === 1) {
            options.project = Array.from(workspace.projects.keys())[0];
        }
        else {
            throw new schematics_1.SchematicsException('There is more than one project in your workspace. Please select it manually by using the --project argument.');
        }
    }
    const project = workspace.projects.get(options.project);
    if (!project) {
        throw new schematics_1.SchematicsException('The specified Angular project is not defined in this workspace');
    }
    if (project.extensions.projectType !== 'application') {
        throw new schematics_1.SchematicsException(`Deploy requires an Angular project type of "application" in angular.json`);
    }
    const buildTarget = project.targets.get('build');
    if (!buildTarget) {
        throw new schematics_1.SchematicsException(`Cannot find build target for the Angular project "${options.project}" in angular.json.`);
    }
    const outputPath = buildTarget.options?.outputPath;
    const hasValidOutputPath = outputPath === undefined ||
        typeof outputPath === 'string' ||
        (typeof outputPath === 'object' && outputPath !== null && 'base' in outputPath);
    if (!hasValidOutputPath) {
        throw new schematics_1.SchematicsException(`Invalid outputPath configuration for the Angular project "${options.project}" in angular.json. ` +
            `Expected undefined (default), a string, or an object with a "base" property.`);
    }
    project.targets.add({
        name: 'deploy',
        builder: 'angular-cli-ghpages:deploy',
        options: {}
    });
    core_1.workspaces.writeWorkspace(workspace, host);
    context.logger.info('');
    context.logger.info('🚀 angular-cli-ghpages is ready!');
    context.logger.info('');
    context.logger.info('Next steps:');
    context.logger.info('  1. Read the docs: https://github.com/angular-schule/angular-cli-ghpages');
    context.logger.info('  2. Deploy via: ng deploy');
    context.logger.info('  3. Have a nice day!');
    return tree;
};
exports.ngAdd = ngAdd;
//# sourceMappingURL=ng-add.js.map
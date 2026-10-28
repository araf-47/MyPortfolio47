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
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
exports.prepareOptions = prepareOptions;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const utils_1 = require("../utils");
const defaults_1 = require("./defaults");
const engine_prepare_options_helpers_1 = require("./engine.prepare-options-helpers");
async function run(dir, options, logger) {
    const prepared = await prepareOptions(options, logger);
    (0, engine_prepare_options_helpers_1.ensureGhPagesCacheDir)();
    const ghpages = require('gh-pages');
    if (prepared.dryRun) {
        logger.info('Dry-run / SKIPPED: cleaning of the cache directory');
    }
    else {
        ghpages.clean();
    }
    await checkIfDistFolderExists(dir);
    await createNotFoundFile(dir, prepared, logger);
    await publishViaGhPages(ghpages, dir, prepared, logger);
    if (!prepared.dryRun) {
        logger.info('🌟 Successfully published via angular-cli-ghpages! Have a nice day!');
    }
}
async function prepareOptions(origOptions, logger) {
    const options = {
        ...defaults_1.defaults,
        ...origOptions
    };
    (0, engine_prepare_options_helpers_1.setupMonkeypatch)(logger);
    (0, engine_prepare_options_helpers_1.mapNegatedBooleans)(options, origOptions);
    (0, engine_prepare_options_helpers_1.handleUserCredentials)(options, origOptions, logger);
    (0, engine_prepare_options_helpers_1.warnDeprecatedParameters)(origOptions, logger);
    (0, engine_prepare_options_helpers_1.appendCIMetadata)(options);
    await (0, engine_prepare_options_helpers_1.injectTokenIntoRepoUrl)(options);
    if (options.dryRun) {
        logger.info('Dry-run: No changes are applied at all.');
    }
    return options;
}
async function checkIfDistFolderExists(dir) {
    if (!await (0, utils_1.pathExists)(dir)) {
        throw new Error('Dist folder does not exist. Check the dir --dir parameter or build the project first!');
    }
}
async function createNotFoundFile(dir, options, logger) {
    if (!options.notfound) {
        return;
    }
    if (options.dryRun) {
        logger.info('Dry-run / SKIPPED: copying of index.html to 404.html');
        return;
    }
    const indexHtml = path.join(dir, 'index.html');
    const notFoundFile = path.join(dir, '404.html');
    try {
        await fs.copyFile(indexHtml, notFoundFile);
        logger.info('404.html file created');
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.info('index.html could not be copied to 404.html. Proceeding without it.');
        logger.debug('Diagnostic info: ' + message);
        return;
    }
}
function generatedFiles(options) {
    const files = [];
    if (options.nojekyll) {
        files.push('.nojekyll');
    }
    if (options.cname) {
        files.push('CNAME');
    }
    return files;
}
async function publishViaGhPages(ghPages, dir, options, logger) {
    if (options.dryRun) {
        logger.info(`Dry-run / SKIPPED: publishing folder '${dir}' with the following options: ` +
            JSON.stringify({
                dir,
                repo: options.repo || 'current working directory (which must be a git repo in this case) will be used to commit & push',
                remote: options.remote,
                message: options.message,
                branch: options.branch,
                name: options.name ? `the name '${options.name}' will be used for the commit` : 'local or global git user name will be used for the commit',
                email: options.email ? `the email '${options.email}' will be used for the commit` : 'local or global git user email will be used for the commit',
                dotfiles: options.dotfiles ? `files starting with dot ('.') will be included` : `files starting with dot ('.') will be ignored`,
                notfound: options.notfound ? 'a 404.html file will be created' : 'a 404.html file will NOT be created',
                nojekyll: options.nojekyll ? 'a .nojekyll file will be created' : 'a .nojekyll file will NOT be created',
                cname: options.cname ? `a CNAME file with the content '${options.cname}' will be created` : 'a CNAME file will NOT be created',
                add: options.add ? 'all files will be added to the branch. Existing files will not be removed' : 'existing files will be removed from the branch before adding the new ones',
            }, null, '  '));
        return;
    }
    logger.info('🚀 Uploading via git, please wait...');
    const ghPagesOptions = {
        repo: options.repo,
        branch: options.branch,
        message: options.message,
        remote: options.remote,
        git: options.git,
        add: options.add,
        dotfiles: options.dotfiles,
        user: options.user,
        cname: options.cname,
        nojekyll: options.nojekyll,
        beforeAdd: options.add ? undefined : (0, engine_prepare_options_helpers_1.createCleanupBeforeAddHook)(dir, options.dotfiles, logger, generatedFiles(options))
    };
    await new Promise((resolve, reject) => {
        ghPages.publish(dir, ghPagesOptions, (error) => {
            if (error) {
                reject(error);
                return;
            }
            resolve();
        });
    });
}
//# sourceMappingURL=engine.js.map
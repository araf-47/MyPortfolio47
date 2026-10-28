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
exports.setupMonkeypatch = setupMonkeypatch;
exports.cleanupMonkeypatch = cleanupMonkeypatch;
exports.ensureGhPagesCacheDir = ensureGhPagesCacheDir;
exports.mapNegatedBooleans = mapNegatedBooleans;
exports.handleUserCredentials = handleUserCredentials;
exports.warnDeprecatedParameters = warnDeprecatedParameters;
exports.appendCIMetadata = appendCIMetadata;
exports.injectTokenIntoRepoUrl = injectTokenIntoRepoUrl;
exports.collectDistFiles = collectDistFiles;
exports.createCleanupBeforeAddHook = createCleanupBeforeAddHook;
exports.getRemoteUrl = getRemoteUrl;
const fs = __importStar(require("fs/promises"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const util = __importStar(require("util"));
const git_1 = __importDefault(require("gh-pages/lib/git"));
const utilMutable = require('util');
let originalDebuglog = null;
function setupMonkeypatch(logger) {
    if (originalDebuglog !== null) {
        return;
    }
    originalDebuglog = utilMutable.debuglog;
    utilMutable.debuglog = (set) => {
        if (set === 'gh-pages') {
            return function (...args) {
                const message = util.format.apply(util, args);
                logger.info(message);
            };
        }
        return originalDebuglog(set);
    };
}
function cleanupMonkeypatch() {
    if (originalDebuglog) {
        utilMutable.debuglog = originalDebuglog;
        originalDebuglog = null;
    }
}
function ensureGhPagesCacheDir(cwd = process.cwd()) {
    const existing = process.env.CACHE_DIR;
    if (existing && !['true', 'false', '1', '0'].includes(existing)) {
        return;
    }
    if (hasReachablePackageJson(cwd)) {
        return;
    }
    process.env.CACHE_DIR = path.join(os.tmpdir(), 'angular-cli-ghpages-cache');
}
function hasReachablePackageJson(startDir) {
    const fsSync = require('fs');
    let dir = path.resolve(startDir);
    for (let i = 0; i < 50; i++) {
        if (fsSync.existsSync(path.join(dir, 'package.json'))) {
            return true;
        }
        const parent = path.dirname(dir);
        if (parent === dir) {
            return false;
        }
        dir = parent;
    }
    return false;
}
function mapNegatedBooleans(options, origOptions) {
    if (origOptions.noDotfiles !== undefined) {
        options.dotfiles = !origOptions.noDotfiles;
    }
    if (origOptions.noNotfound !== undefined) {
        options.notfound = !origOptions.noNotfound;
    }
    if (origOptions.noNojekyll !== undefined) {
        options.nojekyll = !origOptions.noNojekyll;
    }
}
function handleUserCredentials(options, origOptions, logger) {
    if (options.name && options.email) {
        options.user = {
            name: options.name,
            email: options.email
        };
    }
    else if (options.name || options.email) {
        logger.warn('WARNING: Both --name and --email must be set together to configure git user. ' +
            (options.name ? 'Only --name is set.' : 'Only --email is set.') +
            ' Git will use the local or global git config instead.');
    }
}
function warnDeprecatedParameters(origOptions, logger) {
    if (origOptions.noSilent !== undefined) {
        logger.warn('The --no-silent parameter is deprecated and no longer needed. ' +
            'Verbose logging is now always enabled. This parameter will be ignored.');
    }
}
function appendCIMetadata(options) {
    if (process.env.TRAVIS) {
        options.message +=
            ' -- ' +
                (process.env.TRAVIS_COMMIT_MESSAGE || '') +
                ' \n\n' +
                'Triggered by commit: https://github.com/' +
                (process.env.TRAVIS_REPO_SLUG || '') +
                '/commit/' +
                (process.env.TRAVIS_COMMIT || '') +
                '\n' +
                'Travis CI build: ' +
                (process.env.TRAVIS_BUILD_WEB_URL || '');
    }
    if (process.env.CIRCLECI) {
        options.message +=
            '\n\n' +
                'Triggered by commit: https://github.com/' +
                (process.env.CIRCLE_PROJECT_USERNAME || '') +
                '/' +
                (process.env.CIRCLE_PROJECT_REPONAME || '') +
                '/commit/' +
                (process.env.CIRCLE_SHA1 || '') +
                '\n' +
                'CircleCI build: ' +
                (process.env.CIRCLE_BUILD_URL || '');
    }
    if (process.env.GITHUB_ACTIONS) {
        options.message +=
            '\n\n' +
                'Triggered by commit: https://github.com/' +
                (process.env.GITHUB_REPOSITORY || '') +
                '/commit/' +
                (process.env.GITHUB_SHA || '') +
                '\n' +
                'GitHub Actions build: ' +
                (process.env.GITHUB_SERVER_URL || 'https://github.com') +
                '/' +
                (process.env.GITHUB_REPOSITORY || '') +
                '/actions/runs/' +
                (process.env.GITHUB_RUN_ID || '');
    }
}
async function injectTokenIntoRepoUrl(options) {
    if (!options.repo) {
        options.repo = await getRemoteUrl(options);
    }
    if (process.env.GH_TOKEN &&
        options.repo &&
        options.repo.includes('GH_TOKEN')) {
        options.repo = options.repo.replace('GH_TOKEN', process.env.GH_TOKEN);
    }
    else if (options.repo && !options.repo.includes('x-access-token:')) {
        if (process.env.GH_TOKEN) {
            options.repo = options.repo.replace('https://github.com/', `https://x-access-token:${process.env.GH_TOKEN}@github.com/`);
        }
        else if (process.env.PERSONAL_TOKEN) {
            options.repo = options.repo.replace('https://github.com/', `https://x-access-token:${process.env.PERSONAL_TOKEN}@github.com/`);
        }
        else if (process.env.GITHUB_TOKEN) {
            options.repo = options.repo.replace('https://github.com/', `https://x-access-token:${process.env.GITHUB_TOKEN}@github.com/`);
        }
    }
}
async function collectDistFiles(baseDir, includeDotfiles) {
    const files = new Set();
    async function walk(relDir) {
        const fullDir = relDir ? path.join(baseDir, relDir) : baseDir;
        const entries = await fs.readdir(fullDir, { withFileTypes: true });
        for (const entry of entries) {
            if (!includeDotfiles && entry.name.startsWith('.')) {
                continue;
            }
            const relPath = relDir ? `${relDir}/${entry.name}` : entry.name;
            if (entry.isDirectory()) {
                await walk(relPath);
            }
            else if (entry.isFile()) {
                files.add(relPath);
            }
        }
    }
    await walk('');
    return files;
}
function createCleanupBeforeAddHook(distDir, dotfiles, logger, generatedFiles) {
    return async (git) => {
        const distFiles = await collectDistFiles(distDir, dotfiles);
        await git.exec('ls-files', '-z');
        const tracked = (git.output || '').split('\0').filter(Boolean);
        const toRemove = tracked.filter((f) => !distFiles.has(f) && !generatedFiles.includes(f));
        if (toRemove.length === 0) {
            return;
        }
        logger.info(`Removing ${toRemove.length} leftover file(s) from gh-pages branch not in dist: ${toRemove.join(', ')}`);
        await git.rm(toRemove);
    };
}
async function getRemoteUrl(options) {
    const git = new git_1.default(process.cwd(), options.git);
    return await git.getRemoteUrl(options.remote);
}
//# sourceMappingURL=engine.prepare-options-helpers.js.map
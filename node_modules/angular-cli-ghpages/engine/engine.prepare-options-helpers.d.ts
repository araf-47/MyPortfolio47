import { logging } from '@angular-devkit/core';
import { Schema } from '../deploy/schema';
export type PreparedOptions = Schema & {
    dotfiles: boolean;
    notfound: boolean;
    nojekyll: boolean;
    user?: {
        name: string;
        email: string;
    };
};
export declare function setupMonkeypatch(logger: logging.LoggerApi): void;
export declare function cleanupMonkeypatch(): void;
export declare function ensureGhPagesCacheDir(cwd?: string): void;
export declare function mapNegatedBooleans(options: PreparedOptions, origOptions: Schema): void;
export declare function handleUserCredentials(options: PreparedOptions, origOptions: Schema, logger: logging.LoggerApi): void;
export declare function warnDeprecatedParameters(origOptions: Schema, logger: logging.LoggerApi): void;
export declare function appendCIMetadata(options: PreparedOptions): void;
export declare function injectTokenIntoRepoUrl(options: PreparedOptions): Promise<void>;
export interface GhPagesGit {
    cwd: string;
    output: string;
    exec(...args: string[]): Promise<GhPagesGit>;
    rm(files: string[]): Promise<GhPagesGit>;
}
export declare function collectDistFiles(baseDir: string, includeDotfiles: boolean): Promise<Set<string>>;
export declare function createCleanupBeforeAddHook(distDir: string, dotfiles: boolean, logger: logging.LoggerApi, generatedFiles: string[]): (git: GhPagesGit) => Promise<void>;
export declare function getRemoteUrl(options: Schema & {
    git?: string;
    remote?: string;
}): Promise<string>;

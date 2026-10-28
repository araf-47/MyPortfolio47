import type { GhPagesGit } from './engine/engine.prepare-options-helpers';
export interface AngularOutputPathObject {
    base: string;
    browser?: string;
}
export type AngularOutputPath = string | AngularOutputPathObject;
export declare function isOutputPathObject(value: unknown): value is AngularOutputPathObject;
export interface DeployUser {
    name: string;
    email: string;
}
export interface PublishOptions {
    repo?: string;
    remote?: string;
    branch?: string;
    message?: string;
    user?: {
        name: string;
        email: string;
    };
    dotfiles?: boolean;
    nojekyll?: boolean;
    cname?: string;
    add?: boolean;
    git?: string;
    beforeAdd?: (git: GhPagesGit) => void | Promise<void>;
    [key: string]: unknown;
}
export interface GHPages {
    publish(dir: string, options: PublishOptions, callback: (error: Error | null) => void): void;
    publish(dir: string, options: PublishOptions): Promise<void>;
    clean?(): void;
}
export interface ArchitectTarget {
    builder: string;
    options?: {
        outputPath?: string | {
            base?: string;
            browser?: string;
        };
        [key: string]: unknown;
    };
}
export interface WorkspaceProject {
    projectType?: string;
    architect?: Record<string, ArchitectTarget>;
}
export interface Workspace {
    projects: Record<string, WorkspaceProject>;
}
export interface BuildTarget {
    name: string;
    options?: {
        outputPath?: string | {
            base?: string;
            browser?: string;
        };
        [key: string]: unknown;
    };
}

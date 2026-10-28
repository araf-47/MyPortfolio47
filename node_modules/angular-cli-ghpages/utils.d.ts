import { workspaces } from '@angular-devkit/core';
import { Tree } from '@angular-devkit/schematics';
export declare function pathExists(filePath: string): Promise<boolean>;
export declare function createHost(tree: Tree): workspaces.WorkspaceHost;

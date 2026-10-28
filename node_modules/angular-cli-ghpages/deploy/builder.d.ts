import { BuilderContext, BuilderOutput } from '@angular-devkit/architect';
import { Schema } from './schema';
export declare function executeDeploy(options: Schema, context: BuilderContext): Promise<BuilderOutput>;
declare const _default: import("@angular-devkit/architect").Builder<Schema & import("@angular-devkit/core").JsonObject>;
export default _default;

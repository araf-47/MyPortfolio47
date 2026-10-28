import { BuilderContext } from '@angular-devkit/architect';
import { logging } from '@angular-devkit/core';
import { BuildTarget } from '../interfaces';
import { Schema } from './schema';
export default function deploy(engine: {
    run: (dir: string, options: Schema, logger: logging.LoggerApi) => Promise<void>;
}, context: BuilderContext, buildTarget: BuildTarget, options: Schema): Promise<void>;

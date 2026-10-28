import { logging } from '@angular-devkit/core';
import { Schema } from '../deploy/schema';
import { PreparedOptions } from './engine.prepare-options-helpers';
export declare function run(dir: string, options: Schema | PreparedOptions, logger: logging.LoggerApi): Promise<void>;
export declare function prepareOptions(origOptions: Schema, logger: logging.LoggerApi): Promise<PreparedOptions>;

export * from './ng-add';
export { default as angularDeploy } from './deploy/actions';
export * from './deploy/builder';
export { Schema } from './deploy/schema';
export { GHPages, PublishOptions, DeployUser, AngularOutputPath, AngularOutputPathObject, isOutputPathObject } from './interfaces';
export { defaults } from './engine/defaults';
export { run as deployToGHPages } from './engine/engine';
export { PreparedOptions, setupMonkeypatch, mapNegatedBooleans, handleUserCredentials, warnDeprecatedParameters, appendCIMetadata, injectTokenIntoRepoUrl } from './engine/engine.prepare-options-helpers';
export { prepareOptions } from './engine/engine';

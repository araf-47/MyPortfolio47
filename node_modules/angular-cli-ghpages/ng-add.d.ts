import { SchematicContext, Tree } from '@angular-devkit/schematics';
interface NgAddOptions {
    project: string;
}
export declare const ngAdd: (options: NgAddOptions) => (tree: Tree, context: SchematicContext) => Promise<import("@angular-devkit/schematics/src/tree/interface").Tree>;
export {};

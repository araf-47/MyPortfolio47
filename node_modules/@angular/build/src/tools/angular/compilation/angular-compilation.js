"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AngularCompilation = exports.DiagnosticModes = void 0;
var DiagnosticModes;
(function (DiagnosticModes) {
    DiagnosticModes[DiagnosticModes["None"] = 0] = "None";
    DiagnosticModes[DiagnosticModes["Option"] = 1] = "Option";
    DiagnosticModes[DiagnosticModes["Syntactic"] = 2] = "Syntactic";
    DiagnosticModes[DiagnosticModes["Semantic"] = 4] = "Semantic";
    DiagnosticModes[DiagnosticModes["All"] = 7] = "All";
})(DiagnosticModes || (exports.DiagnosticModes = DiagnosticModes = {}));
class AngularCompilation {
    emitAffectedFiles() {
        return [];
    }
    async diagnoseFiles(modes) {
        return {};
    }
}
exports.AngularCompilation = AngularCompilation;
//# sourceMappingURL=angular-compilation.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestScope = void 0;
const async_hooks_1 = require("async_hooks");
const storage = new async_hooks_1.AsyncLocalStorage();
exports.requestScope = {
    run: (scope, fn) => storage.run(scope, fn),
    get: () => storage.getStore(),
};
//# sourceMappingURL=context.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// hello.spec.ts
const hello_1 = require("./hello");
test('returns hello world', () => {
    expect(hello_1.hello('world')).toBe("Hello world");
});

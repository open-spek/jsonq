// Guarded-core tests for src/ops.ts (DESIGN section 5 trust boundary).
// deepEqual pins the ==/!=/in equality semantics from DESIGN section 6:
// deep, structural, type-sensitive; SameValueZero for numbers (decision
// recorded in loop/PROGRESS.md, task 1.1).
import { describe, expect, test } from "bun:test";
import { deepEqual } from "./ops";

describe("deepEqual: primitives are type-sensitive", () => {
  test("equal primitives of the same type", () => {
    expect(deepEqual(1, 1)).toBe(true);
    expect(deepEqual("a", "a")).toBe(true);
    expect(deepEqual(true, true)).toBe(true);
    expect(deepEqual(false, false)).toBe(true);
  });

  test("1 and \"1\" are unequal (no coercion)", () => {
    expect(deepEqual(1, "1")).toBe(false);
    expect(deepEqual("1", 1)).toBe(false);
  });

  test("boolean never equals its numeric coercion", () => {
    expect(deepEqual(true, 1)).toBe(false);
    expect(deepEqual(false, 0)).toBe(false);
    expect(deepEqual(false, "")).toBe(false);
  });

  test("distinct values of the same type are unequal", () => {
    expect(deepEqual(1, 2)).toBe(false);
    expect(deepEqual("a", "b")).toBe(false);
    expect(deepEqual(true, false)).toBe(false);
  });
});

describe("deepEqual: null, undefined, and 0 are all distinct", () => {
  test("each equals itself", () => {
    expect(deepEqual(null, null)).toBe(true);
    expect(deepEqual(undefined, undefined)).toBe(true);
    expect(deepEqual(0, 0)).toBe(true);
  });

  test("no pair of them is equal", () => {
    expect(deepEqual(null, undefined)).toBe(false);
    expect(deepEqual(undefined, null)).toBe(false);
    expect(deepEqual(null, 0)).toBe(false);
    expect(deepEqual(undefined, 0)).toBe(false);
  });

  test("null does not equal an object or an empty string", () => {
    expect(deepEqual(null, {})).toBe(false);
    expect(deepEqual({}, null)).toBe(false);
    expect(deepEqual(null, "")).toBe(false);
  });
});

describe("deepEqual: number semantics are SameValueZero (pinned decision)", () => {
  test("NaN equals NaN", () => {
    expect(deepEqual(NaN, NaN)).toBe(true);
  });

  test("NaN nested in structures equals NaN", () => {
    expect(deepEqual({ v: NaN }, { v: NaN })).toBe(true);
    expect(deepEqual([NaN], [NaN])).toBe(true);
  });

  test("NaN does not equal any real number or non-number", () => {
    expect(deepEqual(NaN, 1)).toBe(false);
    expect(deepEqual(1, NaN)).toBe(false);
    expect(deepEqual(NaN, "NaN")).toBe(false);
  });

  test("+0 equals -0", () => {
    expect(deepEqual(0, -0)).toBe(true);
    expect(deepEqual(-0, 0)).toBe(true);
  });
});

describe("deepEqual: objects compare structurally, key order irrelevant", () => {
  test("same keys and values in different insertion order are equal", () => {
    expect(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
  });

  test("differing values under the same key are unequal", () => {
    expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false);
  });

  test("missing or extra keys make objects unequal", () => {
    expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(deepEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false);
  });

  test("same key count but different key names are unequal", () => {
    expect(deepEqual({ a: 1 }, { b: 1 })).toBe(false);
  });

  test("a key explicitly set to undefined is structurally present", () => {
    expect(deepEqual({ a: undefined }, {})).toBe(false);
    expect(deepEqual({}, { a: undefined })).toBe(false);
    expect(deepEqual({ a: undefined }, { a: undefined })).toBe(true);
  });

  test("nested objects compare recursively", () => {
    expect(deepEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 1 } } })).toBe(true);
    expect(deepEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 2 } } })).toBe(false);
    expect(deepEqual({ a: { b: 1 } }, { a: { b: "1" } })).toBe(false);
  });
});

describe("deepEqual: arrays compare element-wise and order-sensitive", () => {
  test("same elements in the same order are equal", () => {
    expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
  });

  test("same elements in a different order are unequal", () => {
    expect(deepEqual([1, 2, 3], [3, 2, 1])).toBe(false);
  });

  test("length mismatch is unequal, including prefixes", () => {
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
    expect(deepEqual([1, 2, 3], [1, 2])).toBe(false);
  });

  test("elements are compared type-sensitively", () => {
    expect(deepEqual([1], ["1"])).toBe(false);
  });

  test("an array never equals a non-array object", () => {
    expect(deepEqual([], {})).toBe(false);
    expect(deepEqual({}, [])).toBe(false);
    expect(deepEqual([1], { 0: 1, length: 1 })).toBe(false);
  });
});

describe("deepEqual: mixed nesting and empty containers", () => {
  test("empty containers equal their own kind only", () => {
    expect(deepEqual({}, {})).toBe(true);
    expect(deepEqual([], [])).toBe(true);
  });

  test("objects containing arrays containing objects", () => {
    const a = { users: [{ name: "ada", tags: ["x", "y"] }], total: 1 };
    const b = { total: 1, users: [{ tags: ["x", "y"], name: "ada" }] };
    expect(deepEqual(a, b)).toBe(true);
  });

  test("a deep difference anywhere makes the whole unequal", () => {
    const a = { users: [{ name: "ada", tags: ["x", "y"] }] };
    const b = { users: [{ name: "ada", tags: ["x", "z"] }] };
    expect(deepEqual(a, b)).toBe(false);
  });

  test("nested array vs object mismatch is unequal", () => {
    expect(deepEqual({ a: [] }, { a: {} })).toBe(false);
  });

  test("identical references are equal without recursion", () => {
    const row = { a: [1, { b: 2 }] };
    expect(deepEqual(row, row)).toBe(true);
  });
});
